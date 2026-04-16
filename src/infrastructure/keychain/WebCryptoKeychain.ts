/**
 * WebCryptoKeychain.ts
 * WebCrypto implementation of IKeychain with proper IV separation and brute‑force protection.
 *
 * @version 2.0.0 - Fixed AES‑GCM IV reuse; added HMAC verification and lockout.
 */

import { IKeychain, KeychainError, KeychainEntry } from '@domain/ports/IKeychain';
import { Result, ok, err } from '@shared/types/Result';
import { KeyHandle, generateId } from '@shared/types/Brand';
import { DatabaseManager } from '../db/DatabaseManager';

const STORE_NAME = 'keychain';
const VAULT_KEY = 'vault';
const ATTEMPTS_KEY = 'failedAttempts';
const LOCKOUT_KEY = 'lockoutUntil';

interface VaultData {
  salt: ArrayBuffer;
  vaultIv: ArrayBuffer;
  encryptedVault: ArrayBuffer;
  verificationTag: ArrayBuffer;
  iterations: number;
}

interface StoredSecret {
  handle: KeyHandle;
  label: string;
  encryptedSecret: ArrayBuffer;
  iv: ArrayBuffer;
  createdAt: string;
}

export class WebCryptoKeychain implements IKeychain {
  private masterKey: CryptoKey | null = null;
  private vault: Map<KeyHandle, StoredSecret> = new Map();

