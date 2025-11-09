# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EzMonitor SDK v2 is a lightweight, modular, tree-shakable frontend monitoring SDK built with TypeScript. This is a complete rewrite focusing on clean architecture, plugin extensibility, and optimal bundle size.

## Build Commands

```bash
# Build the SDK (creates ESM and CJS outputs)
npm run build

# Clean build artifacts
npm run clean

# Build from monorepo root (if in parent directory)
pnpm --filter ./packages/sdkv2 build
```

Output: `dist/index.esm.js`, `dist/index.cjs.js`, `dist/index.d.ts`

## Core Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Plugin Layer (Data Collection)        │  ← TrackingPlugin, ErrorPlugin, etc.
│  - Collect telemetry data               │
│  - Apply filters/processors             │
│  - Trigger events via EventBus          │
└─────────────────────────────────────────┘
                  ↓ Events
┌─────────────────────────────────────────┐
│  Core Layer (SDK Lifecycle)            │  ← SDKCore, PluginManager, ConfigManager
│  - Manage plugin lifecycle              │
│  - Configuration validation             │
│  - EventBus coordination                │
└─────────────────────────────────────────┘
                  ↓ report:data
┌─────────────────────────────────────────┐
│  Reporter Layer (Data Transmission)     │  ← Reporter, ReportQueue
│  - Unified caching (ReportQueue)        │
│  - Batch aggregation                    │
│  - Offline persistence (localStorage)   │
│  - Transport strategy (beacon/xhr/img)  │
│  - Retry with exponential backoff       │
└─────────────────────────────────────────┘
```

### Key Architectural Decisions

**1. Reporter Owns All Caching Logic (Recent Migration)**

Previously, TrackingPlugin had its own `TrackingCache` for batch and offline storage. This was **migrated to Reporter layer** for:
- **Single source of truth**: All plugins share one `ReportQueue`
- **Unified persistence**: `localStorage` managed centrally
- **Consistent batch behavior**: Batch size/interval configured once in `SDKConfig`
- **Plugin simplification**: Plugins focus only on data collection

Configuration moved from plugin-level to SDK-level:
```typescript
// ✅ New (unified in SDKConfig)
createSDK({
  enableBatch: true,
  batchSize: 50,
  batchInterval: 10000,
  enableOfflineCache: true,
  maxCacheSize: 1000,
});

