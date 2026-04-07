export class CreateReplaySegmentDto {
  appId: string
  timestamp: Date
  segmentId: string
  startedAt: Date
  endedAt: Date
  eventCount: number
  route?: string
  reason?: string
  sample?: Array<Record<string, unknown>>
  context?: Record<string, unknown>
  userId?: string
  sessionId?: string
}
