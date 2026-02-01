# ServUp v2 — Technical Specification

## 1. Product Overview

**ServUp** — инструмент для быстрой настройки Linux-серверов. Пользователь собирает конфигурацию из скиллов (skills) — модульных bash-блоков с параметрами — и получает готовый идемпотентный bash-скрипт.

### Ключевые принципы

- **Front-only** — вся логика в браузере, сервер не обязателен
- **Offline-first** — PWA, работает без интернета
- **Privacy-first** — данные шифруются паролем пользователя (опционально)
- **Everything is a skill** — единая абстракция для всего: создание юзера, установка Docker, настройка hostname — всё скиллы
- **Simple** — минимум абстракций, читаемый код, скилл = bash с удобствами

### Целевая аудитория

DevOps-инженеры и разработчики, которые понимают что делают и хотят автоматизировать рутину настройки серверов.

---

## 2. Architecture

### 2.1 High-level

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │    UI     │  │  Store   │  │  Generator    │  │
│  │ (React + │──│ (Zustand │──│ (TS, pure     │  │
│  │  shadcn) │  │ + IDB)   │  │  functions)   │  │
│  └──────────┘  └────┬─────┘  └───────────────┘  │
│                     │                            │
│              ┌──────┴──────┐                     │
│              │  Crypto     │                     │
│              │ (Web Crypto │                     │
│              │  API)       │                     │
│              └──────┬──────┘                     │
│                     │ (encrypted)                │
└─────────────────────┼───────────────────────────┘
                      │ optional sync
               ┌──────┴──────┐
               │ Sync Server │
               │ (key-value  │
               │  store)     │
               └─────────────┘
```

### 2.2 Два режима деплоя

| Режим | Состав | PWA | Sync | Как запустить |
|-------|--------|-----|------|---------------|
| **Docker** | nginx (frontend) + sync-server | Да | Да | `docker compose up` |
| **Single HTML** | Один .html файл | Нет | Нет | Открыть в браузере |

### 2.3 Tech Stack

| Слой | Технология | Зачем |
|------|-----------|-------|
| UI framework | React 18 + TypeScript | Компонентный UI, типизация |
| UI components | shadcn/ui + Tailwind CSS 4 | Стильный, кастомизируемый дизайн |
| State | Zustand | Простой стейт без бойлерплейта |
| Storage | IndexedDB (через `idb`) | Персистентное хранение в браузере |
| Encryption | Web Crypto API (PBKDF2 + AES-GCM) | E2E шифрование без зависимостей |
| YAML parsing | js-yaml | Парсинг skill-файлов |
| Syntax highlight | highlight.js | Подсветка bash в превью скрипта |
| Build | Vite | Быстрая сборка, HMR |
| Single-file | vite-plugin-singlefile | Один HTML-файл как бонусный артефакт |
| PWA | vite-plugin-pwa | Service Worker, manifest, офлайн |
| Router | react-router (hash mode) | Навигация, закладки, кнопка "назад" |
| Sync server | Node.js + Express | Минимальный бэкенд (~100 строк) |
| Container | Docker + nginx | Продакшн-деплой |

---

## 3. Data Model

### 3.1 Core Principle: Everything is a Skill

Нет отдельных "users", "server settings", "modules". Всё — скиллы. Создание юзера — скилл. Hostname — скилл. Docker — скилл. Единая абстракция.

### 3.2 Skill (определение)

```typescript
interface Skill {
  id: string;              // "create-user", "install-docker"
  name: string;            // "Create User"
  description: string;     // краткое описание
  category: string;        // "users", "system", "security", "containers", "tools", ...
  os: ('debian' | 'redhat')[];
  priority: number;        // подсказка порядка при добавлении (ниже = раньше, default 50)
  repeatable: boolean;     // можно добавить несколько раз (default false)
  builtin: boolean;        // встроенный или импортированный

  params: SkillParam[];
  scripts: {
    debian?: string;       // bash-код для Debian/Ubuntu
    redhat?: string;       // bash-код для RHEL/CentOS
  };
}

