# ServUp — Technical Specification

## What this is

ServUp helps people who set up Linux servers regularly. Instead of writing the same bash commands over and over, you assemble a configuration from building blocks (we call them "skills"), fill in the details, and get a clean, idempotent bash script.

The tool is aimed at DevOps engineers and developers who understand what they are doing. ServUp does not try to be smarter than the user. It is convenience, not magic.

## Key design decisions

These are the principles we arrived at during design and the reasoning behind them.

### Everything is a skill

Early designs had separate concepts for "users", "server settings", and "modules". We collapsed all of them into one abstraction: **skills**. Creating a user is a skill. Setting a hostname is a skill. Installing Docker is a skill. This means:

- One data model instead of three
- One UI pattern for everything
- Community can extend anything by writing YAML files
- The generator is trivial — it just walks a list

We considered making skills more powerful (with custom UI, nested data structures, inter-skill data passing), but decided against it. A skill is just a bash snippet with some parameters. If you need complex logic, write it in bash — that's what the target audience is comfortable with.

### No inter-skill communication

Skills don't know about each other. If the Docker skill needs to run before the "Create User" skill (so you can add users to the `docker` group), you just put Docker higher in the list and type `docker` in the groups field. Priorities control the default ordering, but the user can rearrange freely.

We explicitly rejected dependency resolution between skills. This is not a replacement for bash or Ansible. It is a quick way to assemble a setup script with a nice UI.

### Front-only architecture

The entire application runs in the browser. There is no backend needed for the core workflow: pick skills, fill parameters, generate script, copy it. Data lives in IndexedDB.

This gives us two deployment options:
- **Docker** — nginx serving the built frontend, optionally with a sync server
- **Single HTML file** — everything inlined, open it from disk

PWA support (service worker, installable) works in the Docker/hosted mode. The single-file mode works offline too, but without service worker features.

### Optional encrypted sync

For users who want to access their configurations from multiple devices, there is an optional sync server. It is deliberately simple — a key-value store that holds encrypted blobs. The server cannot read the data.

The encryption scheme:
1. User sets a vault password
2. PBKDF2 derives two keys from the password: an encryption key and an auth token
3. Data is encrypted with AES-GCM before leaving the browser
4. The auth token identifies the user to the server (it is not the password)
5. The server stores `{ token → encrypted_blob }`

Sync requires the vault to be enabled. Without encryption, there is nothing to sync.

### Skills as a plugin format

Skills are YAML files that can be shared, committed to repos, imported by URL, or pasted from clipboard. The format is intentionally simple:

```yaml
id: install-nginx
name: Install Nginx
description: Install and enable Nginx web server
category: web
os: [debian, redhat]
priority: 20
repeatable: false

params:
  - id: worker_connections
    type: string
    label: Worker connections
    default: "1024"

scripts:
  debian: |
    apt-get install -y nginx
    systemctl enable nginx
    log_success "Nginx installed"
  redhat: |
    yum install -y nginx
    systemctl enable nginx
    log_success "Nginx installed"
```

The `{{param_id}}` placeholders are replaced with parameter values. No template logic, no conditionals — just string substitution. All logic lives in bash, where the user can see and understand it.

Parameter types (`string`, `number`, `boolean`, `select`, `textarea`) map directly to HTML form elements. The `github_import: true` flag on textarea params adds a convenience button to fetch SSH keys from GitHub.

### Configurations as documents

A configuration is a named document that the user edits over time. There is no separate concept of "history" or "templates". If you want a template, pin a configuration and duplicate it when needed. Auto-save (debounced) writes to IndexedDB as you edit. The generated script is not stored — it is a pure function of the configuration state and can be regenerated instantly.

### AI agent (future)

The architecture is designed so that all operations go through Zustand store actions: `addEntry`, `updateEntry`, `removeEntry`, `createConfiguration`, etc. This means a future AI agent can call the exact same functions the UI uses. No special "AI mode" needed — the agent just manipulates the store, and the UI reflects the changes.

Two planned use cases:
1. "Set up a server for a Node.js app with Nginx reverse proxy" — the agent picks and configures skills
2. "Create a skill for installing PostgreSQL 16" — the agent generates a YAML file

---

## Data model

### Skill

```typescript
interface Skill {
  id: string              // unique slug: "install-docker"
  name: string            // human name: "Install Docker"
  description: string
  category: string        // for UI grouping: "containers", "users", "security", ...
  os: ('debian' | 'redhat')[]
  priority: number        // insertion hint (lower = earlier, default 50)
  repeatable: boolean     // can appear multiple times in a config
  builtin: boolean        // shipped with the app vs imported

  params: SkillParam[]
  scripts: {
    debian?: string
    redhat?: string
  }
}

interface SkillParam {
  id: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea'
  default: string
  required: boolean
  options?: string[]       // for select type
  github_import?: boolean  // show GitHub SSH key import button
}
```

### Configuration

```typescript
interface Configuration {
  id: string
  name: string
  pinned: boolean
  createdAt: number
  updatedAt: number
  os: 'debian' | 'redhat'

  entries: SkillEntry[]    // ordered list — this is the entire configuration
}

interface SkillEntry {
  id: string               // unique instance id
  skillId: string          // which skill
  enabled: boolean         // can disable without removing
  params: Record<string, string>
}
```

The order of `entries` is the execution order. When a skill is added, it is inserted at a position based on its `priority` value. The user can reorder by dragging.

### Storage

