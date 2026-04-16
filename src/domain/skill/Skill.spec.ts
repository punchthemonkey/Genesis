import { describe, it, expect } from 'vitest';
import { Skill } from './Skill';

describe('Skill', () => {
  const valid = {
    name: 'Test',
    description: 'Desc',
    systemPrompt: 'You are helpful.',
    allowedTools: ['calc'],
    version: '1.0.0'
  };

  it('should create valid skill', () => {
    const skill = Skill.create(valid);
    expect(skill.id).toBeDefined();
    expect(skill.canUseTool('calc')).toBe(true);
  });

  it('should reject invalid version', () => {
    expect(() => Skill.create({ ...valid, version: 'bad' })).toThrow(/semver/);
  });

  it('should serialize and deserialize', () => {
    const skill = Skill.create(valid);
    const json = skill.toJSON();
    const restored = Skill.fromJSON(json);
    expect(restored).not.toBeNull();
    expect(restored!.id).toBe(skill.id);
  });
});
