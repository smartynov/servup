# ServUp

A simple tool for generating server setup scripts.

## Why this exists

Even in the age of AI, Docker, Kubernetes, and serverless, I regularly find myself manually setting up servers. Usually virtual machines, each slightly different from the last. Install vim and docker, create users and add their SSH keys, close ports, configure sudo, and so on. The same routine with small variations every time.

Yes, there's cloud-init and Ansible and proper configuration management systems. Those are great when you're provisioning servers by the dozen, but in my life each server is a little different and I just want something simple and flexible. So I built this.

Now the workflow is: check the boxes for what I need, fill in a few parameters, and get a bash script I can run in one go. No dependencies to install on the target server, no YAML indentation puzzles, no learning curve. Just a script that does what I asked, and I can read every line of it before running.

The history is saved automatically, so any past configuration becomes a template for the next one. I suspect there are many people like me. Feedback and contributions are welcome.

## Quick start

**Development:**
```bash
npm install
npm run dev
```

**Docker:**
```bash
docker compose up
```
Frontend at `http://localhost:8080`, optional sync server at `http://localhost:3001`.

**Single HTML file:**
```bash
npm run build:single
```
Open `dist-single/index.html` directly in a browser. Works offline, no server needed.

## How it works

Everything in ServUp is a "skill" — a small piece of bash that does one thing. Setting a hostname is a skill. Creating a user is a skill. Installing Docker is a skill. You pick the skills you need, fill in parameters where required, and ServUp assembles them into a single bash script.

Skills are YAML files:

```yaml
id: install-docker
name: Install Docker
category: containers
os: [debian, redhat]
priority: 10

params:
  - id: compose
    type: boolean
    label: Install Docker Compose
    default: "true"

scripts:
  debian: |
    curl -fsSL https://get.docker.com | sh
    log_success "Docker installed"
```

The `{{param_id}}` placeholders are replaced with the values you enter. This is plain string substitution — the target audience understands bash, so complex logic belongs in the bash code itself.

Some skills are repeatable (like "Create User"), meaning you can add multiple instances with different parameters. Others (like "Set Hostname") appear at most once.

The generated script includes logging helpers, error handling, OS detection, and a root check.

## A note on parameter substitution

Parameter values are substituted directly into the bash script without escaping. This is intentional. It allows advanced patterns like command substitution when you know what you're doing. The generated script is meant to be reviewed before running — this is a tool for people who understand bash, not a black box.

## Data storage

Everything is stored locally in your browser (IndexedDB). Nothing is sent anywhere unless you enable sync. The optional sync feature uses end-to-end encryption — the server stores only encrypted blobs it cannot read.

## Project structure

```
src/core/       — script generation, YAML parsing
src/store/      — state management (Zustand)
src/features/   — UI components by feature
src/skills/     — built-in skill definitions
sync-server/    — optional encrypted sync server
```

Tech stack: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand.

## Contributing

See `AGENT.md` for development guidelines. The short version: keep it simple, everything is a skill, and run `npm run build` before committing.

## License

MIT
