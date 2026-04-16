
```markdown
# Contributing to Genesis

Thank you for your interest in contributing! This document provides guidelines for making contributions effective and enjoyable for everyone.

## Code of Conduct

Please review and adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Development Workflow

1. **Fork** the repository and clone locally.
2. **Create a branch** for your work: `git checkout -b feature/your-feature`.
3. **Install dependencies**: `npm install`.
4. **Make changes**, following the GOAT Standard (see `docs/GOAT.md`).
5. **Write tests** covering new functionality; ensure existing tests pass.
6. **Run checks**: `npm run lint && npm run type-check && npm test`.
7. **Commit** with a descriptive message using [Conventional Commits](https://www.conventionalcommits.org/).
8. **Push** your branch and open a **Pull Request**.

## Pull Request Guidelines

- Keep PRs focused; one feature or fix per PR.
- Link to any relevant issues.
- Ensure CI passes (lint, type-check, tests, coverage).
- Request review from at least one maintainer.

## Code Standards

We adhere to the **GOAT Standard** (see `docs/GOAT.md`). Key points:

- **Performance Contracts**: Document latency budgets in JSDoc.
- **Runtime Validation**: Validate inputs at boundaries; use branded types and `Result`.
- **Explicit Errors**: Document failure modes with `@error`.
- **Observability**: Emit events via `EventBus`; use `ILogger` for errors.
- **Testing**: Maintain coverage targets (domain 100%, application 90%, infrastructure 70%).

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS version
- Screenshots or logs if applicable

## Suggesting Features

Open an issue with:
- Clear description of the feature
- Use case and motivation
- Potential implementation approach (optional)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
