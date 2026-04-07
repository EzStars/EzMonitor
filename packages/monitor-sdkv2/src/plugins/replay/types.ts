export type ReplayEventType
  = | 'dom_snapshot'
    | 'click'
    | 'input'
    | 'scroll'
    | 'route'
    | 'visibility'
    | 'rrweb'

export type ReplayRecordMode = 'native' | 'rrweb'

export interface ReplayEventRecord {
  type: ReplayEventType
  at: number
  data: Record<string, unknown>
}

export interface ReplaySegmentContext {
  mode: ReplayRecordMode
  segmentId: string
  startedAt: number
  endedAt: number
  eventCount: number
  route?: string
  sample: ReplayEventRecord[]
  rrwebEvents?: Array<Record<string, unknown>>
}

export interface ReplayErrorContext {
  mode?: ReplayRecordMode
  segmentId: string
  lastEventAt: number
  eventCount: number
  route?: string
  sample: ReplayEventRecord[]
}

export interface ReplayPluginConfig {
  recordMode?: ReplayRecordMode
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
