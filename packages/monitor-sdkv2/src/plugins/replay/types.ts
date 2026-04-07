export type ReplayEventType
  = | 'dom_snapshot'
    | 'click'
    | 'input'
    | 'scroll'
    | 'route'
    | 'visibility'

export interface ReplayEventRecord {
  type: ReplayEventType
  at: number
  data: Record<string, unknown>
}

export interface ReplaySegmentContext {
  segmentId: string
  startedAt: number
  endedAt: number
  eventCount: number
  route?: string
  sample: ReplayEventRecord[]
}

export interface ReplayErrorContext {
  segmentId: string
  lastEventAt: number
  eventCount: number
  route?: string
  sample: ReplayEventRecord[]
}

export interface ReplayPluginConfig {
  sampleRate?: number
  flushIntervalMs?: number
  maxEvents?: number
  replayBufferMs?: number
  captureClick?: boolean
  captureInput?: boolean
  captureScroll?: boolean
  captureRoute?: boolean
  captureVisibility?: boolean
  captureSnapshot?: boolean
  snapshotOnStart?: boolean
  snapshotOnRoute?: boolean
  snapshotMaxLength?: number
  flushOnErrorHint?: boolean
  blockSelectors?: string[]
  maskSelectors?: string[]
  redactPatterns?: Array<string | RegExp>
  redactReplacement?: string
}
