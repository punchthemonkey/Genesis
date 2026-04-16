# Genesis Architecture

**Version:** 2.0  
**Last Updated:** 2026-04-15

---

## Design Philosophy

1. **Sovereignty** – User data encrypted locally; zero telemetry by default.
2. **Offline First** – Core functionality works without internet.
3. **Hexagonal Architecture** – Strict separation of domain from infrastructure.
4. **Explicit over Implicit** – No magic; every behavior traceable.
5. **Observability by Design** – Typed events, structured logging, debug overlay.

---

## Layered Architecture

Genesis is organized into four concentric layers following Hexagonal (Ports & Adapters) principles:

### 1. Domain Layer (`src/domain/`)
Pure business logic with zero external dependencies. Contains entities, value objects, domain services, and port interfaces.

### 2. Application Layer (`src/application/`)
Orchestrates use cases by coordinating domain objects. Depends only on domain ports.

### 3. Infrastructure Layer (`src/infrastructure/`)
Concrete implementations of domain ports. Handles WebLLM, IndexedDB, WebCrypto, and Web Workers.

### 4. UI Layer (`src/ui/`)
Preact components that consume application use cases via dependency injection.

**Dependency Rule:** Dependencies point inward. Domain never imports from outer layers.

---

## Component Breakdown

### Domain Layer

| Component | Responsibility | Key Methods |
| :--- | :--- | :--- |
| **Conversation** | Aggregate root managing a sequence of turns. | `addTurn()`, `getRecentTurns()`, `prune()` |
| **Turn** | Value object representing a single exchange. | `create()` |
| **Skill** | Immutable entity defining a packaged capability. | `canUseTool()`, `fromJSON()` |
| **MemoryEntry** | Value object for semantic memory with embedding. | `cosineSimilarity()`, `toJSON()` |
| **Orchestrator** | Executes the ReAct loop for single‑agent turns. | `run(messages, turnId)` |
| **Conductor** | Multi‑agent orchestration; delegates to specialists. | `run(messages, turnId)` |
| **SkillRegistry** | Manages installed skills and the active skill. | `install()`, `getActiveSkill()` |

### Domain Ports (Interfaces)

| Port | Purpose |
| :--- | :--- |
| `ILLMProvider` | LLM inference (local or cloud). |
| `IToolExecutor` | Sandboxed tool execution. |
| `IMemoryStore` | Persistent storage for conversations, memories, skills. |
| `IKeychain` | Secure storage of API keys and secrets. |
| `ILogger` | Structured logging. |
| `IEventEmitter` | Event emission for cross‑layer communication. |

### Application Layer

| Component | Responsibility |
| :--- | :--- |
| **RunAgentTurnUseCase** | Processes a user message, runs orchestrator, persists turn. |
| **InstallSkillUseCase** | Validates and installs a skill from JSON manifest. |
| **EventBus** | Type‑safe pub/sub implementing `IEventEmitter`. |

### Infrastructure Layer

| Adapter | Implements | Details |
| :--- | :--- | :--- |
| **WebLLMProvider** | `ILLMProvider` | Uses `@mlc-ai/web-llm` for local GPU inference. |
| **MockLLMProvider** | `ILLMProvider` | Scriptable mock for testing. |
| **IndexedDBMemoryStore** | `IMemoryStore` | Persists conversations, memories, and skills in IndexedDB. |
| **WebCryptoKeychain** | `IKeychain` | AES‑GCM encryption with PBKDF2 key derivation and brute‑force protection. |
| **CompositeToolExecutor** | `IToolExecutor` | Delegates to inline tools or a worker pool. |
| **ToolWorkerPool** | N/A | Manages a pool of Web Workers for sandboxed tool execution. |
| **DatabaseManager** | N/A | Singleton managing IndexedDB schema versions and migrations. |
| **ConsoleLogger** | `ILogger` | Simple console‑based logging. |

### UI Layer

