# Roadmap

Things that might be added in the future. No promises, no timelines.

## Vault encryption

Local data encryption using a password. PBKDF2 for key derivation, AES-GCM for encryption. The password never leaves the browser — only derived keys are used.

This is a prerequisite for sync, since we don't want to send unencrypted data anywhere.

## Sync

Encrypted backup to a simple server. The sync server is already scaffolded in `sync-server/` — it's a minimal key-value store that holds encrypted blobs. The server cannot read the data.

The auth token is derived from the password (separate from the encryption key), so the server never sees the password either.

## AI agent

A chat interface that picks skills and fills parameters based on natural language. The important constraint: the agent uses the same Zustand store actions as the UI. No special "AI mode" — just another way to manipulate the same state.

Possible use cases:
- "Set up a server for a Node.js app with Nginx reverse proxy"
- "Create a skill for installing PostgreSQL 16"

## One-time script links

Generate a URL that serves the script once, then expires. Useful for `curl | bash` workflows where you want the link to self-destruct after use. Requires the sync server.

## Community skill registry

A shared repository of skills that people can browse and install. Probably just a GitHub repo with an index file, rather than a separate service.

## More built-in skills

The current set covers basics. Could add: PostgreSQL, MySQL, Redis, Certbot/Let's Encrypt, swap file, sysctl tuning, log rotation, and so on.
