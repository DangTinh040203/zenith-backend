# Zenith — Advanced Microservices Video Streaming Ecosystem

**Planning folder (`docs/planning/`):** all planning documents are written in **English** and maintained as living references. Use this file for vision, service boundaries, and cross-cutting concerns; use companion docs for implementation inventory and stack detail.

| File                                                       | Purpose                                                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `1_overview.md` (this document)                            | Product vision, problem framing, service catalog, request paths, distributed patterns, events, topology, glossary.                        |
| [`2_features.md`](./2_features.md)                         | Product and engineering **features** (implemented vs planned), use-case diagrams, roadmap phases, and traceability to apps.               |
| [`3_techstack.md`](./3_techstack.md)                       | Technology choices, trade-offs, data and media strategy, pinned versions, CI/testing posture, and **repo snapshot** for `zenith-backend`. |
| [`4_backend_architecture.md`](./4_backend_architecture.md) | Nest/Nx layering, bounded-context packaging, sync/async integration patterns, and how to split deployables safely.                        |

## 1. Project overview

### 1.1 Vision

Zenith is a high-performance, cloud-native video streaming ecosystem built **microservices-first**. It targets the scale and operational complexity of large streaming platforms (for example Netflix-class concerns): many independent deployables, high read traffic on catalog and playback metadata, bursty write paths on uploads and transcodes, and strict expectations around availability and perceived playback quality.

### 1.2 Problems Zenith is designed to solve

| Domain               | Challenge                                                             | Direction                                                                                                                               |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Availability**     | Partial outages must not take down the entire product                 | Isolate failure domains per service; degrade gracefully (e.g., catalog fallback, playback without recommendations).                     |
| **Consistency**      | No single ACID database across “subscription + entitlement + catalog” | **Database-per-service**; coordinate with sagas and idempotent consumers; expose **eventually consistent** read models where UX allows. |
| **Media delivery**   | Large files, many formats, CDN-friendly packaging                     | Async **transcoding** pipeline; **segmented** adaptive streaming (HLS/DASH); object storage + CDN at the edge.                          |
| **Security & trust** | Tokens, tenant boundaries, abuse                                      | Central **identity**; gateway policy; short-lived credentials for playback URLs where applicable.                                       |

### 1.3 Scope boundaries (planning)

- **In scope:** backend services, APIs, events, data ownership, transcoding workflow, playback state, analytics ingestion, operational patterns (observability, resilience).
- **Out of scope for this backend repo alone:** full player UI implementation, DRM product contracts, and legal/compliance sign-off (those remain ecosystem concerns documented here for alignment).

### 1.4 Actors (who touches the system)

- **Viewer** — browses catalog, plays video, resumes across devices.
- **Content operator** — ingests masters, triggers or monitors transcodes, curates metadata.
- **Business / data** — consumes aggregated engagement from the insight plane.

### 1.5 Quality attributes (non-functional priorities)

These priorities guide trade-offs across services and infrastructure design:

- **Reliability:** define SLOs per surface (for example playback API latency and transcoding job completion time); design for partial failure, not only “all up or all down.”
- **Scalability:** separate stateless edge APIs from CPU-bound workers; scale transcoding horizontally with queue back-pressure.
- **Security:** least privilege, short-lived credentials at the edge, audit-friendly logs without storing unnecessary PII.
- **Operability:** every deployable must expose health, metrics, and traces compatible with a shared observability backend.
- **Evolvability:** bounded contexts and versioned contracts (HTTP OpenAPI, gRPC protos, event schemas) so teams can ship independently.

---

## 2. Core tech stack (summary)

Detailed rationale, messaging trade-offs, data modeling notes, and **current repository state** live in [3_techstack.md](./3_techstack.md). Feature and use-case coverage (implemented vs target) is in [2_features.md](./2_features.md).

### Backend

**NestJS** on **Node.js**: modular boundaries, DI, testability, and evolution toward multiple deployable apps (one bounded context per service where possible). **TypeScript** end-to-end for shared contracts in libraries. **Nx** monorepo for many apps/libs with graph-aware builds.

### Frontend (ecosystem)

**Next.js** (SSR/SSG/App Router as appropriate) and **Tailwind CSS** for product UI. The browser typically talks to a **BFF or gateway**, not to every internal gRPC endpoint.

### Communication

- **Internal synchronous:** **Nest TCP** (`@nestjs/microservices`) for **BFF → first-party Nest services** in this monorepo (e.g. `user-service`); **gRPC** (Protobuf) remains a strong option for cross-language or heavily versioned internal APIs. Neither is exposed to browsers.
- **Asynchronous:** **RabbitMQ** or **Kafka** for domain events, fan-out, and long-running workflows (transcode completion, index updates, notifications).