| Data | Where | Encrypted |
|------|-------|-----------|
| Configurations | IndexedDB | Yes (if vault enabled) |
| Built-in skills | App bundle | No |
| Imported skills | IndexedDB | No (public data) |
| App settings | localStorage | No |
| Vault metadata | localStorage | No (just salt + verifier) |
| Derived encryption key | sessionStorage | No (cleared on tab close) |

---

## Script generation

The generator is a pure TypeScript function with no side effects:

```typescript
function generateScript(config: Configuration, skills: Skill[]): string
```

It produces a bash script with this structure:

1. **Header** — shebang, `set -euo pipefail`, metadata comments, colored logging functions (`log_info`, `log_success`, `log_error`), root check, timer start
2. **OS detection** — identifies apt vs yum, updates package cache
3. **Skill blocks** — for each enabled entry in order: a comment separator, then the skill's bash code with `{{param}}` values substituted
4. **Footer** — completion message with elapsed time

Parameter substitution is plain string replacement. `{{username}}` becomes `alice`. If a parameter is empty, it becomes an empty string — the skill's bash code handles that with standard `if [ -n "$VAR" ]` checks.

---

## Built-in skills

| ID | Name | Category | Priority | Repeatable |
|----|------|----------|----------|------------|
| `set-hostname` | Set Hostname | system | 1 | no |
| `set-timezone` | Set Timezone | system | 2 | no |
| `configure-sudoers` | Passwordless sudo | security | 5 | no |
| `disable-ssh-password` | Disable SSH Password Auth | security | 6 | no |
| `configure-firewall` | Configure UFW / firewalld | security | 7 | no |
| `install-fail2ban` | Install fail2ban | security | 8 | no |
| `install-docker` | Install Docker | containers | 10 | no |
| `install-nginx` | Install Nginx | web | 20 | no |
| `install-node` | Install Node.js (via nvm) | development | 30 | no |
| `create-user` | Create User | users | 40 | **yes** |
| `configure-inputrc` | Configure .inputrc | users | 41 | **yes** |
| `install-vim` | Install vim | tools | 50 | no |
| `install-htop` | Install htop | tools | 50 | no |
| `install-net-tools` | Install net-tools | tools | 50 | no |

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| UI framework | React 18 + TypeScript | Component model, type safety |
| UI components | shadcn/ui + Tailwind CSS 4 | Clean design, customizable |
| State | Zustand | Minimal boilerplate, works well with persistence |
| Storage | IndexedDB via `idb` | Persistent browser storage for structured data |
| Encryption | Web Crypto API | PBKDF2 + AES-GCM, no dependencies |
| YAML | js-yaml | Parse skill files |
| Syntax highlighting | highlight.js | Bash code preview |
| Build | Vite | Fast builds, HMR, plugin ecosystem |
| Single-file | vite-plugin-singlefile | Inline everything into one HTML |
| PWA | vite-plugin-pwa | Service worker, manifest, offline |
| Router | react-router (hash mode) | Works with `file://`, bookmarkable |
| Sync server | Node.js + Express + SQLite | ~100 lines, stores encrypted blobs |
| Container | Docker + nginx | Production deployment |

---

## UI structure

The app uses hash-based routing (`#/config/123`, `#/skills`, `#/settings`), which works everywhere including when opened from `file://`.

| Route | Content |
|-------|---------|
| `#/` | Home — configuration list or "select a config" prompt |
| `#/config/:id` | Configuration editor |
| `#/config/:id/script` | Generated script view |
| `#/skills` | Skills library (browse, import, export) |
| `#/settings` | Theme, data management, sync settings |

The layout has a sidebar listing configurations (pinned first, then by last modified) and a main area for the active view.

The configuration editor groups skill entries by category. Each entry shows a checkbox (enable/disable), parameter fields, and a remove button. Repeatable skills show a "+ Add another" link after the last instance.

---

## Deployment

### Docker

The Dockerfile is a multi-stage build: Node.js builds the frontend, nginx serves the static files. The docker-compose file adds an optional sync server.

```bash
docker compose up         # frontend on :8080, sync on :3001
```

### Single HTML file

```bash
npm run build:single      # produces dist-single/index.html
```

This file can be opened directly in a browser, emailed, or hosted on any static server. It includes all JavaScript, CSS, and skill definitions inlined.

### CI/CD

Three GitHub Actions workflows:

- **PR check** — runs `tsc --noEmit` and `npm run build` on every pull request
- **Docker** — builds and pushes to `ghcr.io` on push to main and version tags
- **Release** — on version tags, builds the single-file HTML and attaches it to a GitHub Release

---

## Security considerations

- SSH keys and other sensitive data never leave the browser unencrypted
- Vault password is only used to derive keys (PBKDF2, 100k iterations), never stored
- The sync server sees only encrypted blobs and an auth token (not the password)
- Generated scripts are rendered locally, not uploaded anywhere
- No public URLs for scripts (copy to clipboard or download only)
- Imported skills show their bash code so the user can review before adding
- nginx config includes security headers (X-Frame-Options, X-Content-Type-Options)

---

## Future work (v2)

- **Vault encryption** — PBKDF2 + AES-GCM, welcome screen with password setup, unlock on reload
- **Sync client** — connect to sync server, encrypted push/pull
- **AI agent** — chat interface using the same Zustand actions as the UI
- **One-time script links** — sync server serves script once, then the link expires
- **Community skill registry** — a GitHub repo with an index of community-contributed skills
- **Multi-OS** — the skill format already has a `scripts` map, so adding `scripts.windows` is possible if there is demand
