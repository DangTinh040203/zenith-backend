# Zenith Backend — Features and Use Cases

**Language:** English (consistent with all files under `docs/planning/`).

This document catalogs **features**: observable capabilities from a product or operator perspective. It separates what the **`zenith-backend` repository implements today** from the **target Zenith platform** described in [1_overview.md](./1_overview.md). For dependency versions and infrastructure choices, see [3_techstack.md](./3_techstack.md).

---

## 1. How to read this document

| Layer                              | Content                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **§2 — Implemented today**         | Features backed by code in this repo (minimal BFF, Nx workspace, agent tooling).                                                     |
| **§3 — Planned platform features** | End-state capabilities aligned with the microservice catalog in the overview; not yet implemented as separate services in this tree. |
| **§4 — Traceability**              | Maps features to repositories / apps when known.                                                                                     |
| **§5 — Roadmap phases**            | Suggested delivery order from current monorepo to multi-service platform.                                                            |
| **§6 — Related documents**         | Links to overview, tech stack, and backend architecture docs.                                                                        |

Use case diagrams use [Mermaid](https://mermaid.js.org/) `flowchart` notation (widely supported in GitHub, GitLab, and VS Code). Actors use `((Name))`; use cases use `[Label]`; the BFF box groups current runtime scope.

---

## 2. Implemented features (this repository)

These capabilities exist in **`zenith-backend`** as of the planning baseline.

### 2.1 Runtime — BFF HTTP API (`apps/bff`)

| ID           | Feature                         | Description                                                                                                   | Primary surface                       |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **F-BFF-01** | **Versioned global API prefix** | HTTP routes are mounted under `/api/v1` by default (`API_PREFIX` + `API_VERSION`).                            | `main.ts`.                            |
| **F-BFF-02** | **Configurable listen port**    | Server binds to `PORT` from environment.                                                                      | `main.ts`.                            |
| **F-BFF-03** | **Sample JSON endpoint**        | `GET /api/v1` returns `{ "message": "Hello API" }` for smoke checks and scaffolding verification.             | `AppController` → `AppService`.       |
| **F-BFF-04** | **NestJS bootstrap**            | Application starts via `NestFactory.create(AppModule)` with raw body support for signed webhooks.             | `main.ts`, `AppModule`.               |
| **F-BFF-05** | **Clerk webhook ingress**       | `POST /api/v1/webhooks/clerk` verifies Svix signatures and accepts Clerk sign-up events only through the BFF. | `ClerkWebhookGuard`, `AppController`. |
| **F-BFF-06** | **User-service TCP proxy**      | BFF calls `user-service` over Nest TCP for user listing and verified Clerk webhook projection.                | `AppService`, `libs/user/contracts`.  |

**Non-features (explicit gaps):** end-user route authentication, authorization, file upload, transcoding, catalog, playback state, analytics, OpenAPI, and rate limiting are **not** implemented in the Nest app yet.

### 2.1a Runtime — User service (`apps/user-service`)

| ID            | Feature                       | Description                                                                                                     | Primary surface                      |
| ------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **F-USER-01** | **Nest TCP user listing**     | Handles `users.list` for BFF aggregation.                                                                       | `UserTcpController`, `UserService`.  |
| **F-USER-02** | **Clerk projection over TCP** | Handles verified BFF events via `users.clerk-webhook.process` and creates users from `user.created`.            | `ClerkWebhookService`, strategy.     |
| **F-USER-03** | **Postgres user persistence** | Stores users, roles, and role links with TypeORM entities and a migration stream.                               | `TypeormUserRepository`, migrations. |
| **F-USER-04** | **Redis user profile cache**  | Caches user profiles by internal id and Clerk id after Postgres upsert succeeds.                                | `RedisUserCacheService`.             |
| **F-USER-05** | **Shared contracts**          | BFF and user-service share Clerk webhook types, user DTOs, and TCP pattern names through `libs/user/contracts`. | Nx library.                          |

### 2.5 Current HTTP contract

| Method + path                 | Response                                                                        | Purpose                                                   |
| ----------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `GET /api/v1`                 | `{ "message": "Hello API" }`                                                    | Verify build, port, and global prefix in CI or local dev. |
| `POST /api/v1/webhooks/clerk` | `{ "received": true }` after valid Svix signature and downstream TCP processing | Clerk `user.created` webhook ingress.                     |

User-service HTTP is not the Clerk ingress surface; browser and webhook traffic should enter through BFF.

### 2.6 Local verification (developer)

| Step | Command / action                       | Expected                                                                     |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | `pnpm nx serve bff`                    | Log line with `http://localhost:3000/api/v1` (or configured prefix/version). |
| 2    | `curl -s http://localhost:3000/api/v1` | JSON body with `Hello API`.                                                  |

Adjust commands if `AGENTS.md` or root scripts define a preferred alias.

### 2.2 Engineering — Nx monorepo

| ID          | Feature                   | Description                                                                                                             |
| ----------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **F-NX-01** | **Graph-aware workspace** | Nx **22.7.1** workspace `@zenith-backend/source` with Nest and Webpack plugins.                                         |
| **F-NX-02** | **Build and serve `bff`** | Targets `build` (Webpack production bundle) and `serve` (`@nx/js:node` after build) defined in `apps/bff/project.json`. |
| **F-NX-03** | **Generator defaults**    | `@nx/nest:application` and `@nx/node:application` default `unitTestRunner` and `e2eTestRunner` to `none` in `nx.json`.  |
| **F-NX-04** | **Lint graph**            | ESLint plugin integration for projects (flat config at repo and app level).                                             |

### 2.3 Tooling — Agent skills (`.agents/skills/`)

| ID          | Feature                           | Description                                                                                                                                 |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **F-AG-01** | **Nest best-practices doc build** | `nestjs-best-practices/scripts/build-agents.ts` aggregates Markdown rules into a single `AGENTS.md` for LLM/agent guidance.                 |
| **F-AG-02** | **CI state transitions**          | `monitor-ci/scripts/ci-state-update.mjs` implements `gate`, `post-action`, and `cycle-check` commands with JSON stdout for hook automation. |
| **F-AG-03** | **CI poll decision engine**       | `monitor-ci/scripts/ci-poll-decide.mjs` classifies CI/self-heal state into `poll`, `wait`, or `done` actions with backoff and messages.     |

These scripts support **developer workflow** and **CI monitoring**; they are not user-facing product APIs.

### 2.4 Use case diagram — current repository scope

Actors: **HTTP client** (any consumer of the API), **developer** (runs Nx and scripts).

```mermaid
flowchart TB
  subgraph actors["Actors"]
    HTTP([HTTP client])
    DEV((Developer))
  end

  subgraph bff["zenith-backend: apps/bff"]
    UC1[F-BFF-03: GET sample JSON at /api]
    UC2[F-BFF-01–02: API prefix and port]
  end

  subgraph nx["zenith-backend: Nx workspace"]
    UC3[F-NX-02: build / serve bff]
    UC4[F-NX-01 / F-NX-03 / F-NX-04: graph, generators, lint]
  end

  subgraph agents["zenith-backend: .agents/skills"]
    UC5[F-AG-01: build Nest AGENTS.md]
    UC6[F-AG-02: CI state update]
    UC7[F-AG-03: CI poll decision]
  end

  HTTP --> UC1
  HTTP --> UC2
  DEV --> UC3
  DEV --> UC4
  DEV --> UC5
  DEV --> UC6
  DEV --> UC7
```

---

## 3. Planned platform features (target ecosystem)

These features match the **Zenith** vision in [1_overview.md](./1_overview.md). They are **roadmap** items; most are **not** present as Nest modules in `zenith-backend` yet. When an capability lands in code, add it to **§2** and keep a short pointer here.

### 3.1 By service (capability matrix)

| Service                | Feature themes (use-case level)                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity**           | Register and sign-in; token issue and validation; profiles; tenant/org boundaries; token consumption by gateway and services.                   |
| **Catalog**            | Browse and search library; titles, seasons/episodes, categories; artwork and metadata; integration with search index updates via events.        |
| **Transcoding engine** | Ingest masters; FFmpeg-based ladder and packaging (HLS/DASH); thumbnails; emit **transcode completed**; scale workers with queue back-pressure. |
| **Playback**           | Entitlement checks; playback session; resume across devices; hot state and durable progress (design-dependent).                                 |
| **Insight**            | Ingest engagement events; aggregate for BI; export or stream to warehouse/OLAP (optional).                                                      |

### 3.1a Identity — planned capability detail

| Capability            | User / system value       | Dependencies               | Data owned                               |
| --------------------- | ------------------------- | -------------------------- | ---------------------------------------- |
| Sign-up / login       | Account lifecycle         | Email/SMS or OIDC provider | PostgreSQL (users, credentials metadata) |
| JWT / session issue   | Stateless auth at gateway | Signing keys, rotation job | Key material in secrets manager          |
| Profile & device list | Multi-device UX           | None critical for MVP      | User profile rows                        |
| Org / tenant          | B2B or household plans    | Billing events (later)     | Tenant membership tables                 |

**Acceptance hints:** token validation p95 within gateway budget; lockout and rate limits on credential endpoints; audit log for admin actions.

### 3.1b Catalog — planned capability detail

| Capability  | User / system value   | Dependencies                             | Data owned                                 |
| ----------- | --------------------- | ---------------------------------------- | ------------------------------------------ |
| Title CRUD  | Editorial workflows   | Object storage for artwork keys          | MongoDB documents per title/season/episode |
| Browse APIs | Home screen, rails    | Read models or aggregation               | Cached lists in Redis optional             |
| Search      | Query by text/filters | Search index worker (OpenSearch/Elastic) | Index is a projection, not source of truth |

**Acceptance hints:** read-heavy endpoints documented with pagination; slug uniqueness per tenant; event emitted on publish so Playback can refresh availability.

### 3.1c Transcoding — planned capability detail

| Capability       | User / system value | Dependencies                   | Data owned                            |
| ---------------- | ------------------- | ------------------------------ | ------------------------------------- |
| Job enqueue      | Durable processing  | Queue (Rabbit/Redis/SQS-style) | Job state store or idempotent logs    |
| Ladder + package | Adaptive playback   | FFmpeg, GPU optional           | Rendition keys in object storage      |
| Thumbnails       | UI grids            | Image pipeline                 | Small objects + references in Catalog |

**Acceptance hints:** job idempotency on duplicate events; visible progress or status endpoint for operators; failure taxonomy (corrupt source, unsupported codec).

### 3.1d Playback — planned capability detail

| Capability           | User / system value       | Dependencies                      | Data owned                 |
| -------------------- | ------------------------- | --------------------------------- | -------------------------- |
| Entitlement check    | Prevent unauthorized play | Identity/subscription projections | Rules + cached decisions   |
| Manifest / URL issue | Start playback            | Catalog + CDN                     | Short-lived tokens or URLs |
| Resume               | Cross-device continuity   | Durable progress store            | Progress rows or key-value |

**Acceptance hints:** strict timeouts on dependency calls; degrade gracefully (for example stale catalog snippet) when non-critical enrichments fail.

### 3.1e Insight — planned capability detail

| Capability   | User / system value | Dependencies              | Data owned                |
| ------------ | ------------------- | ------------------------- | ------------------------- |
| Event ingest | Product analytics   | Kafka or equivalent       | Append-only topic         |
| Rollups      | Dashboards          | Stream processor or batch | OLAP / warehouse optional |

**Acceptance hints:** schema evolution for events; PII hashing; sampling for ultra-high-volume signals.

### 3.2 Cross-cutting platform features

| ID          | Feature                     | Notes                                                                              |
| ----------- | --------------------------- | ---------------------------------------------------------------------------------- |
| **F-PF-01** | **API gateway**             | TLS, routing, authn, coarse authz, rate limiting, request IDs.                     |
| **F-PF-02** | **BFF / aggregation**       | Tailored APIs for Next.js clients without exposing every internal RPC.             |
| **F-PF-03** | **Saga-style coordination** | Distributed workflows (e.g. subscription → entitlement) with idempotent consumers. |
| **F-PF-04** | **Resilience**              | Timeouts, circuit breaking, bulkheads, controlled degradation.                     |
| **F-PF-05** | **Observability**           | Traces, structured logs, RED/USE metrics for SLOs.                                 |
| **F-PF-06** | **Media pipeline**          | Presigned upload, object storage, CDN-oriented segment delivery.                   |

### 3.3 Use case diagram — target product (high level)

```mermaid
flowchart TB
  subgraph actors["Actors"]
    V((Viewer))
    O((Content operator))
    B((Business / data))
  end

  subgraph gateway["API gateway & BFF (planned)"]
    UC_GW[F-PF-01 / F-PF-02: route, auth, aggregate]
  end

  subgraph identity["Identity (planned)"]
    UC_I1[Authenticate]
    UC_I2[Manage profile / tenant]
  end

  subgraph catalog["Catalog (planned)"]
    UC_C1[Browse / search library]
    UC_C2[Manage metadata]
  end

  subgraph transcode["Transcoding engine (planned)"]
    UC_T1[Process upload / transcode job]
    UC_T2[Publish renditions & events]
  end

  subgraph playback["Playback (planned)"]
    UC_P1[Check entitlement & play]
    UC_P2[Resume across devices]
  end

  subgraph insight["Insight (planned)"]
    UC_N1[Record engagement events]
    UC_N2[Aggregate for analytics]
  end

  V --> UC_GW
  O --> UC_GW
  B --> UC_GW

  UC_GW --> UC_I1
  UC_GW --> UC_C1
  UC_GW --> UC_P1
  UC_GW --> UC_N1

  O --> UC_C2
  O --> UC_T1
  UC_T1 --> UC_T2
  UC_P1 --> UC_I1
  UC_P2 --> UC_P1
  UC_N2 --> UC_N1
```

**Diagram notes:** arrows show primary **dependencies** (who invokes whom at a conceptual level), not every event flow. Upload orchestration and async events (for example **UploadReceived** → transcoding → catalog update) are simplified into **Transcoding** and **Catalog** boundaries; see request paths in [1_overview.md](./1_overview.md) §3.2.

### 3.4 Use case diagram — playback read path (conceptual)

```mermaid
flowchart LR
  V((Viewer))
  GW[API gateway]
  PB[Playback service]
  ID[Identity]
  CDN[CDN / signed URLs]

  V -->|watch| GW
  GW -->|validate + entitle| PB
  PB -->|token / claims| ID
  PB -->|manifest / segments| CDN
```

### 3.5 Use case diagram — upload / transcode write path (conceptual)

```mermaid
flowchart LR
  O((Operator))
  GW[API gateway]
  ST[Object storage]
  TR[Transcoding engine]
  CAT[Catalog]

  O -->|presigned upload| GW
  GW --> ST
  ST -->|event: ingest| TR
  TR -->|event: ready| CAT
```

### 3.6 Failure and degradation (product-level)

| Scenario                          | Desired behavior                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| Catalog read slow                 | Gateway may serve cached home rails; avoid blocking playback if entitlements already valid. |
| Transcode backlog high            | UI shows delayed availability; do not block unrelated browse paths.                         |
| Identity token introspection down | Fail closed for protected routes; return stable error codes for client retry/backoff.       |
| Insight pipeline lag              | Playback and catalog remain available; analytics catch up later.                            |

---

## 4. Traceability and maintenance

| When                                                                          | Action                                                                                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| New **user-visible** or **operator** capability ships in `apps/*` or `libs/*` | Add a row under **§2** with a stable feature ID (`F-BFF-xx` or service prefix); extend **§3** only if the roadmap wording changes.               |
| New **script-only** workflow                                                  | Add under **§2.3** and extend the diagram in **§2.4** if relationships change.                                                                   |
| Architecture rename (e.g. split BFF)                                          | Update diagrams in **§3**, roadmap in **§5**, and pointers here; keep [1_overview.md](./1_overview.md) as the source of truth for service names. |

**Code-level inventory** (every Nest module, method, and script function name) is intentionally **not** duplicated here; if the team needs that level of detail again, regenerate a dedicated “source inventory” doc or derive it from the codebase search in CI.

---

## 5. Roadmap phases (suggested)

Phases are planning aids—not fixed dates. Re-sequence when product priorities change.

| Phase                  | Goal                               | Typical deliverables in `zenith-backend`                                                              |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **0 — Baseline**       | Runnable monorepo + BFF smoke      | Current: Nx, Nest BFF, sample route (see §2).                                                         |
| **1 — Foundations**    | Shared libs, quality gates, config | ESLint/Prettier consistency, health module, structured logging, OpenAPI stub for BFF, `.env.example`. |
| **2 — Identity slice** | Auth for internal APIs             | JWT validation guard, test users, PostgreSQL app or module boundary—even if still single deployable.  |
| **3 — Read path MVP**  | Catalog read + playback stub       | Mongo or read-only API behind BFF; mock entitlements then real Identity integration.                  |
| **4 — Write path MVP** | Upload + transcode happy path      | Presigned URL flow, worker process, events to update catalog availability.                            |
| **5 — Hardening**      | SLOs, resilience, observability    | Tracing, metrics dashboards, circuit breakers, load tests on playback.                                |

When a phase completes, update this table and mirror the state in your issue tracker epics.

---

## 6. Related documents

- [1_overview.md](./1_overview.md) — vision, service catalog, data ownership, distributed patterns, event catalog.
- [3_techstack.md](./3_techstack.md) — stack, versions, and evolution from current monorepo to target.
- [4_backend_architecture.md](./4_backend_architecture.md) — Nest layering, libraries, and service split patterns.
