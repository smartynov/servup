# Roadmap

Things that might be added in the future. No promises, no timelines.

## Vault encryption

Local data encryption using a password. The scheme:

1. User sets a password (optional — without it, data is stored unencrypted locally)
2. PBKDF2 derives keys from password + random salt (100k iterations)
3. Data encrypted with AES-GCM before writing to IndexedDB
4. Salt stored in localStorage, derived key lives in sessionStorage (cleared on tab close)
5. On reload, if vault is enabled, show unlock screen

Password validation uses a checksum: we encrypt a known string and store it alongside the salt. On unlock attempt, we try to decrypt it — if it works, the password is correct.

This is a prerequisite for sync.

## Sync

Encrypted backup to a simple server. The sync server (already scaffolded in `sync-server/`) is a minimal key-value store that holds encrypted blobs.

The auth token is derived from the password separately from the encryption key, so the server never sees the password and cannot decrypt the data.

Push/pull encrypted configurations on demand or automatically.

## Self-decrypting script links

A URL that serves a script which asks for a password and decrypts itself. The flow:

1. User generates a "shareable link" for a configuration
2. The link returns a bash script with encrypted payload
3. When run, the script prompts for password, decrypts the payload, and executes it
4. Optional: link expires after first use or after N hours

This combines the convenience of `curl | bash` with the security of encryption. The server never sees the decrypted script.

## Configuration templates as files

Export a configuration as a `.servup` file (JSON or YAML) that can be shared, versioned in git, or sent to a colleague. Import by drag-and-drop or file picker.

This makes it easy to maintain "standard setups" in a repo alongside infrastructure code.

## AI agent

A chat interface that picks skills and fills parameters based on natural language. The important constraint: the agent uses the same Zustand store actions as the UI. No special mode — just another way to manipulate the same state.

Use cases:
- "Set up a server for a Node.js app with Nginx reverse proxy"
- "Create a skill for installing PostgreSQL 16"

## Community skill registry

A shared repository of skills that people can browse and install. Probably a GitHub repo with an index file pointing to skill YAML files, rather than a separate service.

## More built-in skills

Ideas for useful skills, roughly grouped:

**Security & access:**
- Configure firewall (UFW/firewalld) with convenient port selection — common presets (SSH only, web server, custom) plus individual port toggles
- Disable root SSH login
- Set up automatic security updates (unattended-upgrades on Debian, dnf-automatic on RHEL)
- Install and configure fail2ban with sensible defaults
- Configure SSH: change port, disable password auth, set allowed users

**Web & reverse proxy:**
- Install Caddy with automatic HTTPS
- Install Nginx with basic site config
- Set up Let's Encrypt with certbot
- Configure Nginx/Caddy as reverse proxy to a port

**Databases:**
- Install PostgreSQL (pick version)
- Install MySQL/MariaDB
- Install Redis
- Install MongoDB

**System tuning:**
- Disable swap (for Kubernetes nodes or when you have enough RAM)
- Configure swap file (create or resize)
- Sysctl tuning (network buffers, file limits, etc.)
- Set up log rotation
- Configure journald size limits

**Development tools:**
- Install nvm + specific Node.js version
- Install pyenv + specific Python version
- Install Go
- Install Rust

**Containers & orchestration:**
- Install Docker (already exists, but could expand)
- Install Docker Compose standalone
- Install k3s (lightweight Kubernetes)
- Install Podman

**Monitoring:**
- Install and configure node_exporter (Prometheus metrics)
- Install Netdata
- Set up basic healthcheck endpoint
