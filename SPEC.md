# ServUp v2 — Technical Specification

## 1. Product Overview

**ServUp** — инструмент для быстрой настройки Linux-серверов. Пользователь выбирает что установить/настроить через UI с чекбоксами ("skills"), указывает пользователей и SSH-ключи, и получает готовый bash-скрипт для запуска на сервере.

### Ключевые принципы

- **Front-only** — вся логика работает в браузере, сервер не обязателен
- **Offline-first** — PWA, работает без интернета после первой загрузки
- **Privacy-first** — приватные данные шифруются паролем пользователя
- **Extensible** — система скиллов (плагинов) в формате YAML
- **Simple** — минимум абстракций, читаемый код, легко дорабатывать

### Целевая аудитория

DevOps-инженеры и разработчики, которые регулярно настраивают серверы и хотят автоматизировать рутину.

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
| UI components | shadcn/ui + Tailwind CSS | Стильный, кастомизируемый дизайн |
| State | Zustand | Простой стейт без бойлерплейта |
| Storage | IndexedDB (через `idb`) | Персистентное хранение в браузере |
| Encryption | Web Crypto API (PBKDF2 + AES-GCM) | E2E шифрование без зависимостей |
| YAML parsing | js-yaml | Парсинг skill-файлов |
| Syntax highlight | Shiki или highlight.js | Подсветка bash в превью |
| Build | Vite | Быстрая сборка, HMR |
| Single-file | vite-plugin-singlefile | Один HTML-файл |
| PWA | vite-plugin-pwa | Service Worker, manifest |
| Router | react-router (hash mode) | Навигация, закладки |
| Sync server | Node.js + Express | Минимальный бэкенд для синхронизации |
| Container | Docker + nginx | Продакшн-деплой |

---

## 3. Data Model

### 3.1 Configuration (документ)

Основная единица — конфигурация сервера. Пользователь может иметь несколько конфигураций.

```typescript
interface Configuration {
  id: string;             // nanoid
  name: string;           // "My production server"
  pinned: boolean;        // избранное
  createdAt: number;      // timestamp
  updatedAt: number;      // timestamp

  // Server settings
  hostname: string;
  timezone: string;
  os: 'debian' | 'redhat';   // целевая OS-семейство

  // Users
  users: User[];

  // Selected skills with params
  skills: SelectedSkill[];
}

interface User {
  id: string;
  username: string;
  groups: string[];         // ['sudo', 'docker']
  sshKeys: SSHKey[];
}

interface SSHKey {
  id: string;
  label: string;           // "macbook", "github:smartynov"
  key: string;             // ssh-ed25519 AAAA...
}

interface SelectedSkill {
  skillId: string;         // ссылка на skill
  enabled: boolean;
  params: Record<string, string>;  // заполненные параметры
}
```

### 3.2 Skill (плагин)

```typescript
interface Skill {
  id: string;              // "install-docker" (уникальный slug)
  name: string;            // "Install Docker"
  description: string;     // краткое описание
  category: string;        // "containers", "security", "tools"
  os: ('debian' | 'redhat')[];  // поддерживаемые OS
  priority: number;        // порядок (ниже = раньше, default 50)
  dependencies: string[];  // ID скиллов-зависимостей
  builtin: boolean;        // встроенный или импортированный

  params: SkillParam[];
  scripts: {
    debian?: string;       // bash-код для Debian/Ubuntu
    redhat?: string;       // bash-код для RHEL/CentOS
  };
}

interface SkillParam {
  id: string;              // "version"
  label: string;           // "Docker Compose version"
  type: 'string' | 'number' | 'boolean' | 'select';
  default: string;
  options?: string[];      // для type: 'select'
}
```

### 3.3 YAML формат скилла

```yaml
id: install-docker
name: Install Docker
description: Install Docker Engine and Docker Compose
category: containers
os: [debian, redhat]
priority: 10
dependencies: []

params:
  - id: compose_version
    label: Compose version
    type: string
    default: latest

scripts:
  debian: |
    if ! command -v docker &>/dev/null; then
      curl -fsSL https://get.docker.com | sh
      systemctl enable docker
      systemctl start docker
    fi
    log_success "Docker installed"

  redhat: |
    if ! command -v docker &>/dev/null; then
      yum install -y yum-utils
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      yum install -y docker-ce docker-ce-cli containerd.io
      systemctl enable docker
      systemctl start docker
    fi
    log_success "Docker installed"
```

