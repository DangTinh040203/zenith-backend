# Zenith Backend Agent Guide

These instructions apply to the entire `zenith-backend` workspace. Keep this
file concise and operational; detailed product and architecture rationale lives
under `docs/planning/`.

## Source of Truth

- Use `README.md` for the project overview and links into the planning set.
- Use `docs/planning/3_techstack.md` for pinned stack facts, local-development
  posture, auth direction, and CI expectations.
- Use `docs/planning/4_backend_architecture.md` before changing Nest module
  boundaries, extracting libraries, adding apps, or changing service
  communication.
- Planning docs are written in English. If an implementation change makes the
  planning docs stale, update the relevant doc in the same change.

## Workspace Facts

- Package manager: `pnpm` (`pnpm-lock.yaml` is committed). Prefix Nx commands
  with `pnpm`.
- Current Nx projects: `bff` and `user-service`.
- Runtime stack: NestJS 11, TypeScript 5.9, Nx 22.7.1, Webpack builds.
- `apps/bff` is the browser-facing HTTP aggregation layer. It owns client
  shaping, CORS, request validation, and calls domain services.
- `apps/user-service` owns user/profile/subscription/entitlement concerns. It
  exposes Nest TCP for BFF RPC and Clerk webhook projection forwarded by BFF;
  it must not expose REST/HTTP APIs.
- Repo-level `libs/*` are planned for shared contracts and utilities. When a
  concept is reused across apps, extract it through Nx rather than deep-importing
  between app internals.

## Architecture Guardrails

- Prefer a clean/hexagonal shape inside each app or bounded context:
  presentation/transport -> application/use cases -> domain -> infrastructure.
- Keep domain code as plain TypeScript without Nest decorators, framework I/O,
  HTTP clients, or ORM calls.
- Put persistence, external clients, brokers, and framework adapters behind
  application-facing interfaces.
- Each service owns its datastore and migration stream. Do not introduce
  cross-service database joins or shared mutable tables.
- Use BFF aggregation or explicit read models for cross-service reads; avoid
  long synchronous call chains for one UI request.
- Authentication is delegated to Clerk. Do not implement custom password
  storage or login flows in this repo. Zenith-owned code handles authorization,
  entitlements, and idempotent Clerk webhook projection.
- Internal first-party RPC in this repo currently uses Nest TCP. Give message
  patterns stable names, timeouts, and DTOs that can move into `libs/*` when
  reused.
- Add a new Nest app only when the bounded context has clear ownership,
  datastore boundaries, deployment reason, and updated planning docs.

## Coding Conventions

- Treat clean code as the default: intention-revealing names, small functions
  with one responsibility, minimal hidden side effects, and no clever
  abstractions unless they remove real duplication or clarify a boundary.
- Avoid `any`. Do not replace it with broad `unknown` as an escape hatch; use
  `unknown` only at untrusted boundaries such as external payloads, parsing, or
  `catch` values, then narrow immediately with DTO validation, schemas, type
  guards, or assertion functions.
- Prefer precise DTOs, discriminated unions, generics with constraints, and
  `satisfies` over unsafe casts. Keep `as Type` localized and justified when it
  cannot be avoided.
- Use path aliases such as `@/...` inside `apps/**/src` and `libs/**/src`;
  relative imports are intentionally restricted by ESLint.
- Prefer `import type` for types and keep imports sorted by the existing ESLint
  rules.
- Validate request boundaries with DTOs/pipes and return stable error shapes.
- Keep configuration in environment-backed config modules. Never commit real
  secrets or generated `.env` files.
- Add focused tests when a test target exists or when introducing one. Check
  targets first: `pnpm nx show project <project> --json`.

## Common Commands

- Install dependencies: `pnpm install`
- Start local infra: `pnpm docker:setup`
- Serve all apps: `pnpm dev`
- Serve one app: `pnpm nx serve bff` or `pnpm nx serve user-service`
- Build one app: `pnpm nx run <project>:build`
- Lint one app: `pnpm nx run <project>:lint`
- Format check: `pnpm format:check`
- For changed work, prefer `pnpm nx affected -t lint build` when the affected
  graph is meaningful.

## Git and CI Safety

- The worktree may contain user changes. Do not revert, overwrite, or stage
  unrelated files.
- Stage explicit paths only when asked to commit; avoid broad `git add .` for
  normal code work.
- If the user asks to monitor CI, use the repository `monitor-ci` skill and the
  Nx Cloud flow in `.agents/`. Do not replace it with ad hoc watch loops.

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