### Data strategy (database-per-service)

- **PostgreSQL** — durable relational state (accounts, subscriptions, billing-adjacent records).
- **MongoDB** — flexible documents for catalog-like metadata and high read fan-out.
- **Redis** — speed layer: sessions, hot keys, rate limiting, coordination primitives; not the system of record for money or entitlements.

### Infrastructure

**FFmpeg** (and related tooling) for transcodes and packaging; **S3-compatible** storage (**AWS S3** or **MinIO**); **Docker** images; **Kubernetes** for scheduling, scaling, and progressive rollouts.

---

## 3. Microservices architecture

### 3.1 Service catalog

| Service                | Primary responsibility                                                                  | Typical dependencies (read as “talks to”, not shared DB)                                                      |
| ---------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Identity**           | Authentication, authorization, profiles, tenant/org boundaries                          | PostgreSQL; issues or validates tokens consumed by gateway and services.                                      |
| **Catalog**            | Titles, seasons/episodes, artwork references, categories, discovery surfaces            | MongoDB (or similar) for documents; search index updated via events; reads object keys from storage metadata. |
| **Transcoding engine** | CPU/GPU-heavy transforms: mezzanine → ABR ladder, thumbnails, packaging                 | Job queue + object storage in/out; emits **transcode completed** events.                                      |
| **Playback**           | Entitlements checks (with identity/billing context), playback session, resume positions | Redis for hot state; durable progress store per design; may call catalog for metadata.                        |
| **Insight**            | Event ingestion, aggregation, export to BI                                              | Stream or batch from Kafka/Rabbit; warehouse or OLAP optional later.                                          |

### 3.2 Request paths (conceptual)

1. **Read path (playback)** — step-by-step:
   - Client obtains a session or access token (via Identity or an OAuth/OIDC broker, design-dependent).
   - Client calls the **API Gateway** (or BFF) for a **playback decision**: title, device, quality hints.
   - Gateway forwards to **Playback**, which validates the token, resolves **entitlements** (may call Identity or read a denormalized entitlement projection), and checks **business rules** (geo, concurrency caps, parental controls).
   - Playback returns a **manifest URL** (HLS/DASH) and optionally **short-lived signed segment URLs** or CDN tokens; the client fetches segments directly from **CDN ↔ object storage**, minimizing origin load.
   - **Resume** and **watch progress** use a small hot path (Redis) plus a durable store owned by Playback or Identity, depending on the final ADR; reads should tolerate brief staleness after a write.

2. **Write path (upload / ingest)** — step-by-step:
   - Operator or uploader requests a **presigned upload** from the gateway; gateway records intent (title id, correlation id) and returns PUT URL + constraints (max size, content-type).
   - Client **streams bytes to object storage**; gateway does not buffer large bodies in memory.
   - Storage or an **ingest watcher** emits **UploadReceived** / **ObjectCreated** (exact name is an implementation choice) with bucket, key, checksum, tenant.
   - **Transcoding** consumes the event, pulls the master, runs FFmpeg (or GPU pipeline), writes renditions and manifests back to storage, then emits **TranscodeCompleted** with manifest locations and technical metadata (codecs, bitrates, duration).
   - **Catalog** updates browse metadata and search index projections (sync or async). **Playback** may invalidate or warm caches for that title. **Insight** may log ingest duration for ops dashboards.

3. **Operator path (metadata)** — typically lower volume: authenticated calls through the gateway to Catalog (CRUD on seasons, artwork, availability windows) with audit logs and optional approval workflows later.

### 3.3 Data ownership rule

Each service **owns** its database and schema. Other services integrate via **APIs**, **events**, or **explicit read models**—never via cross-database joins.

---

## 4. Technical challenges and concepts

### 4.1 API gateway

Single north-south entry for **TLS**, **routing**, **authentication** (validate tokens), **authorization hooks** (coarse checks), and **rate limiting**. Offloads cross-cutting concerns so domain services stay focused. Often paired with a **BFF** when the web client needs tailored aggregation.

### 4.2 Saga pattern (distributed coordination)

Long-lived business processes span services (example: “payment captured → subscription row active → entitlements cache refreshed”). Use **orchestrated** or **choreographed** sagas with **compensating actions** and **idempotent** event handlers to avoid double-charging or double-granting when retries occur.

### 4.3 Service discovery and load balancing

In Kubernetes, **Services** and **Ingress** (or a mesh) provide stable names and traffic spread. For gRPC, health checks and **ready** probes must reflect actual dependency readiness to avoid thundering herds on cold nodes.

### 4.4 Circuit breaker and resilience

