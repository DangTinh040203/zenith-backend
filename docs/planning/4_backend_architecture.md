# Zenith Backend — Application architecture (NestJS / Nx)

**Language:** English (consistent with all files under `docs/planning/`).

This document describes **how to structure code** inside `zenith-backend`: NestJS layering, Nx libraries, boundaries between the current BFF and future services, and safe patterns for synchronous and asynchronous integration. It complements [1_overview.md](./1_overview.md) (platform vision), [2_features.md](./2_features.md) (capabilities and roadmap), and [3_techstack.md](./3_techstack.md) (technology choices and pinned versions).

---

## 1. Purpose and scope

| In scope                                                           | Out of scope (covered elsewhere)                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Module and folder conventions for Nest apps                        | Detailed FFmpeg parameters or CDN vendor selection — see tech stack media section. |
| Where to place DTOs, domain logic, adapters                        | Front-end Next.js routing and SSR strategy.                                        |
| Order of extraction when adding services                           | Legal/compliance sign-off workflows.                                               |
| Outbox / idempotency **patterns** (not a specific library mandate) | Production incident response runbooks until written.                               |

---

## 2. Architectural goals

1. **Single ownership of writes:** each aggregate or bounded context persists through one application service entry point; avoid “any module updates any table.”
2. **Explicit boundaries:** `libs/*` expose **public APIs** (index files); avoid deep imports across feature folders.
3. **Testability:** domain logic runnable without Nest bootstrap where practical; I/O behind interfaces.
4. **Deployable growth:** today’s `apps/bff` may absorb several modules; later, **copy or move** a coherent subtree into `apps/catalog-api` (example) without rewriting domain rules if they already live in a library.
5. **Observable requests:** correlation id from edge through handlers; log context per request scope.

---

## 3. Layered structure (NestJS)

Use a **hexagonal / clean** bias inside each app or lib slice:

| Layer                     | Responsibility                                        | Nest artifacts                                          |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| **Interface / transport** | HTTP controllers, gRPC controllers, message handlers  | `*.controller.ts`, consumer classes                     |
| **Application**           | Use cases, orchestration, transactions                | `*.service.ts` (application services), command handlers |
| **Domain**                | Entities, value objects, domain services, invariants  | Plain TS classes/modules with **no** Nest decorators    |
| **Infrastructure**        | ORM repositories, HTTP clients, S3, broker publishers | `*.repository.ts`, adapters implementing domain ports   |

**Guards, pipes, interceptors** belong at the interface layer (cross-cutting). **Do not** call `HttpService` from domain entities.

---

## 4. Nx workspace layout (recommended evolution)

### 4.1 Apps

| App                   | Role today                                | Future note                                            |
| --------------------- | ----------------------------------------- | ------------------------------------------------------ |
| `apps/bff`            | Public or semi-public HTTP aggregation    | May remain BFF-only, or shrink as dedicated APIs grow. |
| `apps/*-api` (future) | One deployable per stable bounded context | Each with own Dockerfile, health checks, migrations.   |

### 4.2 Libraries (`libs/`)

Introduce libraries **before** splitting deployables. Example naming (adjust to taste):

| Library pattern                  | Contents                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `libs/shared/kernel`             | Logger interface, result types, base errors, correlation id utilities.                          |
| `libs/identity/contracts`        | DTOs and validation schemas shared with BFF (no framework imports in domain types if possible). |
| `libs/catalog/data-access`       | Repository implementations; depends on Mongo driver or ORM.                                     |
| `libs/media/transcode-contracts` | Event payload types and version constants.                                                      |

### 4.3 Nx tags (enforcement)

Define tags in `eslint.config` / Nx rules when the workspace grows, for example:

- `scope:identity`, `scope:catalog`, `scope:media`, `scope:shared`
- `type:feature`, `type:data-access`, `type:util`

**Dependency rule of thumb:** `type:feature` may depend on `type:data-access` and `type:util`, but not vice versa. `scope:catalog` must not import `scope:identity` internals—only **published contracts** from a `contracts` lib.

---

## 5. BFF vs domain services

| Concern         | BFF (`apps/bff` or dedicated BFF app)     | Domain service (e.g. Catalog API)            |
| --------------- | ----------------------------------------- | -------------------------------------------- |
| **Audience**    | Web or mobile client shapes               | Internal + gateway; stable domain API        |
| **Aggregation** | Combines multiple backends for one screen | Avoid arbitrary cross-domain joins           |
| **Auth**        | Cookie/session translation, CSRF policy   | Service-to-service auth, fine-grained checks |
| **Caching**     | Response caching tailored to UI           | Cache owned data only                        |

The **first** split is often “BFF stays thin, extract Catalog or Identity as separate Nest app” rather than cloning the entire monolith.

---

## 6. Synchronous integration

| Pattern                    | When to use                                     | Pitfalls                                                                    |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| **HTTP (REST)**            | Public APIs, third-party callbacks              | Version URLs; document errors with stable codes.                            |
| **gRPC**                   | Low-latency internal calls with generated stubs | Deadlines required; proto compatibility discipline.                         |
| **Direct in-process call** | Same Node process, same deployable              | Do not bypass module boundaries—import application service, not repository. |

Always propagate **cancellation** and **timeouts** from controllers into downstream calls.

---

## 7. Asynchronous integration

| Pattern                  | When to use                                       | Notes                                                                                           |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Transactional outbox** | Must not lose events when DB commit succeeds      | Poll or relay outbox table to broker; industry standard for dual-write safety.                  |
| **Idempotent consumers** | At-least-once delivery                            | Store `eventId` or business idempotency key in processed table.                                 |
| **Sagas**                | Multi-step workflows (subscription → entitlement) | Prefer clear state machines; compensations documented in [1_overview.md](./1_overview.md) §4.2. |

Avoid publishing to a broker **before** the owning service’s database transaction commits unless using a proven atomic pattern.

---

## 8. ADR index (suggested)

Create `docs/planning/adr/` and number sequentially. Seed topics:

| ID       | Title (suggested)                                        |
| -------- | -------------------------------------------------------- |
| ADR-0001 | Message broker choice (RabbitMQ vs Kafka vs both)        |
| ADR-0002 | ORM per service (Prisma vs TypeORM vs Drizzle)           |
| ADR-0003 | Playback token model (JWT vs CDN signed URLs)            |
| ADR-0004 | Search stack (Mongo text vs OpenSearch)                  |
| ADR-0005 | Monorepo split triggers (when new `apps/*` is justified) |

Link each ADR from [1_overview.md](./1_overview.md) §8 when filed.

---

## 9. Checklist: adding a second Nest application

1. **Identify bounded context:** clear data ownership and minimal fan-in from other domains.
2. **Move domain + data-access libs** first; keep BFF calling in-process or HTTP until wire-up is stable.
3. **Add** `project.json`, Dockerfile, and **independent** migration folder for that app’s database.
4. **Wire** service discovery (K8s DNS) or explicit URLs via config; no hard-coded `localhost` in committed code paths.
5. **Define** health/readiness including dependency checks.
6. **Update** [2_features.md](./2_features.md) §2 and diagrams when the new app exposes user-visible behavior.

---

## 10. Related documents

- [1_overview.md](./1_overview.md) — microservice catalog, request paths, event catalog.
- [2_features.md](./2_features.md) — feature IDs, roadmap phases, diagrams.
- [3_techstack.md](./3_techstack.md) — versions, brokers, data stores, CI targets.
