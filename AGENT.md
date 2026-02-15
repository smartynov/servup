# Development Guide

Rules for contributors and AI agents working on this codebase.

## Language

All code, comments, commit messages, and documentation must be in English. This includes variable names, function names, error messages, and inline comments.

## Before you write code

Read the README first. Understand what the project does and why. If you are about to introduce a new concept, stop and think whether it actually needs to exist.

## Core principles

**Everything is a skill.** Users, hostname, timezone, packages — all skills. Do not create new entity types. If you need something new, make it a skill.

**Skills do not talk to each other.** No data passing between skills, no dependency resolution. A skill is a bash snippet with parameters. The user controls the order.

**Front-only by default.** The app works without any backend. The sync server is optional and only stores encrypted blobs it cannot read.

**Simple over clever.** This tool is for sysadmins who understand bash. Do not add abstraction layers, form builders, or plugin frameworks. If something can be done with plain code, do not build a system for it.

**Minimalist code.** Write the least amount of code that solves the problem. Avoid premature abstractions. Three similar lines are better than a helper function you'll use once. Do not add features, comments, or error handling beyond what is needed right now.

## Before you commit

1. `npx tsc --noEmit` must pass
2. `npm run build` must succeed
3. Test the UI manually if you changed components
4. No unused imports, dead code, or commented-out code

## Code patterns

TypeScript strict mode. Avoid `any`.

React functional components with hooks. No class components.

Zustand for state. All mutations go through store actions.

shadcn/ui for components. Tailwind for styling. No other UI libraries.

Use the `cn()` utility for conditional class names, not string concatenation.

Small focused files. If a file grows past 200 lines, consider splitting.

Extract shared logic only when it is actually repeated in multiple places.

## Skill format

When writing skills:

- `id` is lowercase kebab-case
- Include both `scripts.debian` and `scripts.redhat` where applicable
- Bash code should be idempotent (safe to run multiple times)
- Use `log_info`, `log_success`, `log_error` for output
- Parameter placeholders use `{{param_id}}` syntax — plain string substitution
- Test the generated bash on a throwaway server or VM

## Project structure

```
src/core/       — pure logic, no React, no side effects
src/store/      — Zustand slices, state mutations
src/features/   — React components by feature
src/components/ — shared UI components (shadcn)
src/skills/     — built-in YAML skill files
src/lib/        — utilities
```

Business logic goes in `core/` or `store/`, not in components.

## Git workflow

Main branch is protected. All changes go through feature branches and pull requests.

PR triggers typecheck and build. Merge to main triggers Docker build. Version tags trigger releases.

Write commit messages that explain why, not just what.

## Agent checklist

Before considering a task complete:

1. Run `npm run build` and confirm no errors
2. Test the affected features manually if you changed UI
3. Commit with a clear message explaining why
4. Check if README or other docs need updates after significant changes