interface SkillParam {
  id: string;              // "username", "version"
  label: string;           // "Username", "Docker Compose version"
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  default: string;
  required: boolean;       // default true
  options?: string[];      // для type: 'select'
  github_import?: boolean; // для type: 'textarea' — показать кнопку "Import from GitHub"
}
```

### 3.3 YAML формат скилла

```yaml
id: create-user
name: Create User
description: Create a system user with SSH key access
category: users
os: [debian, redhat]
priority: 20
repeatable: true

params:
  - id: username
    type: string
    label: Username
    required: true
  - id: groups
    type: string
    label: "Groups (comma-separated)"
    default: sudo
  - id: ssh_keys
    type: textarea
    label: "SSH Public Keys (one per line)"
    github_import: true

scripts:
  debian: |
    USERNAME="{{username}}"
    if ! id "$USERNAME" &>/dev/null; then
      useradd -m -s /bin/bash "$USERNAME"
      log_success "User $USERNAME created"
    else
      log_info "User $USERNAME already exists"
    fi
    GROUPS="{{groups}}"
    if [ -n "$GROUPS" ]; then
      usermod -aG $GROUPS "$USERNAME"
      log_info "User $USERNAME added to groups: $GROUPS"
    fi
    SSH_KEYS="{{ssh_keys}}"
    if [ -n "$SSH_KEYS" ]; then
      mkdir -p /home/$USERNAME/.ssh
      cat > /home/$USERNAME/.ssh/authorized_keys << 'SSHKEYS'
    {{ssh_keys}}
    SSHKEYS
      chmod 700 /home/$USERNAME/.ssh
      chmod 600 /home/$USERNAME/.ssh/authorized_keys
      chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
      log_success "SSH keys configured for $USERNAME"
    fi

  redhat: |
    USERNAME="{{username}}"
    if ! id "$USERNAME" &>/dev/null; then
      useradd -m -s /bin/bash "$USERNAME"
      log_success "User $USERNAME created"
    else
      log_info "User $USERNAME already exists"
    fi
    GROUPS="{{groups}}"
    if [ -n "$GROUPS" ]; then
      usermod -aG $GROUPS "$USERNAME"
    fi
    SSH_KEYS="{{ssh_keys}}"
    if [ -n "$SSH_KEYS" ]; then
      mkdir -p /home/$USERNAME/.ssh
      cat > /home/$USERNAME/.ssh/authorized_keys << 'SSHKEYS'
    {{ssh_keys}}
    SSHKEYS
      chmod 700 /home/$USERNAME/.ssh
      chmod 600 /home/$USERNAME/.ssh/authorized_keys
      chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
      log_success "SSH keys configured for $USERNAME"
    fi
```

### 3.4 Configuration (документ)

Конфигурация — список экземпляров скиллов с заполненными параметрами.

```typescript
interface Configuration {
  id: string;              // nanoid
  name: string;            // "My production server"
  pinned: boolean;         // избранное (наверху списка)
  createdAt: number;       // timestamp
  updatedAt: number;       // timestamp
  os: 'debian' | 'redhat'; // целевая OS

  entries: SkillEntry[];   // упорядоченный список — и это ВСЁ
}

interface SkillEntry {
  id: string;              // уникальный id экземпляра (nanoid)
  skillId: string;         // ссылка на Skill.id
  enabled: boolean;        // можно временно отключить без удаления
  params: Record<string, string>;  // заполненные параметры
}
```

Порядок entries — это порядок выполнения. При добавлении скилл вставляется по его `priority` (подсказка). Пользователь может перетаскивать для изменения порядка.

### 3.5 App State (Zustand store)

```typescript
interface AppState {
  // Configurations
  configurations: Configuration[];
  activeConfigId: string | null;

  // Skills library
  skills: Skill[];              // built-in + imported

  // Vault
  vaultEnabled: boolean;
  vaultUnlocked: boolean;