// ❌ Old (scattered in plugins)
new TrackingPlugin({
  enableBatch: true,
  batchSize: 50,
  // ...
});
```

**2. Event-Driven Communication**

All inter-module communication uses `EventBus`:
- Plugins emit `INTERNAL_EVENTS.REPORT_DATA`
- Reporter listens and processes through `ReportQueue`
- No direct coupling between layers

**3. Plugin Lifecycle Management**

`PluginManager` handles:
- **Topological sorting**: Resolves dependencies (e.g., ErrorPlugin depends on ContextPlugin)
- **State machine**: `registered → initialized → started → stopped → destroyed`
- **Registration timing**: Plugins must be registered before `sdk.start()`

**4. Transactional Configuration**

`ConfigManager.merge()` validates before applying. If `SDKCore.init()` fails, config rolls back to previous state (snapshot-based).

**5. Transport Strategy Selection**

Reporter automatically chooses:
- `sendBeacon` (<60KB): Non-blocking, survives page unload
- `XHR` (large data or `forceXHR: true`): Full control, response handling
- `Image` (<2KB, no beacon support): Legacy fallback

## File Structure

```
src/
├── core/                    # Core SDK modules
│   ├── SDKCore.ts          # Main SDK class with lifecycle
│   ├── ConfigManager.ts    # Configuration with validation
│   ├── PluginManager.ts    # Plugin dependency resolution
│   ├── EventBus.ts         # Pub/sub event system
│   ├── Reporter.ts         # HTTP transport with retry
│   ├── ReportQueue.ts      # Unified cache + batch queue ✨ NEW
│   └── types/
│       ├── core.ts
│       └── reporter.ts     # Transport types, retry strategy
│
├── plugins/                 # Plugin implementations
│   └── tracking/           # User behavior tracking
│       ├── TrackingPlugin.ts      # Main plugin (simplified)
│       ├── ContextCollector.ts    # Auto-collect page/device/network
│       └── types.ts
│
├── types/                   # Shared types
│   ├── config.ts           # SDKConfig, DEFAULT_CONFIG
│   ├── plugin.ts           # IPlugin, PluginStatus
│   ├── events.ts           # INTERNAL_EVENTS, event payloads
│   └── index.ts
│
├── createSDK.ts            # Factory function
└── index.ts                # Public API exports
```

## Key Modules

### SDKCore (`src/core/SDKCore.ts`)

The main SDK controller managing the complete lifecycle:

**Lifecycle States**:
- `IDLE` → `INITIALIZING` → `INITIALIZED` → `STARTING` → `STARTED`
- `STARTED` → `STOPPING` → `STOPPED` → `DESTROYING` → `DESTROYED`

**Critical Methods**:
- `init(config?)`: Validates config, initializes plugins, creates Reporter
- `start()`: Starts all plugins, processes offline cache
- `destroy()`: Stops plugins, flushes queues, cleans up timers

**Error Handling**: Config validation errors trigger rollback to previous state.

### Reporter (`src/core/Reporter.ts`)

Handles all HTTP transmission with intelligent strategies:

**Core Responsibilities**:
- Listens to `INTERNAL_EVENTS.REPORT_DATA` and `REPORT_BATCH`
- Routes data through `ReportQueue` if batch enabled
- Selects transport (beacon/xhr/image) based on payload size
- Manages two queues:
  - `reportQueue` (ReportQueue): Batch aggregation + offline cache
  - `failedQueue` (in-memory): Retry with exponential backoff

**Retry Strategy** (default):
```typescript
{
  maxRetries: 3,
  initialDelay: 1000,      // 1s
  backoffMultiplier: 2,    // Exponential
  maxDelay: 30000          // Cap at 30s
}
```

**Lifecycle Hooks**:
- `beforeReport`: Transform data before sending
- `onReportSuccess`: Handle successful transmission
- `onReportError`: Handle failures
- `afterReport`: Always called (success or failure)

### ReportQueue (`src/core/ReportQueue.ts`) ✨ NEW

Unified queue for batch aggregation and offline caching:

**Features**:
- FIFO queue with configurable max size
- Automatic `localStorage` persistence
- Batch threshold detection (`add()` returns `true` when full)
- Statistics API (`getStats()`)

**Storage Key Format**: `${appId}_report_queue`

**Methods**:
- `add(data, type?)`: Add single item, returns if batch threshold reached
- `flush()`: Get all items and clear queue
- `getStats()`: Get queue size, oldest/newest timestamps, type distribution

### PluginManager (`src/core/PluginManager.ts`)

Manages plugin lifecycle with dependency resolution:

**Dependency Resolution**:
- Uses topological sort to determine init order
- Detects circular dependencies
- Initializes dependencies before dependents

**Example**:
```typescript
// Plugin declares dependencies
class ErrorPlugin implements IPlugin {
  dependencies = ['context'];  // Needs ContextPlugin first
}

// PluginManager ensures ContextPlugin.init() runs before ErrorPlugin.init()
```

**Safety Checks**:
- Cannot unregister if other plugins depend on it
- Cannot register after SDK is started

### TrackingPlugin (`src/plugins/tracking/TrackingPlugin.ts`)

Simplified user behavior tracking plugin (post-migration):

**What it does**:
- Collects event/page/user tracking data
- Applies `eventFilter` and `dataProcessor`
- Auto-collects context (page, device, network)
- Optionally tracks page navigation (SPA support)

**What it doesn't do anymore** (moved to Reporter):
- ❌ Batch aggregation
- ❌ localStorage caching
- ❌ Batch timer management

**Configuration** (minimal):
```typescript
new TrackingPlugin({
  autoTrackPage: true,      // Auto-track navigation
  dataProcessor: (data) => data,  // Transform data
  eventFilter: () => true,  // Filter events
});
```

### ContextCollector (`src/plugins/tracking/ContextCollector.ts`)

Auto-collects environmental context:
- **Page**: `url`, `title`, `referrer`
- **Device**: `userAgent`, screen size, viewport
- **Network**: `effectiveType`, `downlink` (via Network Information API)

## Configuration System

### SDKConfig Structure

```typescript
interface SDKConfig {
  // Identity
  appId?: string;
  userId?: string;
  sessionId?: string;      // Auto-generated

