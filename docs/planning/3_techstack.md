# Zenith — Tech stack

**Language:** English (consistent with all files under `docs/planning/`).

This document expands the **core tech stack** from [1_overview.md](./1_overview.md): concrete choices, how components connect, trade-offs (gRPC vs REST, RabbitMQ vs Kafka), and **what exists today** in `zenith-backend`. It is planning guidance until superseded by ADRs or locked runbooks. For feature lists and use-case diagrams (current vs planned), see [2_features.md](./2_features.md). For Nest module layout, library boundaries, and extraction order, see [4_backend_architecture.md](./4_backend_architecture.md).

### How to use the planning set

1. Read **overview** for _why_ services exist and how they interact at a business and traffic level.
2. Read **tech stack** (this file) for _what_ technologies apply, including pinned workspace facts and future options.
3. Read **features** when you need an accurate picture of what is shipped vs planned, including use-case diagrams, before refactoring or splitting apps.
4. Read **backend architecture** when structuring Nest apps, designing `libs/*`, or planning a second deployable.

---

## 1. Backend platform

### 1.1 NestJS and Node.js

- **Why NestJS:** Clear module boundaries (`@Module`), dependency injection, interceptors/guards/pipes for cross-cutting auth and validation, and a path to `@nestjs/microservices` (TCP, Redis, RabbitMQ, Kafka, gRPC) when services split out.
- **Runtime:** Target **Active LTS** Node.js for production images; keep dev and CI on the same major line to avoid native-addon surprises.
- **API styles:** Public HTTP (REST or GraphQL) at the edge; **gRPC** inside the cluster for typed, high-throughput internal calls. Avoid exposing raw gRPC to browsers.

### 1.2 TypeScript

Shared **DTOs**, **domain types**, and **event envelope** shapes live in Nx **libraries** (`libs/*`) versioned with the monorepo so multiple apps compile against one source of truth. Prefer **strict** compiler options for new code.

### 1.3 Nx monorepo

- **Workspace:** `@zenith-backend/source` (see root `package.json`).
- **Nx version:** **22.7.1** (pinned in `package.json`); plugins include `@nx/nest`, `@nx/node`, `@nx/webpack`, `@nx/js`, `@nx/eslint`.
- **Patterns:** One deployable per **app** (`apps/<name>`); reusable code in **libs** with tags (e.g. `scope:catalog`, `type:data-access`) once you introduce tagging policy.
- **Commands:** Prefer `nx run`, `nx run-many`, `nx affected` (per workspace `AGENTS.md`) for build/lint/test.

### 1.4 Current repository snapshot (authoritative minimal facts)