### 3.4 App State (Zustand store)

```typescript
interface AppState {
  // Configurations
  configurations: Configuration[];
  activeConfigId: string | null;

  // Skills library
  skills: Skill[];

  // Vault
  vaultUnlocked: boolean;
  vaultEnabled: boolean;

  // Sync
  syncEnabled: boolean;
  syncServerUrl: string;

  // UI
  theme: 'light' | 'dark' | 'system';
}
```

### 3.5 Storage

| Данные | Где хранить | Шифрование |
|--------|------------|------------|
| Конфигурации (с юзерами, ключами) | IndexedDB | Да (если vault включён) |
| Skills (встроенные) | Бандл (статика) | Нет |
| Skills (импортированные) | IndexedDB | Нет (публичные данные) |
| App settings (тема, sync URL) | localStorage | Нет |
| Vault meta (salt, проверка пароля) | localStorage | Нет (только salt + verifier) |
| Derived encryption key | sessionStorage | Нет (живёт до закрытия вкладки) |

---

## 4. Features (v1)

### 4.1 Configurations

**Список конфигураций** — главный экран:
- Карточки/список всех конфигураций
- Pinned (избранные) наверху
- Сортировка по дате изменения
- "New configuration" — создать пустую
- "Duplicate" — копия существующей
- "Delete" — удаление с подтверждением
- Клик → открыть редактор

**Редактор конфигурации:**
- Имя конфигурации (editable)
- Server settings: hostname, timezone, OS family
- Users section (см. 4.2)
- Skills section (см. 4.3)
- "Generate Script" → переход к скрипту
- Авто-сохранение при изменениях (debounced, в IndexedDB)

### 4.2 Users

Внутри конфигурации, секция пользователей:
- Список юзеров (аккордеон или карточки)
- Добавить / удалить юзера
- Для каждого юзера:
  - Username (валидация: `[a-z_][a-z0-9_-]*`)
  - Groups (мульти-селект: sudo, docker, www-data, custom)
  - SSH keys (список с label + key)
    - Добавить вручную (textarea)
    - **Import from GitHub** — ввести username, fetch ключи
    - Удалить ключ

**GitHub import flow:**
1. Кнопка "Import from GitHub"
2. Input: GitHub username
3. Fetch `https://api.github.com/users/{username}/keys`
4. Показать найденные ключи, чекбоксы для выбора
5. Добавить выбранные с label "github:{username}"

### 4.3 Skills

**В редакторе конфигурации:**
- Сетка карточек скиллов с чекбоксами
- Группировка по категориям (tabs или секции)
- Поиск по имени/описанию
- При включении скилла: показать его параметры (если есть)
- Dependency check: если скилл A зависит от B, а B выключен → показать предупреждение с кнопкой "Enable B"

