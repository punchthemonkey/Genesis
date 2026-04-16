/**
 * SkillRegistry.ts
 * Domain service for managing installed skills and the active skill.
 *
 * @version 1.0.0
 */

import { Skill, SkillId } from './Skill';
import { IMemoryStore } from '../ports/IMemoryStore';
import { Result, ok, err } from '@shared/types/Result';

export class SkillRegistry {
  private activeSkillId: SkillId | null = null;

  constructor(private memoryStore: IMemoryStore) {}

  async install(skill: Skill): Promise<Result<void, Error>> {
    return this.memoryStore.saveSkill(skill);
  }

  async uninstall(skillId: SkillId): Promise<Result<void, Error>> {
    return this.memoryStore.deleteSkill(skillId);
  }

  async get(skillId: SkillId): Promise<Result<Skill, Error>> {
    return this.memoryStore.getSkill(skillId);
  }

  async list(): Promise<Result<Skill[], Error>> {
    return this.memoryStore.listSkills();
  }

  setActiveSkill(skillId: SkillId | null): void {
    this.activeSkillId = skillId;
  }

  getActiveSkillId(): SkillId | null {
    return this.activeSkillId;
  }

  async getActiveSkill(): Promise<Result<Skill | null, Error>> {
    if (!this.activeSkillId) return ok(null);
    return this.get(this.activeSkillId);
  }
}