  // Sync
  syncEnabled: boolean;
  syncServerUrl: string;

  // UI
  theme: 'light' | 'dark' | 'system';

  // Actions (примеры — полный список в реализации)
  createConfiguration(): string;
  duplicateConfiguration(id: string): string;
  deleteConfiguration(id: string): void;
  updateConfiguration(id: string, updates: Partial<Configuration>): void;

  addEntry(configId: string, skillId: string): void;
  removeEntry(configId: string, entryId: string): void;
  updateEntry(configId: string, entryId: string, updates: Partial<SkillEntry>): void;
  reorderEntries(configId: string, fromIndex: number, toIndex: number): void;

  importSkill(yaml: string): Skill;
  deleteSkill(id: string): void;
}
```

### 3.6 Storage

| Данные | Где хранить | Шифрование |
|--------|------------|------------|
| Конфигурации (entries с параметрами) | IndexedDB | Да (если vault включён) |
| Skills (встроенные) | Бандл (статика) | Нет |
| Skills (импортированные) | IndexedDB | Нет (публичные данные) |
| App settings (тема, sync URL) | localStorage | Нет |
| Vault meta (salt, verifier) | localStorage | Нет (только salt + зашифрованная проверочная строка) |
| Derived encryption key | sessionStorage | Нет (живёт до закрытия вкладки) |

---

## 4. Features (v1)

### 4.1 Configurations

**Список конфигураций** (sidebar):
- Карточки всех конфигураций
- Pinned (★) наверху
- Сортировка по дате изменения
- "New" — создать пустую конфигурацию
- Контекстное меню: Duplicate, Pin/Unpin, Delete
- Клик → открыть в редакторе

**Редактор конфигурации:**
- Имя (editable inline)
- OS selector (Debian/Ubuntu | RHEL/CentOS)
- Список entries (skill instances) с параметрами
- Группировка по категориям
- "Add Skill" — выбор из доступных скиллов
- Drag & drop для изменения порядка
- "Generate Script" — кнопка генерации
- Авто-сохранение (debounced, в IndexedDB)

### 4.2 Skill Entries в редакторе

Каждый entry — карточка:

```
┌─────────────────────────────────────────────┐
│ ☑ Create User                          [×]  │
│                                        [⋮]  │
│  Username:  [alice_____________]             │
│  Groups:    [sudo,docker_______]             │
│  SSH Keys:  [textarea] [Import from GitHub]  │
└─────────────────────────────────────────────┘
```

- Чекбокс слева — enable/disable (отключить без удаления)
- × — удалить entry
- Параметры рендерятся по типу из SkillParam
- Repeatable скиллы: кнопка "+ Add another [Skill Name]" под последним экземпляром

**Param UI по типам:**

| Param type | UI element |
|-----------|-----------|
| `string` | `<Input>` |
| `number` | `<Input type="number">` |
| `boolean` | `<Checkbox>` |
| `select` | `<Select>` с options |
| `textarea` | `<Textarea>` + опционально кнопка "Import from GitHub" |

### 4.3 GitHub SSH Key Import

UI-хелпер для `textarea` параметров с `github_import: true`:

1. Кнопка "Import from GitHub" рядом с textarea
2. Dialog: ввести GitHub username
3. Fetch `https://api.github.com/users/{username}/keys`
4. Показать найденные ключи с чекбоксами
5. "Import selected" → вставить в textarea (одной строкой на ключ)

Это чисто UI-удобство, не архитектурная фича. Просто кнопка рядом с полем.

### 4.4 Skills Library

Страница `#/skills`:

- Все доступные скиллы (built-in + imported)
- Поиск и фильтр по категории
- Для каждого скилла: имя, описание, категория, просмотр bash-кода
- **Импорт:**
  - По URL (input + "Import")
  - Из файла (file picker / drag & drop)
  - Из буфера обмена ("Paste YAML")
  - Валидация при импорте (обязательные поля, корректность)
