# ServUp

ServUp is a tool for quickly setting up Linux servers. You pick what you need from a list of skills — things like "Install Docker", "Create User", "Set Hostname" — fill in the parameters, and get a ready-to-run bash script. That's it.

The whole thing runs in your browser. There is no backend required, no accounts, nothing to install. You can also run it as a Docker container or even open it as a single HTML file.

## Quick start

**Development:**

```bash
npm install
npm run dev
```

Open http://localhost:5173

**Docker:**

```bash
docker compose up
```

Open http://localhost:8080

**Single HTML file:**

```bash
npm run build:single
```

Then open `dist-single/index.html` in your browser. Everything is inlined into one file.

## How it works

The core idea is simple: **everything is a skill**. There are no special concepts for users, hostname, timezone, or packages. They are all skills — small YAML files that contain a bash snippet and some parameters.

A configuration is just an ordered list of skill instances with filled-in parameters. When you hit "Generate", ServUp walks through the list, substitutes the parameters into bash templates, and produces a single idempotent script.

Skills don't know about each other. There is no inter-skill communication or data passing. If you need Docker installed before creating users (so you can add them to the `docker` group), you just put the Docker skill higher in the list. The user understands what they are doing — this tool makes it faster, not smarter.

## Skills

Skills are defined as YAML files. Here's what one looks like:

```yaml
id: install-docker
name: Install Docker
description: Install Docker Engine and enable the service
category: containers
os: [debian, redhat]
priority: 10
repeatable: false

params:
  - id: compose
    type: boolean
    label: Install Docker Compose plugin
    default: "true"

scripts:
  debian: |
    if ! command -v docker &>/dev/null; then
      curl -fsSL https://get.docker.com | sh
      systemctl enable docker
      systemctl start docker
      log_success "Docker installed"
    else
      log_info "Docker already installed"
    fi
```

The app ships with 14 built-in skills covering common setup tasks. You can import more from URLs, files, or by pasting YAML. Skills are just text files, so they are easy to share, commit to a repo, or generate with AI.

### Repeatable skills

Most skills can only appear once in a configuration (you don't install Docker twice). But some skills, like "Create User", are marked `repeatable: true`. These can be added multiple times, each with different parameters — one entry per user, for example.

### Parameter types

Skills can define parameters with these types: `string`, `number`, `boolean`, `select`, and `textarea`. The UI renders the appropriate input for each type. Textarea fields can optionally show a "Import from GitHub" button to fetch SSH public keys by GitHub username.

## Project structure

```
src/
  features/        — React components grouped by feature
  core/            — Pure logic: script generator, YAML parser, GitHub API
  store/           — Zustand state management
  skills/          — Built-in skill YAML files
  components/ui/   — shadcn/ui components
  lib/             — IndexedDB wrapper, utilities
sync-server/       — Optional Node.js sync backend
```

## Tech stack

React, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Zustand, IndexedDB, js-yaml, highlight.js. No backend needed for core functionality.

## CI/CD

- **PR checks:** TypeScript type checking + production build
- **Docker:** Automatic image build and push to `ghcr.io` on merges to main
- **Releases:** Tag a version (`git tag v1.0.0 && git push origin v1.0.0`) to create a GitHub Release with a downloadable single-file HTML

## Future plans

- **Vault encryption** — optional password to encrypt local data (PBKDF2 + AES-GCM)
- **Sync** — encrypted backup to a simple key-value server (the server cannot read your data)
- **AI agent** — a chat interface that picks skills and fills parameters based on natural language, using the same store actions as the UI
- **One-time script links** — curl-friendly URLs that expire after first use
- **Community skill registry** — a shared repo of skills you can browse and install