When downstream latency or error rates spike, **fail fast** with controlled fallbacks (cached catalog snippet, generic error, skip non-critical enrichment). Combine timeouts, bulkheads, and retry budgets; prefer retry only on **safe** idempotent operations.

### 4.5 Observability

**Distributed tracing** (for example Jaeger or a managed backend) with consistent **trace IDs** across gateway → services → workers. **Centralized logging** (for example ELK or OpenSearch) with structured JSON and **correlation IDs**. **Metrics** (RED/USE) for SLOs: availability, transcoding backlog, p95 playback API latency.

### 4.6 Security posture (overview)

Least privilege per service account, **secrets** from a manager or K8s secrets (not in git), optional **mTLS** service mesh for east-west traffic, and regular dependency scanning in CI. Details belong in a dedicated security/operations doc when introduced.

---

## 5. Event-driven integration (conceptual catalog)

Events are the primary way to keep **database-per-service** boundaries honest. Names below are illustrative; lock them in an **event registry** (schema repo or AsyncAPI) when implementation starts.

| Event (illustrative)     | Producer            | Primary consumers              | Notes                                                                 |
| ------------------------ | ------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `UserRegistered`         | Identity            | Insight, notification adapters | PII minimization in payloads; prefer user ids over emails in fan-out. |
| `SubscriptionActivated`  | Billing / Identity  | Playback, Insight              | Saga step; idempotent handlers keyed by billing event id.             |
| `MediaIngested`          | Upload orchestrator | Transcoding                    | Contains storage key, tenant, checksum.                               |
| `TranscodeCompleted`     | Transcoding         | Catalog, Playback, Insight     | Drives availability flags and manifest URLs.                          |
| `CatalogTitleUpdated`    | Catalog             | Search index worker, BFF cache | Debounce bursts of editorial edits if needed.                         |
| `PlaybackSessionStarted` | Playback            | Insight                        | High volume; consider sampling or aggregation at edge.                |

**Ordering:** per-aggregate or per-partition keys (for example `titleId`) preserve order where it matters (ingest → transcode → catalog). Analytics firehose may tolerate different ordering.

**Delivery guarantees:** prefer **at-least-once** with **idempotent** consumers everywhere money or entitlements are touched; document which handlers are safe under duplicate delivery.

---

## 6. Deployment and runtime topology (sketch)

| Zone                  | What runs here                                                              | Notes                                                      |
| --------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Edge**              | CDN, WAF, TLS termination, optional edge functions for A/B or geo headers   | Manifest and segment traffic should hit CDN first.         |
| **Ingress / gateway** | API gateway, rate limits, JWT validation, request ID                        | Single place for CORS and coarse authz.                    |
| **Application plane** | Nest (or other) services as Deployments, transcode workers as Jobs or pools | Scale APIs on RPS/latency; scale workers on queue depth.   |
| **Data plane**        | PostgreSQL, MongoDB, Redis, brokers, object storage                         | Network policies restrict which pods talk to which stores. |
| **Observability**     | OTLP collectors, log pipeline, metrics backend                              | Same trace id from gateway through workers where possible. |

**Blast radius:** treat **Transcoding** and **Insight** as bulkhead domains—heavy CPU or huge cardinality metrics must not starve **Playback** read paths (separate pools or quotas).

---

## 7. Glossary (planning)

| Term                | Meaning in Zenith planning                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **BFF**             | Backend-for-frontend: shapes responses for a specific client (often Next.js) and holds session-oriented logic. |
| **Bounded context** | A cohesive domain with its own model and datastore; maps 1:1 to a service where practical.                     |
| **Entitlement**     | Right to play a specific asset under current subscription and policy rules.                                    |
| **Mezzanine**       | High-quality intermediate master used as transcode input.                                                      |
| **ABR ladder**      | Set of renditions at different bitrates for adaptive streaming.                                                |
| **Read model**      | Denormalized projection optimized for queries, updated by events—not the transactional source of truth.        |

---

## 8. Open decisions (track with ADRs)

Capture irreversible or expensive choices as short **Architecture Decision Records** under `docs/planning/adr/` with sequential numbering. A **seed list** of titles lives in [4_backend_architecture.md](./4_backend_architecture.md) §9. Candidate topics beyond that list: DRM strategy, global vs regional catalog shards, GraphQL vs REST at BFF, multi-region failover for object storage.

---

## 9. Related documents

- [2_features.md](./2_features.md) — shipped vs planned features, diagrams, roadmap phases.
- [3_techstack.md](./3_techstack.md) — stack detail, pinned versions, testing and local dev.
- [4_backend_architecture.md](./4_backend_architecture.md) — Nest modules, libs, and split patterns.
