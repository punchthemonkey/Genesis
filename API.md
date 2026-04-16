
```markdown
# Genesis API / Interface Reference

**Version:** 1.0  
**Base:** In‑memory / browser runtime (no HTTP endpoints)

Genesis is a client‑side application. Its "API" consists of the **application use cases** and **domain ports** that define the contract between layers. This document describes those interfaces for integrators and contributors.

---

## Use Cases (Public API)

### `RunAgentTurnUseCase`

**Purpose:** Process a user message and return the assistant's response, persisting the conversation.

#### Input

```typescript
interface RunAgentTurnInput {
  conversationId?: ConversationId;
  userMessage: string;
  activeSkillId?: SkillId;
}