| Component | Purpose |
| :--- | :--- |
| `App` | Root component; manages vault unlock and model loading. |
| `VaultSetup` | Master password creation and unlock UI. |
| `ModelLoader` | Model download progress UI. |
| `ChatWindow` | Main chat interface with streaming and skill selection. |
| `SkillInstaller` | Modal for pasting skill JSON manifests. |
| `useInjection` | Hook to resolve DI dependencies in Preact components. |

---

## Data Model

### Core Entities

**Conversation**
- `id`: ConversationId (branded string)
- `turns`: Turn[]
- `createdAt`: Date
- `updatedAt`: Date

**Turn**
- `id`: TurnId
- `userMessage`: string
- `assistantResponse`: string
- `metadata`: TurnMetadata (optional)
- `timestamp`: Date

**Skill**
- `id`: SkillId
- `name`: string
- `description`: string
- `systemPrompt`: string
- `allowedTools`: string[]
- `version`: string

**MemoryEntry**
- `id`: MemoryId
- `content`: string
- `embedding`: Float32Array
- `source`: 'conversation' | 'document' | 'explicit'
- `createdAt`: Date

### Invariants
- A Conversation may not exceed 1000 turns; `prune()` is called when needed.
- Skill.version must follow semver format.
- Skill.allowedTools must reference tools known to the `IToolExecutor`.
- MemoryEntry.embedding dimension must match the embedding model (default 384).

### Relationships
- A Conversation contains many Turn objects (composition).
- A Skill is independent; a turn may reference an active skill via `metadata.skillId`.
- MemoryEntry may be linked to a Conversation or user document via `metadata`.

---

## Technology Choices

| Technology | Version | Purpose | Rationale |
| :--- | :--- | :--- | :--- |
| TypeScript | 5.5+ | Primary language | Type safety, excellent tooling. |
| Preact | 10.24+ | UI framework | Lightweight (<4KB), Signals for reactivity. |
| Vite | 5.4+ | Build tool & dev server | Fast HMR, built‑in PWA support, easy COOP/COEP headers. |
| tsyringe | 4.8+ | Dependency Injection | Lightweight, decorator‑based, works seamlessly with TypeScript. |
| @mlc-ai/web-llm | 0.2.x | Local LLM inference | Only production‑ready WebGPU inference in the browser. |
| Turso | libSQL | Cloud sync | Embedded replica, offline‑first sync, SQLite compatibility. |
| Vitest | 2.0+ | Unit & integration testing | Fast, compatible with Vite. |
| Playwright | 1.44+ | E2E testing | iOS viewport support, reliable cross‑browser testing. |

---

## Security Model

| Threat | Mitigation |
| :--- | :--- |
| Unauthorized access to API keys | AES‑GCM with PBKDF2 (600k iterations); separate IVs per encryption; HMAC verification. |
| XSS via skill prompts | Strict CSP; prompt sanitization (length limits, pattern blocking); user preview before install. |
| Malicious MCP tool | Sandboxed Web Worker; user approval per tool; capability declaration. |
| Self‑evolution PR contains backdoor | Security boundaries (e.g., `keychain/` excluded); CI secret scanning; human review required. |
| IndexedDB quota exhaustion | Usage monitoring; user prompted to prune. |
| Brute‑force vault unlock | Failed attempt counter with exponential lockout (5 attempts → 30s, then increasing). |
| Man‑in‑the‑middle on sync | All data encrypted with master key; HTTPS enforced. |

---

## Operational Characteristics

| Metric | Target | Monitoring |
| :--- | :--- | :--- |
| First Token Latency (p99) | <500ms | Event `llm:stream:first_token` |
| Model Load Time (cache hit) | <5s | `llm:load:progress` events |
| IndexedDB Transaction Time | <50ms | Logged in debug overlay |
| Memory Usage (JS heap) | <200MB | `performance.memory` API |
| PWA Cold Load | <3s TTI | Lighthouse CI |
