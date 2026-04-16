# Changelog

All notable changes to Genesis will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Fixed AES-GCM IV reuse in WebCryptoKeychain (CRITICAL).
- Added prompt sanitization and length limits to InstallSkillUseCase (CRITICAL).
- Consolidated IndexedDB management into DatabaseManager (CRITICAL).
- Added brute-force protection to vault unlock (HIGH).
- Fixed state mutation bugs in ChatWindow (HIGH).

### Added
- Multi-agent orchestration with Conductor and A2A protocol.
- Skill system: installation, registry, and UI selection.
- WebCryptoKeychain for secure API key storage.
- Tool execution in Web Worker pool.
- WebLLM integration with model loading and streaming.
- IndexedDB persistence for conversations, memories, and skills.
- Vault setup/unlock flow with PBKDF2 key derivation.
- PWA installability with offline detection and haptic feedback.
- Event-driven architecture with typed EventBus.
- Hexagonal architecture with strict layer boundaries.

## [0.1.0] - 2026-04-15

### Added
- Initial project scaffold with Vite + Preact + TypeScript.
- DI container with tsyringe.
- Shared types: Branded IDs, Result monad, DomainError.
- EventBus and typed event map.
- Logger port and ConsoleLogger.
- Basic App component with DI hook.
