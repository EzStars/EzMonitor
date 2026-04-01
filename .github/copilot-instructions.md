# EzMonitor Workspace Guidelines

## Scope
- This file applies to the whole monorepo.
- For monitor-app-specific implementation details, also follow `packages/monitor-app/.github/copilot-instructions.md`.

## Working Language
- Prefer Chinese in explanations, commit summaries, and PR notes unless explicitly requested otherwise.

## Repository Layout
- `packages/monitor-sdkv2`: core SDK (TypeScript, plugin architecture, `tsdown` build).
- `packages/monitor-app`: Next.js demo/dashboard app that consumes `@ezstars/monitor-sdkv2` via workspace dependency.
- `docs`: VitePress documentation site.
- Root uses `pnpm` workspace + `turbo` task orchestration.

## Build And Test Commands
- Install dependencies: `pnpm install`
- Build all packages: `pnpm run build:all`
- Run lint in repo root: `pnpm run lint`
- Run tests in repo root: `pnpm test`
- Run docs site: `pnpm run docs:dev`
- Run demo app: `pnpm run dev:monitor-app`
- Run SDK watch build: `pnpm --filter @ezstars/monitor-sdkv2 run dev`

## SDK Architecture Conventions
- Keep SDK layering clear:
  - plugin layer: collect telemetry
  - core layer: lifecycle/config/plugin management
  - reporter layer: queue/batch/retry/transport
- Do not reintroduce plugin-local cache/queue logic in tracking plugins; batch and offline cache belong to Reporter/ReportQueue.
- Respect lifecycle constraints: register plugins before `sdk.start()`.
- Prefer extending existing `types` and `core` contracts instead of ad-hoc runtime fields.

## Monorepo Conventions
- Use workspace-filtered commands when changing a single package.
- Keep cross-package API changes synchronized: if SDK public API changes, update monitor-app usage and docs together.
- Avoid broad refactors unrelated to the task; preserve existing style and file structure.

## Known Pitfalls
- `packages/monitor-sdkv2` has a `prepare` script that builds SDK; first install/build can be slower.
- `monitor-app` depends on built SDK artifacts; if app import/type errors appear, rebuild SDK package first.
- Next.js default port may change when 3000 is occupied; verify actual startup port from logs.

## Link-First References
- Monorepo overview and commands: `README.md`
- SDK v2 architecture details: `packages/monitor-sdkv2/CLAUDE.md`
- SDK usage and package notes: `packages/monitor-sdkv2/README.md`
- App-specific guidance: `packages/monitor-app/.github/copilot-instructions.md`
- User-facing documentation index: `docs/index.md`
- Contribution guide: `docs/贡献文档/index.md`