**Skills Library (отдельная страница #/skills):**
- Все доступные скиллы (встроенные + импортированные)
- Импорт:
  - По URL (input + кнопка "Import")
  - Из файла (drag & drop zone + file picker)
  - Из буфера обмена (кнопка "Paste from clipboard")
- Просмотр деталей скилла (описание, код, зависимости)
- Создание нового скилла (YAML-редактор с валидацией)
- Удаление импортированных скиллов (встроенные нельзя удалить)
- Экспорт скилла (скачать YAML)

### 4.4 Script Generation

Генератор — чистая TypeScript-функция:

```typescript
function generateScript(config: Configuration, skills: Skill[]): string
```

**Структура генерируемого скрипта:**

1. **Header**
   - `#!/usr/bin/env bash`
   - `set -euo pipefail`
   - Метаданные в комментариях (имя конфигурации, дата, версия ServUp)
   - Цветные функции логирования (`log_info`, `log_success`, `log_error`)
   - Проверка root-привилегий

2. **OS Detection**
   - Определение Debian/Ubuntu vs RHEL/CentOS
   - Обновление кэша пакетов

3. **Users**
   - Для каждого юзера: создание (если нет), группы, SSH-ключи, .inputrc
   - Идемпотентно (проверка существования)

4. **Skills**
   - Topological sort по зависимостям + приоритету
   - Подстановка параметров (template literals: `{{param_id}}`)
   - Bash-код каждого скилла с комментариями

5. **Footer**
   - Итоговое сообщение
   - Время выполнения

**Script Output UI:**
- Подсветка синтаксиса (bash)
- Кнопка "Copy to clipboard"
- Кнопка "Download .sh"
- Предупреждение о безопасности ("Review the script before running")

### 4.5 Vault (шифрование)

**Первый запуск:**
- Welcome-экран с двумя опциями:
  - "Set password" → создать vault
  - "Skip for now" → работать без шифрования

**Создание vault:**
1. Пользователь вводит пароль (+ подтверждение)
2. Генерируем random salt (16 bytes)
3. PBKDF2(password, salt, 100000 iterations) → 512-bit key material
4. Первые 256 bit → `encryptionKey` (AES-GCM)
5. Следующие 256 bit → `authToken` (для sync-сервера)
6. Шифруем тестовую строку для проверки пароля при unlock
7. Сохраняем в localStorage: `{ salt, verifier }` (verifier = зашифрованная тестовая строка)
8. `encryptionKey` → sessionStorage (на время сессии)

**Unlock при загрузке (если vault включён):**
1. Экран ввода пароля
2. Derive key из пароля + salt
3. Попытка расшифровать verifier
4. Если успех → unlock, ключ в sessionStorage
5. Если неудача → "Wrong password"

**Шифрование данных:**
- Все конфигурации шифруются AES-GCM перед записью в IndexedDB
- При чтении — расшифровываются
- Skills (публичные) НЕ шифруются
- App settings НЕ шифруются

### 4.6 Sync (опциональная синхронизация)

**Settings → Sync:**
- URL сервера
- Включить/выключить
- Требует включённый vault

**Протокол:**
- `authToken` (derived от пароля) — идентификатор пользователя для сервера
- Данные шифруются `encryptionKey` перед отправкой
- Сервер хранит только зашифрованные блобы

**API sync-сервера:**

```
PUT /api/sync
Headers: Authorization: Bearer {authToken}
Body: { data: "base64-encrypted-blob", updatedAt: timestamp }

GET /api/sync
Headers: Authorization: Bearer {authToken}
Response: { data: "base64-encrypted-blob", updatedAt: timestamp }
```

**Стратегия синхронизации (v1 — простая):**
- Last-write-wins по timestamp
- Sync при: открытии приложения, сохранении конфигурации, нажатии "Sync now"
- Конфликтов нет — один пользователь, один блоб

### 4.7 PWA

- `vite-plugin-pwa` генерирует Service Worker и manifest.json
- Кэширование всех статических ассетов
- Офлайн-работа полностью
- Баннер "Install app" при первом визите (стандартный браузерный)
- Иконки приложения (несколько размеров)

### 4.8 Settings

Страница `#/settings`:
- **Vault**: Set/change password, disable vault
- **Sync**: Server URL, enable/disable, manual sync, status
- **Theme**: Light / Dark / System
- **Data**: Export all data (JSON), Import data, Clear all data
- **About**: Version, links

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

**Mobile (< 768px):** sidebar скрывается, доступна через hamburger menu.

### 5.2 Страницы (hash routes)

| Route | Содержимое |
|-------|-----------|
| `#/` | Список конфигураций (если нет активной) или редактор активной |
| `#/config/:id` | Редактор конфигурации |
| `#/config/:id/script` | Сгенерированный скрипт |
| `#/skills` | Библиотека скиллов |
| `#/settings` | Настройки |

### 5.3 Редактор конфигурации

Вертикальный layout с секциями:

1. **Server** — hostname, timezone, OS (compact form, одна строка)
2. **Users** — аккордеон, каждый юзер разворачивается
3. **Skills** — сетка карточек 2-3 колонки с чекбоксами
   - Tabs по категориям сверху
   - Поисковая строка
   - При включении: карточка раскрывается, показывая параметры
4. **[Generate Script]** — большая кнопка внизу или в sticky footer

### 5.4 Дизайн

- shadcn/ui компоненты (Card, Button, Input, Checkbox, Accordion, Dialog, Tabs, etc.)
- Tailwind CSS для кастомных стилей
- Dark / Light тема
- Минималистичный, функциональный стиль
- Моноширинный шрифт для кода
- Цветовые акценты для категорий скиллов

---

## 6. Project Structure

```
servup/
├── public/
│   ├── favicon.svg
│   └── icons/                    # PWA иконки
├── src/
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component + router
│   ├── index.css                 # Tailwind imports + globals
│   │
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── accordion.tsx
│   │       ├── tabs.tsx
│   │       ├── toast.tsx
│   │       └── ...
│   │
│   ├── features/
│   │   ├── configurations/
│   │   │   ├── ConfigList.tsx        # Sidebar list
│   │   │   ├── ConfigEditor.tsx      # Main editor
│   │   │   ├── ServerSettings.tsx    # Hostname, TZ, OS
│   │   │   ├── UserSection.tsx       # Users accordion
│   │   │   ├── UserEditor.tsx        # Single user form
│   │   │   ├── SSHKeyInput.tsx       # SSH key management
│   │   │   ├── GitHubKeyImport.tsx   # GitHub key import dialog
│   │   │   ├── SkillsGrid.tsx        # Skills checkboxes grid
│   │   │   └── SkillCard.tsx         # Single skill card
│   │   │
│   │   ├── script/
│   │   │   └── ScriptView.tsx        # Generated script display
│   │   │
│   │   ├── skills/
│   │   │   ├── SkillsLibrary.tsx     # Skills browser page
│   │   │   ├── SkillDetail.tsx       # Skill detail view
│   │   │   ├── SkillImport.tsx       # Import dialog
│   │   │   └── SkillYamlEditor.tsx   # YAML editor for new skills
│   │   │
│   │   ├── vault/
│   │   │   ├── VaultSetup.tsx        # Welcome / create password
│   │   │   └── VaultUnlock.tsx       # Unlock screen
│   │   │
│   │   └── settings/
│   │       └── SettingsPage.tsx      # Settings
│   │
│   ├── core/
│   │   ├── generator.ts             # Bash script generation
│   │   ├── skills-parser.ts         # YAML → Skill parser + validator
│   │   ├── topo-sort.ts             # Topological sort for dependencies
│   │   ├── crypto.ts                # PBKDF2, AES-GCM encrypt/decrypt
│   │   ├── sync.ts                  # Sync client
│   │   ├── github.ts                # GitHub API (fetch SSH keys)
│   │   └── validators.ts            # Input validation (username, SSH key format)
│   │
│   ├── store/
│   │   ├── index.ts                 # Main Zustand store
│   │   ├── configurations.ts        # Configurations slice
│   │   ├── skills.ts                # Skills slice
│   │   └── vault.ts                 # Vault state slice
│   │
│   ├── lib/
│   │   ├── db.ts                    # IndexedDB wrapper (idb)
│   │   ├── storage.ts               # Encrypted storage layer
│   │   └── utils.ts                 # Helpers
│   │
│   └── skills/                      # Встроенные скиллы
│       ├── index.ts                 # Barrel export
│       ├── install-docker.yaml
│       ├── install-vim.yaml
│       ├── install-htop.yaml
│       ├── install-net-tools.yaml
│       ├── configure-sudoers.yaml
│       ├── disable-ssh-password.yaml
│       ├── set-hostname.yaml
│       ├── set-timezone.yaml
│       ├── install-nginx.yaml
│       ├── install-node.yaml
│       ├── configure-firewall.yaml
│       └── install-fail2ban.yaml
│
├── sync-server/
│   ├── server.ts                    # Express sync server (~100 lines)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml               # Frontend (nginx) + sync-server
├── Dockerfile                       # Multi-stage: build + nginx
├── nginx.conf                       # Nginx config for SPA
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── components.json                  # shadcn config
├── .eslintrc.json
└── .prettierrc
```

---

## 7. Built-in Skills (v1)

| ID | Name | Category | Priority |
|----|------|----------|----------|
| `install-docker` | Install Docker | containers | 10 |
| `install-nginx` | Install Nginx | web | 20 |
| `install-node` | Install Node.js (via nvm) | development | 30 |
| `install-vim` | Install vim | tools | 50 |
| `install-htop` | Install htop | tools | 50 |
| `install-net-tools` | Install net-tools | tools | 50 |
| `configure-sudoers` | Passwordless sudo | security | 5 |
| `disable-ssh-password` | Disable SSH password auth | security | 5 |
| `set-hostname` | Set hostname | system | 1 |
| `set-timezone` | Set timezone | system | 1 |
| `configure-firewall` | Configure UFW/firewalld | security | 40 |
| `install-fail2ban` | Install fail2ban | security | 41 |

---

## 8. Sync Server

Минимальный Node.js/Express сервер (~100 строк):

```typescript
// sync-server/server.ts
import express from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));

// In-memory or SQLite store
const store = new Map<string, { data: string; updatedAt: number }>();

app.put('/api/sync', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  store.set(token, { data: req.body.data, updatedAt: req.body.updatedAt });
  res.json({ ok: true });
});

app.get('/api/sync', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const entry = store.get(token);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

app.listen(3001);
```

Для продакшна — SQLite вместо Map, но идея та же.

---

## 9. Build & Deployment

### 9.1 Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import yaml from '@modyfi/vite-plugin-yaml';

export default defineConfig({
  plugins: [
    react(),
    yaml(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ServUp',
        short_name: 'ServUp',
        theme_color: '#0f172a',
        icons: [/* ... */],
      },
    }),
  ],
});
```

### 9.2 Build Commands

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

`vite.config.single.ts` — использует `vite-plugin-singlefile` для генерации одного HTML.

### 9.3 Docker

```dockerfile
# Dockerfile (multi-stage)
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
    ports:
      - "8080:80"

  sync:
    build: ./sync-server
    ports:
      - "3001:3001"
    volumes:
      - sync-data:/app/data

