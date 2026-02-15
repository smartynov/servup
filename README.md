# ServUp

A simple tool for generating server setup scripts.

## Why this exists

Even in the age of AI, Docker, Kubernetes, and serverless, I regularly find myself manually setting up servers. Usually virtual machines, each slightly different from the last. Install vim and docker, create users and add their SSH keys, close ports, configure sudo, and so on. The same routine with small variations every time.

Yes, there's cloud-init and Ansible and proper configuration management systems. Those are great when you're provisioning servers by the dozen, but in my life each server is a little different and I just want something simple and flexible. So I built this.

Now the workflow is: check the boxes for what I need, fill in a few parameters, and get a bash script I can run in one go. No dependencies to install on the target server, no YAML indentation puzzles, no learning curve. Just a script that does what I asked, and I can read every line of it before running.

The history is saved automatically, so any past configuration becomes a template for the next one. I suspect there are many people like me. Feedback and contributions are welcome.

## Getting started

**Option 1: Download and open**

Download the latest `servup.html` from [Releases](https://github.com/smartynov/servup/releases) and open it in your browser. That's it — everything is bundled into a single file that works offline.

**Option 2: Run with Docker**

```bash
docker run -p 8080:80 ghcr.io/smartynov/servup:latest
```

Open `http://localhost:8080` in your browser.

## Using ServUp

1. Click "New Configuration" to create a setup
2. Add the skills you need — each skill is a piece of bash that does one thing (install Docker, create a user, configure firewall, etc.)
3. Fill in the parameters where needed (usernames, SSH keys, ports, etc.)
4. Click "Generate" to get your bash script
5. Review the script, copy it, and run it on your server

Your configurations are saved automatically in the browser. Pin the ones you use often. Duplicate any configuration to use it as a template.

## How it works

Everything in ServUp is a "skill" — a small piece of bash that does one thing. Setting a hostname is a skill. Creating a user is a skill. Installing Docker is a skill.

Some skills are repeatable (like "Create User") — you can add multiple instances with different parameters. Others (like "Set Hostname") appear only once.

The generated script includes logging helpers, error handling, OS detection, and a root check. Parameter values are substituted directly into bash without escaping, which allows advanced patterns when you know what you're doing.

All data is stored locally in your browser. Nothing is sent anywhere unless you explicitly enable sync.

---

## For developers

### Building from source

```bash
git clone https://github.com/smartynov/servup.git
cd servup
npm install
npm run dev      # development server at localhost:5173
npm run build    # production build to dist/
```

### Single-file build

```bash
npm run build:single   # produces dist-single/index.html
```

### Docker with sync server

```bash
docker compose up      # frontend :8080, sync server :3001
```

### Creating skills

Skills are YAML files in `src/skills/`. Each skill defines parameters and bash scripts for Debian and RedHat systems:

```yaml
id: install-nginx
name: Install Nginx
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

Parameter placeholders `{{param_id}}` are replaced with user values. Use `log_info`, `log_success`, `log_error` for output — these are defined in the generated script header.

See `AGENT.md` for full development guidelines.

## License

MIT
