/**
 * AgentRegistry.ts
 * Registry for available specialist agents.
 *
 * @version 1.0.0
 */

import { AgentCard, AgentId } from '@domain/agent/A2AProtocol';

export class AgentRegistry {
  private agents = new Map<AgentId, AgentCard>();

  register(agent: AgentCard): void {
    this.agents.set(agent.id, agent);
  }

  get(id: AgentId): AgentCard | undefined {
    return this.agents.get(id);
  }

  list(): AgentCard[] {
    return Array.from(this.agents.values());
  }

  unregister(id: AgentId): boolean {
    return this.agents.delete(id);
  }
}
