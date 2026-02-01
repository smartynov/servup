# Agent Development Guide

Rules for AI agents (and humans) working on this codebase.

## Before you write code

Read `SPEC.md` first. It explains not just what the app does, but why each design decision was made. If you are about to introduce a new concept that is not in the spec, stop and think about whether it actually needs to exist.

## Core principles

**Everything is a skill.** Do not create new entity types. Users, hostname, timezone, packages — they are all skills. If you need something new, make it a skill.

**Skills do not talk to each other.** No data passing, no dependency resolution, no inter-skill references. A skill is a bash snippet with parameters. The user controls the order. Keep it that way.

**Front-only by default.** The app must work without any backend. All core logic (generation, parsing, storage) runs in the browser. The sync server is optional and only stores encrypted blobs.

**Simple over clever.** This is a tool for people who understand bash and servers. Do not add abstraction layers, form builders, or plugin frameworks. If something can be done with a string replacement, do not build a template engine.

## Before you commit

1. **Type check:** `npx tsc --noEmit` must pass with zero errors
2. **Build:** `npm run build` must succeed
3. **Test the UI:** if you changed components, verify the app loads and basic flows work (create config, add skill, generate script)
4. **No unused code:** do not leave unused imports, dead functions, or commented-out code

## Code style

- TypeScript, strict mode. No `any` unless absolutely necessary.
- React functional components with hooks. No class components.
- Zustand for state. All mutations go through store actions — this is important for the future AI agent integration.
- shadcn/ui for UI components. Do not add new UI libraries without a good reason.
- Tailwind CSS for styling. No CSS modules, no styled-components.
- Keep files small and focused. One component per file. If a file grows past 200 lines, consider splitting.

## Skill YAML format

When creating or modifying built-in skills:

- `id` must be a lowercase kebab-case slug
- `scripts.debian` and `scripts.redhat` should both be present where applicable
- All bash code should be idempotent (safe to run multiple times)
- Use `log_info`, `log_success`, `log_error` for output (these are defined in the generated script header)
- Parameter placeholders use `{{param_id}}` syntax — plain string replacement, nothing more
- Test the generated bash mentally or on a throwaway server

## Project structure

```
src/core/       — pure logic, no React, no side effects
src/store/      — Zustand slices, all state mutations
src/features/   — React components, organized by feature
src/components/ — shared UI components (shadcn)
src/skills/     — built-in YAML skill files
src/lib/        — utilities, IndexedDB wrapper
```

Do not put React components in `core/`. Do not put business logic in components — use store actions instead.

## Git workflow

- **Main branch is protected.** Never commit directly to `main`. All changes go through feature branches and pull requests.
- Develop on a feature branch, push, create a PR
- PR check runs typecheck + build automatically
- Merge to main triggers Docker image build
- Version tags (`v1.0.0`) trigger releases with single-file HTML artifact

Write clear commit messages that explain why, not just what.

## Agent checklist

Before considering a task complete, the agent must:

1. **Verify the build works:** run `npm run build` (or `docker compose up --build` for full stack) and confirm no errors
2. **Test functionality:** launch the app (`npm run dev`) and verify the affected features work correctly
3. **Commit the changes:** create a descriptive commit with a clear message explaining the change
4. **Review documentation:** after significant changes, check if `README.md`, `SPEC.md`, or other docs need updates — if so, propose the updates to the user before making them

## Documentation

- **English only.** All documentation, comments, commit messages, and code must be written in English. No exceptions.