  private async withStore<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await DatabaseManager.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = operation(store);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));
      request.onerror = () => reject(request.error);
    });
  }

  private async getFailedAttempts(): Promise<number> {
    try {
      const val = await this.withStore('readonly', store => store.get(ATTEMPTS_KEY));
      return val ?? 0;
    } catch {
      return 0;
    }
  }

  private async incrementFailedAttempts(): Promise<void> {
    const current = await this.getFailedAttempts();
    await this.withStore('readwrite', store => store.put(current + 1, ATTEMPTS_KEY));
    if (current + 1 >= 5) {
      const lockout = Date.now() + 30 * 1000; // 30s initial lockout
      await this.withStore('readwrite', store => store.put(lockout, LOCKOUT_KEY));
    }
  }

  private async resetFailedAttempts(): Promise<void> {
    await this.withStore('readwrite', store => store.put(0, ATTEMPTS_KEY));
    await this.withStore('readwrite', store => store.delete(LOCKOUT_KEY));
  }

  private async getLockoutTime(): Promise<number> {
    try {
      return await this.withStore('readonly', store => store.get(LOCKOUT_KEY)) ?? 0;
    } catch {
      return 0;
    }
  }

  async isInitialized(): Promise<Result<boolean, KeychainError>> {
    try {
      const data = await this.withStore('readonly', store => store.get(VAULT_KEY));
      return ok(!!data);
    } catch (e) {
      return err({ code: 'STORAGE_ERROR', message: String(e) });
    }
  }

  async initialize(masterPassword: string): Promise<Result<void, KeychainError>> {
    try {
      const initialized = await this.isInitialized();
      if (initialized.ok && initialized.value) {
        return err({ code: 'ALREADY_INITIALIZED', message: 'Vault already exists' });
      }

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const vaultIv = crypto.getRandomValues(new Uint8Array(12));
      const iterations = 600_000;

      const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(masterPassword), 'PBKDF2', false, ['deriveBits']);
      const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256);
      this.masterKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

      const emptyVault = new Uint8Array(0);
      const encryptedVault = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: vaultIv }, this.masterKey, emptyVault);

      const hmacKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const verificationData = new TextEncoder().encode('genesis-vault-v1');
      const verificationTag = await crypto.subtle.sign('HMAC', hmacKey, verificationData);

      const vaultData: VaultData = {
        salt: salt.buffer,
        vaultIv: vaultIv.buffer,
        encryptedVault,
        verificationTag,
        iterations
      };

      await this.withStore('readwrite', store => store.put(vaultData, VAULT_KEY));
      await this.resetFailedAttempts();
      this.vault.clear();
      return ok(undefined);
    } catch (e) {
      return err({ code: 'CRYPTO_ERROR', message: String(e) });
    }
  }

  async unlock(masterPassword: string): Promise<Result<void, KeychainError>> {
    try {
      const attempts = await this.getFailedAttempts();
      if (attempts >= 5) {
        const lockoutUntil = await this.getLockoutTime();
        if (Date.now() < lockoutUntil) {
          const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
          return err({ code: 'LOCKED_OUT', message: `Vault locked for ${remaining}s` });
        } else {
          await this.resetFailedAttempts();
        }
      }

      const vaultData = await this.withStore('readonly', store => store.get(VAULT_KEY)) as VaultData | undefined;
      if (!vaultData) return err({ code: 'NOT_INITIALIZED', message: 'Vault not initialized' });

      const salt = new Uint8Array(vaultData.salt);
      const iterations = vaultData.iterations;

      const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(masterPassword), 'PBKDF2', false, ['deriveBits']);
      const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256);

      const hmacKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const verificationData = new TextEncoder().encode('genesis-vault-v1');
      const isValid = await crypto.subtle.verify('HMAC', hmacKey, vaultData.verificationTag, verificationData);
      if (!isValid) {
        await this.incrementFailedAttempts();
        return err({ code: 'INVALID_PASSWORD', message: 'Incorrect master password' });
      }

      await this.resetFailedAttempts();
      this.masterKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

      const vaultIv = new Uint8Array(vaultData.vaultIv);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: vaultIv }, this.masterKey, vaultData.encryptedVault);
      if (decrypted.byteLength > 0) {
        const json = new TextDecoder().decode(decrypted);
        const stored: StoredSecret[] = JSON.parse(json);
        this.vault = new Map(stored.map(s => [s.handle, s]));
      } else {
        this.vault.clear();
      }
      return ok(undefined);
    } catch (e) {
      return err({ code: 'CRYPTO_ERROR', message: String(e) });
    }
  }

  async lock(): Promise<Result<void, KeychainError>> {
    this.masterKey = null;
    this.vault.clear();
    return ok(undefined);
  }

  isUnlocked(): boolean {
    return this.masterKey !== null;
  }

  private async persistVault(): Promise<Result<void, KeychainError>> {
    if (!this.masterKey) return err({ code: 'NOT_INITIALIZED', message: 'Vault not unlocked' });
    try {
      const vaultData = await this.withStore('readonly', store => store.get(VAULT_KEY)) as VaultData;
      if (!vaultData) return err({ code: 'NOT_INITIALIZED', message: 'Vault metadata missing' });
      const vaultIv = new Uint8Array(vaultData.vaultIv);
      const secrets = Array.from(this.vault.values());
      const json = JSON.stringify(secrets);
      const plaintext = new TextEncoder().encode(json);
      const encryptedVault = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: vaultIv }, this.masterKey, plaintext);
      vaultData.encryptedVault = encryptedVault;
      await this.withStore('readwrite', store => store.put(vaultData, VAULT_KEY));
      return ok(undefined);
    } catch (e) {
      return err({ code: 'CRYPTO_ERROR', message: String(e) });
    }
  }

  async store(label: string, secret: string): Promise<Result<KeyHandle, KeychainError>> {
    if (!this.masterKey) return err({ code: 'NOT_INITIALIZED', message: 'Vault not unlocked' });
    try {
      const handle = generateId<KeyHandle>();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedSecret = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.masterKey, new TextEncoder().encode(secret));
      const stored: StoredSecret = {
        handle,
        label,
        encryptedSecret,
        iv: iv.buffer,
        createdAt: new Date().toISOString()
      };
      this.vault.set(handle, stored);
      return this.persistVault().then(() => ok(handle));
    } catch (e) {
      return err({ code: 'CRYPTO_ERROR', message: String(e) });
    }
  }

  async retrieve(handle: KeyHandle): Promise<Result<string, KeychainError>> {
    if (!this.masterKey) return err({ code: 'NOT_INITIALIZED', message: 'Vault not unlocked' });
    const stored = this.vault.get(handle);
    if (!stored) return err({ code: 'NOT_FOUND', message: 'Secret not found' });
    try {
      const iv = new Uint8Array(stored.iv);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.masterKey, stored.encryptedSecret);
      return ok(new TextDecoder().decode(decrypted));
    } catch (e) {
      return err({ code: 'CRYPTO_ERROR', message: String(e) });
    }
  }

  async revoke(handle: KeyHandle): Promise<Result<void, KeychainError>> {
    if (!this.masterKey) return err({ code: 'NOT_INITIALIZED', message: 'Vault not unlocked' });
    if (!this.vault.has(handle)) return err({ code: 'NOT_FOUND', message: 'Secret not found' });
    this.vault.delete(handle);
    return this.persistVault();
  }

  async list(): Promise<Result<KeychainEntry[], KeychainError>> {
    if (!this.masterKey) return err({ code: 'NOT_INITIALIZED', message: 'Vault not unlocked' });
    const entries: KeychainEntry[] = Array.from(this.vault.values()).map(s => ({
      handle: s.handle,
      label: s.label,
      createdAt: new Date(s.createdAt)
    }));
    return ok(entries);
  }
}