volumes:
  sync-data:
```

### 9.4 CI/CD (GitHub Actions)

- **PR check**: lint + typecheck + build
- **Docker build**: build & push image to ghcr.io
- **Release**: создание GitHub release с артефактами:
  - Docker image tag
  - Single HTML file (артефакт релиза)

---

## 10. Security Considerations

- SSH-ключи и пароли никогда не покидают браузер в открытом виде
- Vault-пароль используется только для деривации ключа (PBKDF2, 100k итераций)
- Sync-сервер видит только зашифрованные блобы и auth-токен (не связан с паролем)
- Генерируемые скрипты не уходят на сервер — рендерятся в браузере
- Нет публичных URL для скриптов (copy/download only)
- CSP-заголовки в nginx-конфиге
- Валидация всех пользовательских вводов (username format, SSH key format)
- Skills из внешних источников — пользователь видит bash-код перед добавлением

---

## 11. Future (v2)

### AI Agent
- Чат-интерфейс в приложении
- LLM API key хранится локально (в vault)
- Агент вызывает те же функции, что и UI (через Zustand actions)
- Tool-calling: `enableSkill`, `disableSkill`, `setParam`, `addUser`, `generateScript`
- Юзкейс 1: "Настрой мне сервер для Node.js приложения с Nginx reverse proxy" → агент выбирает скиллы
- Юзкейс 2: "Создай скилл для установки PostgreSQL 16" → агент генерирует YAML

### Skills Registry
- Публичный GitHub-репозиторий с каталогом скиллов
- В приложении: "Browse community skills" → fetch index.json → список → install
- Любой может контрибьютить через PR

### Enhanced sync
- Merge-стратегия вместо last-write-wins
- Шаринг конфигурации между пользователями (по ссылке, зашифрованной)

### Multi-OS
- Windows/PowerShell поддержка в skills (если будет спрос)

---

## 12. Implementation Plan

### Phase 1: Foundation
- Инициализация проекта (Vite + React + TS + Tailwind + shadcn)
- Zustand store с базовой структурой
- IndexedDB wrapper
- Hash router
- Layout (sidebar + main area)

### Phase 2: Core Features
- Configurations CRUD (создание, редактирование, удаление, дублирование, pin)
- Users management (добавление, редактирование, SSH ключи)
- GitHub SSH key import
- Skills parser (YAML → Skill)
- Встроенные скиллы (12 штук)
- Skills grid в редакторе (чекбоксы, параметры, зависимости)

### Phase 3: Script Generation
- Generator (TypeScript)
- Topological sort
- Script view с подсветкой синтаксиса
- Copy / Download

### Phase 4: Skills Library
- Страница библиотеки скиллов
- Импорт по URL / из файла / из буфера
- YAML-редактор для создания скиллов
- Экспорт скилла

### Phase 5: Vault & Encryption
- Crypto модуль (PBKDF2 + AES-GCM)
- Welcome screen (set password / skip)
- Unlock screen
- Encrypted storage layer

### Phase 6: Sync
- Sync server (Node.js + Express + SQLite)
- Sync client
- Settings UI для sync
- Docker setup для sync-server

### Phase 7: PWA & Builds
- PWA configuration (manifest, service worker, icons)
- Single-file build config
- Docker multi-stage build
- docker-compose.yml
- nginx config

### Phase 8: Polish
- Dark/Light theme toggle
- Responsive design (mobile)
- Error handling & toasts
- Input validation
- Loading states
- Empty states