| Item                   | Detail                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| **Application**        | `bff` — NestJS app under `apps/bff/`.                                    |
| **HTTP prefix**        | Global prefix `api` (see `apps/bff/src/main.ts`).                        |
| **Default port**       | `process.env.PORT` or **3000**.                                          |
| **NestJS**             | **^11** (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`).  |
| **Build**              | Webpack via `nx:run-commands` + `webpack-cli` (`apps/bff/project.json`). |
| **Other runtime deps** | `axios`, `rxjs`, `reflect-metadata`.                                     |

Everything below is **target architecture** unless you add the dependency and wire it in an app.

### 1.5 Pinned toolchain (from root `package.json`)

Versions drift over time; this table reflects the **planning baseline**—refresh when upgrading.

| Package / area                                                                                                 | Pinned / range           | Role                                      |
| -------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| `nx`                                                                                                           | **22.7.1**               | Monorepo orchestration, graph, executors. |
| `@nx/nest`, `@nx/node`, `@nx/webpack`, `@nx/js`, `@nx/eslint`, `@nx/eslint-plugin`, `@nx/web`, `@nx/workspace` | **22.7.1**               | Nx plugins aligned with core.             |
| `typescript`                                                                                                   | **~5.9.2**               | Language and build-time types.            |
| `@nestjs/*` (runtime)                                                                                          | **^11.0.0**              | HTTP server, DI, modules.                 |
| `@nestjs/testing`, `@nestjs/schematics`                                                                        | **^11**                  | Tests and code generation.                |
| `eslint`                                                                                                       | **^9.8.0**               | Linting.                                  |
| `typescript-eslint`                                                                                            | **^8.40.0**              | Type-aware ESLint rules.                  |
| `prettier`                                                                                                     | **~3.6.2**               | Formatting.                               |
| `webpack-cli`                                                                                                  | **^5.1.4**               | Production bundle for `bff`.              |
| `@types/node`                                                                                                  | **20.19.9**              | Node typings in TS.                       |
| `@swc/core`, `@swc-node/register`                                                                              | **~1.15.5**, **~1.11.1** | Fast transpilation where configured.      |

**Node.js runtime:** align production images with **Active LTS**; `@types/node` 20.x implies targeting Node 20 API surface unless you bump types deliberately.

---

## 2. Frontend (ecosystem)

### 2.1 Next.js

- **SSR / PPR / caching:** Use server rendering for SEO-heavy catalog pages; cache stable fragments where product requirements allow; keep personalized playback UI client-driven where it reduces TTFB complexity.
- **BFF alignment:** Route handlers or server actions can aggregate multiple backend calls with a single cookie/session model so the browser never holds service-to-service tokens.

### 2.2 Tailwind CSS

Utility-first styling for responsive grids, typography, and player-adjacent UI. Align **design tokens** (spacing, radii) with marketing and accessibility targets (contrast, focus rings, reduced motion).

### 2.3 Repository note

A production **Next.js** app may live outside this repo; contracts (OpenAPI, GraphQL schema, or shared types package) should still be owned or consumed explicitly to prevent drift.

---

## 3. Inter-service communication

### 3.1 gRPC (internal)

| Topic                      | Practice                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Contracts**              | `.proto` files in a shared lib; generate TS stubs in CI or on demand.                                       |
| **Evolution**              | Field addition = backward compatible; renames require careful rollout (new field + dual write/read period). |
| **Resilience**             | **Deadlines** on every call; propagate **cancellation**; bounded channel concurrency on servers.            |
| **AuthN between services** | JWT in metadata, mTLS, or mesh identity—pick one model per environment and document it.                     |

### 3.2 RabbitMQ vs Kafka (events)

| Dimension                  | **RabbitMQ**                                                               | **Kafka**                                                                                 |
| -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Mental model**           | Queues, exchanges, routing keys; great **job queues** and **task workers** | Durable **log** of facts; multiple independent consumer groups replaying history          |
| **Throughput / retention** | Messages consumed and acked; retention is not the primary strength         | High throughput; configurable retention for replay and analytics                          |
| **Ordering**               | Per-queue ordering                                                         | Per-partition ordering (partition key design matters)                                     |
| **Good Zenith fits**       | Transcode job dispatch, email/webhook side effects                         | **Insight** pipelines, event sourcing–friendly audit trails, high-volume playback beacons |

You may run **both**: Rabbit (or Redis Streams) for command-like jobs and Kafka for analytics-shaped firehose.

### 3.3 When to use what

- **Synchronous:** user waiting on screen → HTTP through gateway, or internal gRPC with strict timeouts.
- **Asynchronous:** transcoding, search index rebuilds, sending analytics, sending notifications → events or job queues with **idempotency keys**.

---

## 4. Data layer (database-per-service)

### 4.1 PostgreSQL (transactional services)

- **Ownership:** identity, subscriptions, anything involving money-like invariants.
- **Migrations:** one migration stream **per service** (never a global shared migration folder across ownership boundaries).
- **ORM/driver:** Nest commonly pairs with **Prisma**, **TypeORM**, **Drizzle**, or **node-pg**—choose per service and record an ADR; do not mix two ORMs in one bounded context without reason.

### 4.2 MongoDB (catalog-like metadata)

- **Modeling:** favor explicit schemas (Mongoose, Zod at boundary, or JSON Schema) to avoid silent shape drift.
- **Indexes:** design for top queries (slug lookup, list by genre + sort, text search if not delegated to Elasticsearch/OpenSearch).
- **Operational hooks:** TTL collections for ephemeral promo metadata; **change streams** if another service needs near-real-time sync (still prefer events out of the owning service when possible).

### 4.3 Redis (speed layer)

| Use                          | Notes                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------- |
| **Session / device binding** | Short TTL; refresh rotation coordinated with Identity.                           |
| **Rate limiting**            | Token bucket per IP/user/API key at gateway edge.                                |
| **Cache**                    | Cache-aside with explicit TTLs; stampede protection for hot keys (singleflight). |
| **Coordination**             | Locks sparingly; prefer lease patterns and short TTLs.                           |

**Redis is not** the source of truth for billing or permanent entitlements—always have a recovery path from PostgreSQL (or the owning store).

### 4.4 Cross-service reads

Prefer **CQRS-style read models** or **gateway aggregation** over synchronous chains of six gRPC calls per page load. Push denormalized fragments via events when read latency dominates.

---

## 5. Media pipeline and object storage

### 5.1 Ingest

- Client uploads to **presigned PUT** URLs (gateway never streams full movie through app memory for large files).
- Virus scanning / MIME validation policy is environment-specific; call it out in runbooks when introduced.

### 5.2 FFmpeg / transcode workers

Typical stages: **demux** → **decode** → **scale** → **encode ladder** → **package** (HLS/DASH) → **upload segments** → publish **TranscodeCompleted** with manifest URL and checksum metadata.

Workers should be **horizontally scaled** with **concurrency limits** per node so CPU/RAM stay predictable; use **Kubernetes Jobs** or a dedicated worker pool.

### 5.3 Object storage (S3 / MinIO)

- Buckets: separate **masters**, **renditions**, **public assets** (least privilege IAM).
- **Lifecycle rules** for incomplete multipart uploads and old renditions after re-transcode.
- **CDN** in front of rendition buckets for viewer segment fetches (cache keys include manifest generation).

---

## 6. Infrastructure and orchestration

### 6.1 Docker

Multi-stage images: **deps** → **build** → **runtime** (distroless or slim base). Run as **non-root**; read-only root filesystem where compatible.

### 6.2 Kubernetes (sketch)

- **Deployments** for stateless APIs; **HPAs** on CPU/RPS/custom metrics.
- **Probes:** `startupProbe` for slow Nest boot; `readinessProbe` that fails if critical deps (DB) are unreachable.
- **NetworkPolicy** (optional) to restrict east-west traffic to declared ports.

### 6.3 Local development

**Docker Compose** (or **Nx +** local infra) for PostgreSQL, Redis, MinIO, and optional message broker—keeps onboarding repeatable until a full shared dev cluster exists.

**Suggested compose services (planning checklist):**

| Service           | Port (example) | Used by                            |
| ----------------- | -------------- | ---------------------------------- |
| PostgreSQL        | 5432           | Identity, billing-adjacent apps.   |
| Redis             | 6379           | Sessions, rate limits, cache.      |
| MinIO (S3 API)    | 9000           | Upload/download integration tests. |
| RabbitMQ or Kafka | 5672 / 9092    | Event and job experiments.         |

Keep **secrets and bucket names** in `.env.example` with placeholders only; document required variables in the same PR that adds compose files.

### 6.4 CI and quality gates (target)

Until a pipeline file exists in-repo, treat this as the **intended** bar:

| Gate                   | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `nx affected -t lint`  | Fast feedback on style and obvious bugs.                                |
| `nx affected -t build` | Ensures Webpack/Nest bundles compile.                                   |
| `nx affected -t test`  | Once tests exist, run unit scope by default.                            |
| Dependency audit       | `npm audit` or OSV integration on schedule; block on criticals in main. |
| Lockfile committed     | Reproducible CI and deploys (`package-lock.json` or `pnpm-lock.yaml`).  |

Add **integration tests** (Testcontainers or shared dev services) per bounded context as databases arrive—not one giant suite for the whole monorepo unless runtime allows.

---

## 7. Cross-cutting platform concerns

### 7.1 API gateway

TLS termination, WAF integration (managed or self-hosted), request size limits, authentication, coarse authorization, request ID injection, and **CORS** policy for web clients.

### 7.2 Observability

- **Tracing:** OpenTelemetry SDK in Nest apps; export to Jaeger, Grafana Tempo, or vendor APM.
- **Logging:** Structured JSON (`level`, `message`, `trace_id`, `service`, `user_id` hashed if needed).
- **Metrics:** RED for APIs (rate, errors, duration); queue depth for transcoding.

### 7.3 Configuration and secrets

- **12-factor:** config via environment; secrets via vault/K8s secrets.
- Never commit `.env` with real secrets (root `.gitignore` should stay strict).

### 7.4 Testing strategy (lightweight standard)

- **Unit:** domain logic without I/O.
- **Integration:** DB/testcontainers per service CI job.
- **Contract:** consumer-driven tests for public HTTP and optionally for gRPC schemas.

---

## 8. Evolution: from today’s monorepo to the target

1. **Extract libraries** for shared protobufs, auth guards, and logging first.
2. **Add second Nest app** behind the same repo with its own DB migration path when a bounded context stabilizes.
3. **Introduce broker + one event** (e.g. `MediaIngested`) before scaling event complexity.
4. **Split deployables** when scaling, blast radius, or team ownership demands it—Nx graph helps plan safe moves.

When a choice becomes normative (e.g. “Kafka for all analytics”), capture it in an **ADR** next to these planning docs (see suggested index in [4_backend_architecture.md](./4_backend_architecture.md) §8).

---

## 9. Related documents

- [1_overview.md](./1_overview.md) — vision, services, events, topology.
- [2_features.md](./2_features.md) — features, diagrams, roadmap phases.
- [4_backend_architecture.md](./4_backend_architecture.md) — Nest/Nx structure and extraction order.