- **Создание:** YAML-редактор с live-валидацией
- **Экспорт:** скачать как .yaml файл
- **Удаление:** только импортированные (built-in нельзя)
- **Просмотр:** развернуть карточку → bash-код, параметры, метаданные

### 4.5 Script Generation

Генератор — чистая функция:

```typescript
function generateScript(config: Configuration, skills: Skill[]): string
```

**Структура генерируемого скрипта:**

1. **Header**
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   # Generated by ServUp v2
   # Configuration: "My production server"
   # Date: 2026-02-01
   # OS: debian
   ```
   - Цветные функции логирования (`log_info`, `log_success`, `log_error`)
   - Проверка root-привилегий
   - Начало таймера

2. **OS detection & package cache update**
   - Определение apt vs yum
   - Обновление кэша

3. **Skill blocks (в порядке entries)**
   - Для каждого enabled entry:
     - Комментарий-разделитель с именем скилла
     - Подстановка `{{param_id}}` → значение параметра
     - Bash-код скилла (для выбранной OS)

4. **Footer**
   - Итоговое сообщение
   - Время выполнения

**Подстановка параметров:** простая замена `{{param_id}}` → значение. Никаких условий, циклов, хелперов. Вся логика — на bash внутри скилла.

**Script Output UI:**
- Подсветка синтаксиса (bash)
- "Copy to clipboard"
- "Download .sh"
- Информация: количество скиллов, предупреждение "Review before running"

### 4.6 Vault (шифрование)

**Первый запуск — Welcome screen:**
- "Set password" → создать vault
- "Skip for now" → работать без шифрования, данные в plain IndexedDB

**Создание vault:**
1. Пароль + подтверждение
2. Random salt (16 bytes)
3. PBKDF2(password, salt, 100000 iterations) → 512-bit key material
4. Первые 256 bit → `encryptionKey` (AES-GCM)
5. Последние 256 bit → `authToken` (для sync)
6. Шифруем тестовую строку → `verifier`
7. localStorage: `{ salt, verifier }`
8. sessionStorage: derived key (на время сессии)

**Unlock (при загрузке с vault):**
1. Экран ввода пароля
2. PBKDF2(password, salt) → key
3. Расшифровать verifier → если успех, unlock
4. Ключ → sessionStorage

**Что шифруется:** конфигурации (entries с параметрами — SSH ключи, usernames и т.д.)
**Что НЕ шифруется:** скиллы (публичные), app settings, vault meta

### 4.7 Sync (опциональная синхронизация)

**Требует включённый vault** (без шифрования синхронизировать нельзя).

**Протокол:**
- `authToken` → идентификатор на сервере (derived от пароля, но сам пароль не передаётся)
- Данные → AES-GCM(`encryptionKey`) → зашифрованный блоб → на сервер
- Сервер хранит только блобы, не может прочитать

**API:**
```
PUT /api/sync   { data: "base64-blob", updatedAt: timestamp }
GET /api/sync   → { data: "base64-blob", updatedAt: timestamp }
Authorization: Bearer {authToken}
```

**Стратегия:** last-write-wins по timestamp. Sync при открытии приложения и по кнопке "Sync now".

### 4.8 PWA

- `vite-plugin-pwa` → Service Worker + manifest.json
- Кэширование всех статических ассетов
- Полная офлайн-работа
- Баннер "Install app" (стандартный браузерный)
- Иконки нескольких размеров

### 4.9 Settings

Страница `#/settings`:
- **Vault:** Set/change password, enable/disable
- **Sync:** Server URL, enable/disable, "Sync now", статус
- **Theme:** Light / Dark / System
- **Data:** Export all (JSON), Import, Clear all data
- **About:** Version, links

---