  // Endpoints
  reportUrl?: string;

  // Batch & Cache (unified in Reporter)
  enableBatch?: boolean;          // Default: true
  batchSize?: number;             // Default: 50
  batchInterval?: number;         // Default: 10000ms
  enableOfflineCache?: boolean;   // Default: true
  maxCacheSize?: number;          // Default: 1000

  // Transport
  forceXHR?: boolean;             // Force XHR instead of beacon

  // Retry
  enableRetry?: boolean;
  retryStrategy?: {
    maxRetries: number;
    initialDelay: number;
    backoffMultiplier: number;
    maxDelay: number;
  };

  // Lifecycle Hooks
  beforeReport?: (data: unknown) => void | Promise<void>;
  onReportSuccess?: (data: unknown) => void;
  onReportError?: (data: unknown, error: Error) => void;
  afterReport?: (data: unknown) => void;

  // Misc
  debug?: boolean;
  sampleRate?: number;            // 0-1
}
```

### Validation

`ConfigManager.validate()` checks:
- `appId`: string
- `reportUrl`: valid URL
- `userId`: string
- `sampleRate`: 0-1
- `batchSize`, `maxCacheSize`: positive numbers

Invalid config throws error and triggers rollback.

## Event System

### Internal Events (`INTERNAL_EVENTS`)

**SDK Lifecycle**:
- `sdk:init`, `sdk:start`, `sdk:stop`, `sdk:destroy`

**Plugin Lifecycle**:
- `plugin:registered`, `plugin:initialized`, `plugin:started`
- `plugin:stopped`, `plugin:destroyed`, `plugin:error`

**Configuration**:
- `config:changed` → `{ key, value, oldValue }`

**Reporting** (core data flow):
- `report:data` → Reporter receives single data item
- `report:batch` → Reporter receives batch array
- `report:success`, `report:error`

**Tracking** (for analytics):
- `tracking:event`, `tracking:page`, `tracking:user`, `tracking:batch`

### Event Flow Example

```typescript
// 1. Plugin emits tracking event
trackingPlugin.track('button_click', { id: 'submit' });

// 2. Plugin emits to EventBus
eventBus.emit(INTERNAL_EVENTS.REPORT_DATA, {
  type: 'tracking',
  data: { eventName: 'button_click', ... }
});

// 3. Reporter listens and processes
reporter.setupEventListeners() {
  eventBus.on(INTERNAL_EVENTS.REPORT_DATA, (payload) => {
    if (enableBatch) {
      reportQueue.add(payload.data);  // Add to queue
    } else {
      this.report(payload.data);      // Immediate send
    }
  });
}

// 4. Queue triggers flush when threshold reached
if (reportQueue.size() >= batchSize) {
  reporter.flushQueue();  // Send batch via HTTP
}
```

## Common Development Tasks

### Adding a New Plugin

1. Create plugin class implementing `IPlugin`:
```typescript
export class MyPlugin implements IPlugin {
  name = 'my-plugin';
  version = '1.0.0';
  dependencies = [];  // Add dependencies if needed
  status: PluginStatus = 'registered';

  async init(config: SDKConfig, eventBus: EventBus) {
    // Setup listeners, initialize state
  }

  async start() {
    // Start collecting data
  }

  async stop() {
    // Clean up timers, flush data
  }

