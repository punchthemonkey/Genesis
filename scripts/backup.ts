/**
 * Backup script to export all user data as encrypted JSON.
 * Run with: npx ts-node scripts/backup.ts
 */

import 'reflect-metadata';
import { container } from '../src/infrastructure/di/container';
import { IMemoryStore } from '../src/domain/ports/IMemoryStore';
import { IKeychain } from '../src/domain/ports/IKeychain';
import { TOKENS } from '../src/infrastructure/di/tokens';
import * as fs from 'fs';

async function backup() {
  const keychain = container.resolve<IKeychain>(TOKENS.Keychain);
  const memoryStore = container.resolve<IMemoryStore>(TOKENS.MemoryStore);

  if (!keychain.isUnlocked()) {
    console.error('Vault is locked. Unlock first.');
    process.exit(1);
  }

  const [conversations, memories, skills] = await Promise.all([
    memoryStore.listConversations(),
    memoryStore.searchMemories(new Float32Array(384), { limit: 1000 }),
    memoryStore.listSkills(),
  ]);

  const backupData = {
    version: 1,
    timestamp: new Date().toISOString(),
    conversations: conversations.ok ? conversations.value.map(c => c.toJSON()) : [],
    memories: memories.ok ? memories.value.map(m => ({ entry: m.entry.toJSON(), similarity: m.similarity })) : [],
    skills: skills.ok ? skills.value.map(s => s.toJSON()) : [],
  };

  const json = JSON.stringify(backupData, null, 2);
  const encrypted = await keychain.store('backup', json);
  if (!encrypted.ok) {
    console.error('Encryption failed:', encrypted.error.message);
    process.exit(1);
  }

  const outputPath = `genesis-backup-${Date.now()}.json`;
  fs.writeFileSync(outputPath, json);
  console.log(`Backup saved to ${outputPath}`);
}

backup().catch(console.error);