## 5. UI / UX

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  ServUp                              [Settings]  [Theme]│
├───────────┬─────────────────────────────────────────────┤
│           │                                             │
│  Configs  │          Active Area                        │
│  sidebar  │                                             │
│           │  (Editor / Script / Skills Library)         │
│  [+ New]  │                                             │
│           │                                             │
│  ★ Prod   │                                             │
│  ★ Dev    │                                             │
│  staging  │                                             │
│  test     │                                             │
│           │                                             │
└───────────┴─────────────────────────────────────────────┘
```

Mobile (< 768px): sidebar через hamburger menu.

### 5.2 Страницы (hash routes)

| Route | Содержимое |
|-------|-----------|
| `#/` | Список конфигураций или редактор активной |
| `#/config/:id` | Редактор конфигурации |
| `#/config/:id/script` | Сгенерированный скрипт |
| `#/skills` | Библиотека скиллов |
| `#/settings` | Настройки |

### 5.3 Редактор конфигурации

```
┌─────────────────────────────────────────────────┐
│ [< Back]  My production server  [✎]    [OS: ▾]  │
├─────────────────────────────────────────────────┤
│                                                  │
│ ── System ──────────────────────────────────     │
│ ☑ Set Hostname     hostname: [prod-1____]       │
│ ☑ Set Timezone     timezone: [UTC_______▾]      │
│                                                  │
│ ── Users ───────────────────────────────────     │
│ ☑ Create User      username: [alice]             │
│                     groups: [sudo,docker]         │
│                     ssh_keys: [...] [GitHub]      │
│ ☑ Create User      username: [bob]               │
│                     groups: [sudo]                │
│                     ssh_keys: [...] [GitHub]      │
│ [+ Add Create User]                              │
│                                                  │
│ ── Security ────────────────────────────────     │
│ ☑ Passwordless sudo                              │
│ ☑ Disable SSH Password Auth                      │
│ ☐ Configure Firewall                             │
│                                                  │
│ ── Containers ──────────────────────────────     │
│ ☑ Install Docker                                 │
│                                                  │
│ ── Tools ───────────────────────────────────     │
│ ☐ Install vim                                    │
│ ☐ Install htop                                   │
│                                                  │
│ ┌─────────────────────────────────────────┐      │
│ │         ▶ Generate Script               │      │
│ └─────────────────────────────────────────┘      │
└──────────────────────────────────────────────────┘
```

- Entries сгруппированы по category скилла
- Внутри группы — порядок entries из конфигурации
- Drag & drop для перестановки
- "Add Skill" — opens picker из доступных скиллов
- Для repeatable — "+ Add another" под последним экземпляром

### 5.4 Дизайн

- shadcn/ui компоненты (Card, Button, Input, Checkbox, Select, Textarea, Dialog, Tabs, etc.)
- Tailwind CSS
- Dark / Light тема
- Минималистичный, функциональный стиль
- Моноширинный шрифт для кода и bash-превью

---

## 6. Project Structure