  async destroy() {
    // Final cleanup
  }
}
```

2. Emit data via EventBus:
```typescript
this.eventBus.emit(INTERNAL_EVENTS.REPORT_DATA, {
  type: 'my-plugin',
  data: collectedData,
});
```

3. Register plugin:
```typescript
const sdk = createSDK({ ... });
sdk.use(new MyPlugin(pluginConfig));
await sdk.init();
await sdk.start();
```

**Important**: All caching/batching is handled by Reporter. Plugins should only collect and emit data.

### Modifying Reporter Behavior

**Changing Transport Strategy**:

Edit `Reporter.selectTransportType()` in `src/core/Reporter.ts`:
```typescript
private selectTransportType(payload: ReportPayload): TransportType {
  if (this.reporterConfig.forceXHR) return TransportType.XHR;

  const dataSize = this.getDataSize(payload);

  // Customize thresholds here
  if (this.isSupportBeacon() && dataSize < 60) {
    return TransportType.BEACON;
  }
  // ...
}
```

**Adding Custom Transport**:

1. Add to enum in `src/core/types/reporter.ts`:
```typescript
export enum TransportType {
  BEACON = 'beacon',
  XHR = 'xhr',
  IMAGE = 'image',
  FETCH = 'fetch',  // NEW
}
```

2. Implement in `Reporter.send()`:
```typescript
switch (transportType) {
  case TransportType.FETCH:
    response = await this.sendViaFetch(jsonData);
    break;
}
```

### Testing in Browser

Build and create HTML file:
```html
<script type="module">
  import { createSDK, TrackingPlugin } from './dist/index.esm.js';

  const sdk = createSDK({
    appId: 'test-app',
    reportUrl: 'https://httpbin.org/post',
    debug: true,
    enableBatch: true,
    batchSize: 5,
  });

  const tracking = new TrackingPlugin({ autoTrackPage: true });
  sdk.use(tracking);

  await sdk.init();
  await sdk.start();

  // Trigger events
  tracking.track('test_event', { foo: 'bar' });
</script>
```

Check browser console for `[Reporter]` logs and localStorage for `{appId}_report_queue`.

## Important Notes

### Recent Architecture Changes

**Migration: TrackingCache → ReportQueue** (completed)
- Removed `TrackingCache.ts` from TrackingPlugin
- Removed `enableBatch`, `batchSize`, `batchInterval` from `TrackingPluginConfig`
- Added unified `ReportQueue` in Reporter layer
- Moved batch/cache config to `SDKConfig`

**Impact**: When adding new plugins, do NOT implement caching logic. Emit to EventBus and let Reporter handle batching/persistence.

### Plugin Registration Timing

Plugins **must** be registered before `sdk.start()`:
```typescript
// ✅ Correct
const sdk = createSDK(config);
sdk.use(plugin1);
sdk.use(plugin2);
await sdk.init();
await sdk.start();

// ❌ Wrong - throws error
await sdk.start();
sdk.use(plugin3);  // Error: Cannot register after started
```

### TypeScript Patterns

**Avoid `any`, use `unknown`**:
```typescript
// ❌ Bad
properties?: Record<string, any>

// ✅ Good
properties?: Record<string, unknown>
```

**Event handler typing**:
```typescript
// Define payload types in src/types/events.ts
interface ReportEvents {
  'report:data': { type: string; data: unknown };
}

// Use in EventBus
eventBus.on(INTERNAL_EVENTS.REPORT_DATA, (payload) => {
  // payload is typed as { type: string; data: unknown }
});
```

### Debugging

**Enable debug mode**:
```typescript
createSDK({ debug: true });
```

Logs include:
- `[SDKCore]` - Lifecycle state changes
- `[ConfigManager]` - Config validation errors
- `[PluginManager]` - Plugin initialization order
- `[Reporter]` - Transport selection, batch flushes
- `[ReportQueue]` - Queue operations
- `[TrackingPlugin]` - Event tracking

**Check offline cache**:
```javascript
// In browser console
localStorage.getItem('your-app-id_report_queue');
```

**Monitor network**:
- Look for requests to `reportUrl`
- Check `sendBeacon` calls in Network tab (Type: "ping")
- XHR requests should have `Content-Type: application/json`

## Build System

Uses Rollup with TypeScript plugin:
- Input: `src/index.ts`
- Output: ESM (`index.esm.js`), CJS (`index.cjs.js`), types (`index.d.ts`)
- Tree-shaking: Enabled via `sideEffects: false` in package.json

The SDK is designed for optimal tree-shaking - unused plugins won't be included in user bundles.
