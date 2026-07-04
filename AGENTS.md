# Repository Guidelines

## Project Structure & Module Organization

This workspace combines three main areas:

- `ai-backendd-imobiliaria/`: Laravel 12 API. Application code lives in `app/`, routes in `routes/`, database migrations/seeders in `database/`, and PHPUnit tests in `tests/Feature` and `tests/Unit`.
- `ai-front-end-imobiliaria/`: Next.js 16 frontend. Source is in `src/`, route groups in `src/app`, feature components in `src/components/features`, shared UI in `src/components/ui`, API clients in `src/services`, schemas in `src/schemas`, and static assets in `public/`.
- `crawler-machine/`: Python crawler com discovery, schema IA e normalização. Persiste resultados em Postgres quando configurado.
- `docs/`: product plans, roadmaps, and technical implementation notes.

## Build, Test, and Development Commands

From the repository root:

```bash
./start.sh
```

Starts the Laravel Sail backend and Next.js frontend together.

Backend commands:

```bash
cd ai-backendd-imobiliaria
composer install
composer run dev
composer test
vendor/bin/pint
```

Frontend commands:

```bash
cd ai-front-end-imobiliaria
npm install
npm run dev
npm run build
npm run lint
npm test
```

## Coding Style & Naming Conventions

Use PHP 8.2+ and Laravel conventions in the backend: PSR-4 classes, singular Eloquent models, `*Controller`, `*Service`, `*Request`, and `*Resource` suffixes. Run Pint before committing PHP changes.

Use TypeScript and React conventions in the frontend: PascalCase components, camelCase hooks/services, and `use*` hook names. Prefer the `@/` alias for imports from `src`. Shared primitives belong in `src/components/ui`; domain workflows belong in `src/components/features`.

Never use the TypeScript `any` type in frontend code, including tests, mocks, API clients, component props, and form handlers. Prefer precise domain types, generated/inferred schema types, generics, `unknown` with narrowing, or small local interfaces for test doubles and external payloads.

When changing permissions or access control, update the Laravel permission seeders/migrations, verify the backend authorization and serialized user permission contract, and verify the frontend permission checks that consume it.

When finishing work in a Git worktree, verify the worktree is clean and the work is preserved or integrated, then remove the worktree directory before handing off.

## Testing Guidelines

Backend tests use PHPUnit through Laravel: place API and workflow tests in `tests/Feature`, isolated logic tests in `tests/Unit`, and run `composer test`.

Frontend tests use Vitest with jsdom and Testing Library. Keep tests near the feature under `__tests__` or use `*.test.ts(x)`. Run `npm test`; use `npm run test:watch` while iterating.

## Commit & Pull Request Guidelines

Git history currently uses short, informal messages, so prefer improving clarity: write imperative, scoped commits such as `Add agency config API` or `Fix role form validation`.

For pull requests, include the problem, the main changes, test results, linked issue or plan when available, and screenshots for UI changes. Call out migrations, new environment variables, or service dependencies explicitly.

## Security & Configuration Tips

Do not commit secrets from `.env` files. Use the provided examples such as `.env.example` and `.env.local.example`. Treat scraper output, logs, `vendor/`, `node_modules/`, `.next/`, and generated caches as local artifacts.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `viniciusz1/ia-imob` using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default five-label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a multi-context layout rooted at `CONTEXT-MAP.md`. See `docs/agents/domain.md`.