```
servup/
├── public/
│   ├── favicon.svg
│   └── icons/                    # PWA icons
├── src/
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component + hash router
│   ├── index.css                 # Tailwind imports
│   │
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── checkbox.tsx
│   │       ├── select.tsx
│   │       ├── textarea.tsx
│   │       ├── dialog.tsx
│   │       ├── tabs.tsx
│   │       ├── toast.tsx
│   │       └── ...
│   │
│   ├── features/
│   │   ├── configurations/
│   │   │   ├── ConfigSidebar.tsx     # Sidebar list of configs
│   │   │   ├── ConfigEditor.tsx      # Main editor (list of entries)
│   │   │   ├── SkillEntryCard.tsx    # Single entry card with params
│   │   │   ├── AddSkillDialog.tsx    # Skill picker dialog
│   │   │   └── GitHubImport.tsx      # GitHub SSH key import dialog
│   │   │
│   │   ├── script/
│   │   │   └── ScriptView.tsx        # Generated script display
│   │   │
│   │   ├── skills/
│   │   │   ├── SkillsLibrary.tsx     # Skills browser page
│   │   │   ├── SkillCard.tsx         # Skill card (library view)
│   │   │   ├── SkillImport.tsx       # Import dialog (URL/file/clipboard)
│   │   │   └── SkillEditor.tsx       # YAML editor for new/edit skills
│   │   │
│   │   ├── vault/
│   │   │   ├── WelcomeScreen.tsx     # First launch: set password / skip
│   │   │   └── UnlockScreen.tsx      # Password prompt on reload
│   │   │
│   │   └── settings/
│   │       └── SettingsPage.tsx      # All settings
│   │
│   ├── core/
│   │   ├── generator.ts             # Bash script generation (pure function)
│   │   ├── skills-parser.ts         # YAML → Skill parser + validation
│   │   ├── crypto.ts                # PBKDF2, AES-GCM encrypt/decrypt
│   │   ├── sync.ts                  # Sync client
│   │   ├── github.ts                # GitHub API (fetch SSH keys)
│   │   └── validators.ts            # Input validation
│   │
│   ├── store/
│   │   ├── index.ts                 # Combined Zustand store
│   │   ├── configurations.ts        # Configurations slice
│   │   ├── skills.ts                # Skills slice
│   │   └── vault.ts                 # Vault & sync state
│   │
│   ├── lib/
│   │   ├── db.ts                    # IndexedDB wrapper (idb)
│   │   ├── storage.ts               # Encrypted storage layer
│   │   └── utils.ts                 # nanoid, helpers
│   │
│   └── skills/                      # Built-in skills (YAML files)
│       ├── index.ts                 # Loads and exports all built-in skills
│       ├── create-user.yaml
│       ├── configure-inputrc.yaml
│       ├── set-hostname.yaml
│       ├── set-timezone.yaml
│       ├── install-docker.yaml
│       ├── install-nginx.yaml
│       ├── install-node.yaml
│       ├── install-vim.yaml
│       ├── install-htop.yaml
│       ├── install-net-tools.yaml
│       ├── configure-sudoers.yaml
│       ├── disable-ssh-password.yaml
│       ├── configure-firewall.yaml
│       └── install-fail2ban.yaml
│
├── sync-server/
│   ├── server.ts                    # Express server (~100 lines)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml
├── Dockerfile                       # Multi-stage: build frontend + nginx
├── nginx.conf
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vite.config.single.ts           # Single-file build config
├── tailwind.config.ts
├── components.json                  # shadcn/ui config
└── .prettierrc
```

---

## 7. Built-in Skills (v1)

| ID | Name | Category | Priority | Repeatable |
|----|------|----------|----------|------------|
| `set-hostname` | Set Hostname | system | 1 | no |
| `set-timezone` | Set Timezone | system | 2 | no |
| `configure-sudoers` | Passwordless sudo | security | 5 | no |
| `disable-ssh-password` | Disable SSH Password Auth | security | 6 | no |
| `configure-firewall` | Configure UFW/firewalld | security | 7 | no |
| `install-fail2ban` | Install fail2ban | security | 8 | no |
| `install-docker` | Install Docker | containers | 10 | no |
| `install-nginx` | Install Nginx | web | 20 | no |
| `install-node` | Install Node.js (via nvm) | development | 30 | no |
| `create-user` | Create User | users | 40 | **yes** |
| `configure-inputrc` | Configure .inputrc | users | 41 | **yes** |
| `install-vim` | Install vim | tools | 50 | no |
| `install-htop` | Install htop | tools | 50 | no |
| `install-net-tools` | Install net-tools | tools | 50 | no |

Порядок в таблице = рекомендуемый порядок в скрипте. Пользователь может изменить порядок drag & drop.

---

## 8. Sync Server

Минимальный Node.js/Express + SQLite:

```typescript
// sync-server/server.ts — ~100 строк
import express from 'express';
import Database from 'better-sqlite3';

const app = express();
const db = new Database('/app/data/sync.db');

db.exec(`CREATE TABLE IF NOT EXISTS store (
  token TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);

app.use(express.json({ limit: '10mb' }));

