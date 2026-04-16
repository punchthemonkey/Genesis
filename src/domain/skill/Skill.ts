/**
 * Skill.ts
 * Immutable Skill entity.
 *
 * @version 1.0.0
 */

import { Brand, generateId } from '@shared/types/Brand';

export type SkillId = Brand<string, 'SkillId'>;

/**
 * Skill entity (immutable).
 * Represents a packaged capability that can be installed.
 */
export class Skill {
  constructor(
    public readonly id: SkillId,
    public readonly name: string,
    public readonly description: string,
    public readonly systemPrompt: string,
    public readonly allowedTools: readonly string[],
    public readonly version: string,
    public readonly author?: string,
    public readonly homepage?: string
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error('Skill name cannot be empty');
    }
    if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
      throw new Error('Version must be semver format');
    }
  }

  /**
   * Checks if the skill permits use of a specific tool.
   */
  canUseTool(toolName: string): boolean {
    return this.allowedTools.includes(toolName);
  }

  static create(params: Omit<Skill, 'id'> & { id?: SkillId }): Skill {
    return new Skill(
      params.id ?? generateId<SkillId>(),
      params.name,
      params.description,
      params.systemPrompt,
      params.allowedTools,
      params.version,
      params.author,
      params.homepage
    );
  }

  /**
   * Validates skill manifest JSON.
   */
  static fromJSON(data: any): Skill | null {
    if (!data?.name || !data.description || !data.systemPrompt || !data.allowedTools || !data.version) {
      return null;
    }
    if (!Array.isArray(data.allowedTools)) return null;
    try {
      return new Skill(
        (data.id as SkillId) ?? generateId<SkillId>(),
        data.name,
        data.description,
        data.systemPrompt,
        data.allowedTools,
        data.version,
        data.author,
        data.homepage
      );
    } catch {
      return null;
    }
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      systemPrompt: this.systemPrompt,
      allowedTools: this.allowedTools,
      version: this.version,
      author: this.author,
      homepage: this.homepage
    };
  }
}
