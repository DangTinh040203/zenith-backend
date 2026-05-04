# Zenith — Advanced Microservices Video Streaming Ecosystem

**Planning folder (`docs/planning/`):** all planning documents are written in **English** and maintained as living references. Use this file for vision, service boundaries, and cross-cutting concerns; use companion docs for implementation inventory and stack detail.

| File                                 | Purpose                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `1_overview.md` (this document)      | Product vision, problem framing, service catalog, request paths, distributed patterns.                                                   |
| [`2_features.md`](./2_features.md)   | Product and engineering **features** (implemented vs planned), use-case diagrams, and traceability to apps and roadmap.                  |
| [`3_techstack.md`](./3_techstack.md) | Technology choices, trade-offs, data and media strategy, and **authoritative snapshot** of dependencies and tooling in `zenith-backend`. |

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

- **Internal synchronous:** **gRPC** (Protobuf, low overhead) for service-to-service calls that need immediate results inside the trust boundary.
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

1. **Read path (playback):** Client → **API Gateway** → Playback (+ short calls to Identity for token validation / entitlements) → signed URLs or CDN policy as designed.
2. **Write path (upload):** Client → Gateway → **Upload orchestration** (presigned PUT to object storage) → event **UploadReceived** → Transcoding consumer → segments to storage → **Catalog/Playback** updated via events.

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