function getToken(req) {
  return req.headers.authorization?.replace('Bearer ', '') || null;
}

app.get('/api/sync', (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const row = db.prepare('SELECT data, updated_at FROM store WHERE token = ?').get(token);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ data: row.data, updatedAt: row.updated_at });
});

app.put('/api/sync', (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  db.prepare(
    'INSERT INTO store (token, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(token) DO UPDATE SET data=?, updated_at=?'
  ).run(token, req.body.data, req.body.updatedAt, req.body.data, req.body.updatedAt);
  res.json({ ok: true });
});

app.listen(3001, () => console.log('Sync server on :3001'));
```

---

## 9. Build & Deployment

### 9.1 Build commands

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:single": "vite build --config vite.config.single.ts",
    "preview": "vite preview",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  }
}
```

### 9.2 Docker

```dockerfile
# Dockerfile — multi-stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```yaml
# docker-compose.yml
services:
  frontend:
    build: .
    ports: ["8080:80"]

  sync:
    build: ./sync-server
    ports: ["3001:3001"]
    volumes: [sync-data:/app/data]

volumes:
  sync-data:
```

### 9.3 CI/CD (GitHub Actions)

- **PR check:** lint + typecheck + build
- **Docker:** build & push to ghcr.io
- **Release:** GitHub release + single HTML file as artifact

---

## 10. Security

- Данные шифруются AES-GCM в браузере, в открытом виде не покидают клиент
- PBKDF2 с 100k итераций для деривации ключа
- Sync-сервер видит только зашифрованные блобы
- Скрипты рендерятся локально, нет публичных URL
- CSP-заголовки в nginx
- Валидация ввода (username format, SSH key format)
- Skills из внешних источников — пользователь видит bash-код перед импортом

---

## 11. Future (v2)

### AI Agent
- Чат-интерфейс в приложении
- LLM API key в vault (локально)
- Агент вызывает те же Zustand actions, что и UI
- Юзкейс 1: "Настрой сервер для Node.js + Nginx" → агент добавляет entries
- Юзкейс 2: "Создай скилл для PostgreSQL 16" → агент генерирует YAML

### One-time script links
- Sync-сервер отдаёт скрипт по одноразовой ссылке
- После первого запроса — ссылка протухает
- `curl https://servup.example.com/s/abc123 | bash`

### Skills Registry
- GitHub-репозиторий с каталогом community-скиллов
- Browse & install из приложения

### Multi-OS
- Windows/PowerShell support в skill format (`scripts.windows`)

---

## 12. Implementation Plan

### Phase 1: Foundation
- Vite + React + TS + Tailwind + shadcn/ui
- Zustand store (configurations, skills, vault state)
- IndexedDB persistence
- Hash router
- Layout (sidebar + main area)

### Phase 2: Skills System
- YAML parser + validator
- Built-in skills (14 YAML files)
- Skills library page (browse, view details)
- Import (URL, file, clipboard) / export / delete

### Phase 3: Configuration Editor
- Config CRUD (create, duplicate, delete, pin)
- SkillEntry cards with dynamic params UI
- Add skill dialog
- Repeatable skills (+ Add another)
- Drag & drop reorder
- Auto-save to IndexedDB
- GitHub SSH key import

### Phase 4: Script Generation
- Generator function (pure TS)
- Param substitution
- Script view (syntax highlight, copy, download)

### Phase 5: Vault & Encryption
- Web Crypto (PBKDF2 + AES-GCM)
- Welcome screen (set password / skip)
- Unlock screen
- Encrypted IndexedDB layer

### Phase 6: Sync
- Sync server (Node.js + Express + SQLite)
- Sync client
- Settings UI
- Docker setup

### Phase 7: PWA & Builds
- PWA (manifest, service worker, icons)
- Single-file build
- Docker multi-stage build
- nginx config

### Phase 8: Polish
- Dark/light theme
- Responsive (mobile)
- Error handling, toasts
- Input validation
- Empty states
