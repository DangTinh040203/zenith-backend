<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Learned Workspace Facts

- `zenith-backend` is an Nx monorepo; the Nest entry app is `apps/bff` (Nest 11 baseline per `package.json`), using global route prefix `api` and default listen port from `PORT` or `3000`.
- `nx.json` sets generator defaults for `@nx/nest:application` and `@nx/node:application` so `unitTestRunner` and `e2eTestRunner` are `none`, avoiding generated unit and e2e projects for new apps.
- Product and architecture planning live under `zenith-backend/docs/planning/` (for example `1_overview.md` and `2_techstack.md`), describing the Zenith streaming microservices vision versus the current repo snapshot.
- Cursor agent skills for this backend are installed under `zenith-backend/.agents/skills/` with `skills-lock.json` recording sources; `.agents` is intended to be commit-visible for team sync (not listed in `.gitignore`).
