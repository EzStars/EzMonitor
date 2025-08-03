# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EzMonitor is a comprehensive frontend monitoring SDK built with TypeScript in a Monorepo architecture using pnpm workspaces and Turbo for build orchestration. The project provides real-time performance monitoring, error tracking, user behavior analysis, and exception detection for web applications.

## Architecture

### Repository Structure
- **packages/monitor-sdk**: Core SDK library with monitoring capabilities
- **packages/monitor-web**: React-based web dashboard for visualization
- **docs/**: VitePress documentation site with comprehensive guides

### Core SDK Architecture (`packages/monitor-sdk/src/`)

The SDK follows a plugin-based architecture with four main monitoring modules:

1. **Error Module** (`plugins/error/`): Captures JavaScript errors, Promise rejections, resource loading failures, and framework-specific errors (React ErrorBoundary, Vue errorHandler)

2. **Performance Module** (`plugins/performance/`): Collects core web vitals (FP, FCP, LCP), resource loading metrics, and API performance data

3. **Behavior Module** (`plugins/behavior/`): Tracks user interactions, page views, route changes, and provides screen recording capabilities using rrweb

4. **Exception Module** (`plugins/exception/`): Detects page anomalies like white screens, stuttering, and crashes

### Data Flow Architecture

The SDK uses a sophisticated data pipeline:

1. **Collection Layer**: Each plugin module collects specific telemetry data
2. **Processing Layer**: Common utilities in `src/common/` handle data standardization and filtering
3. **Storage Layer**: Cache system (`src/common/cache.ts`) manages local data buffering
4. **Reporting Layer**: Intelligent uploader (`src/common/report.ts`) supports multiple transport methods:
   - **sendBeacon**: For small payloads (<60KB) and guaranteed delivery
   - **XHR**: For larger payloads or when explicit control is needed
   - **Image requests**: For tiny payloads (<2KB) as fallback

### Type System

Comprehensive TypeScript definitions in `src/types/index.ts` covering:
- Configuration interface (`ConfigType`)
- Performance metrics (`PerformanceResourceType`, `PaintType`)
- Error structures (`JsErrorType`, `PromiseErrorType`, `VueErrorType`, `ReactErrorType`)
- Behavior tracking (`PvInfoType`, `RouterChangeType`, `TargetInfoType`)
- Exception detection (`whiteScreenType`, `stutterStype`, `CrashType`)

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build:all

# Development servers
pnpm run dev:monitor-web    # Start React web dashboard
pnpm run docs:dev          # Start documentation site

# Individual package development
pnpm run start --filter monitor-web
```

### Building
```bash
# Build SDK only
cd packages/monitor-sdk && pnpm run build

# Build documentation
pnpm run docs:build
```

### Code Quality
```bash
# Lint all code
pnpm run lint

# Standardized commits (uses commitizen + cz-git)
pnpm run commit
```

## Key Configuration

### SDK Configuration (`packages/monitor-sdk/src/common/config.ts`)
Default configuration includes:
- `url`: Report endpoint
- `batchSize`: 5 (batch reporting threshold)
- `isAjax`: false (use sendBeacon by default)
- `containerElements`: ['html', 'body', '#app', '#root']
- Callback hooks: `reportBefore`, `reportAfter`, `reportSuccess`, `reportFail`

### Build System
- **Rollup** for SDK packaging (ESM + CJS outputs)
- **Rsbuild** for React web application
- **VitePress** for documentation
- **Turbo** for monorepo build orchestration

### Code Standards
- **ESLint** with TypeScript support, JSX enabled
- **Commitlint** with conventional commits and emoji support
- **Prettier** for code formatting
- **Husky** + **lint-staged** for pre-commit hooks

## Working with the SDK

### Adding New Monitoring Features
1. Create plugin in appropriate `plugins/` subdirectory
2. Define TypeScript interfaces in `src/types/index.ts`
3. Add trace types to `src/common/enum.ts`
4. Export from main `src/index.ts`

### Data Reporting Pipeline
All monitoring data flows through `lazyReportBatch()` in `src/common/report.ts`:
- Automatically selects optimal transport method based on payload size
- Implements batching and idle-time reporting for performance
- Supports retry logic and callback hooks

### Framework Integration
- **React**: Use `Error.ErrorBoundary` component for error boundaries
- **Vue**: Set `Error.initVueError` as global error handler
- **Vanilla JS**: Call `Error.initErrorEventListener()` for global error capture

## Testing and Debugging

Currently no formal test suite exists. Test by:
1. Building SDK: `pnpm run build:all`
2. Running web demo: `pnpm run dev:monitor-web`
3. Check browser console for "埋点上报----" logs from reporting system

## Documentation

Comprehensive docs in `docs/使用文档/` covering:
- Quick start guide
- Individual monitoring modules (error, performance, behavior, exception)
- Data reporting strategies
- Framework integration examples