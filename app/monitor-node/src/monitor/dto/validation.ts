import type { AiAnalyzeErrorDto, AiErrorFrameDto } from './ai.dto'
import type {
  CreateMonitorBatchDto,
  MonitorBatchItemDto,
} from './batch-monitor.dto'
import type { CreateErrorLogDto } from './error-log.dto'
import type { CreatePerformanceMetricDto } from './performance-metric.dto'
import type {
  ErrorQueryDto,
  PerformanceQueryDto,
  ReplayQueryDto,
  SortOrder,
  StatsQueryDto,
  TrackingQueryDto,
} from './query.dto'
import type { CreateReplaySegmentDto } from './replay.dto'
import type { UploadSourceMapDto } from './sourcemap.dto'
import type { CreateTrackingEventDto } from './tracking-event.dto'
import {
  MonitorBatchItemType,
} from './batch-monitor.dto'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseTimestamp(value: unknown, fieldName: string): Date {
  const date = parseDateLike(value)

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`)
  }

  return date
}

function validateObjectFields(
  value: unknown,
  fieldName: string,
): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isRecord(value)) {
    throw new Error(`${fieldName} must be an object`)
  }

  return value
}

function parseErrorFrames(value: unknown): Array<Record<string, unknown>> | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new TypeError('frames must be an array')
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`frames[${index}] must be an object`)
    }

    const parsed: Record<string, unknown> = {}
    const stringFields = ['file', 'functionName', 'raw', 'originalFile', 'originalFunctionName']
    const numberFields = ['line', 'column', 'originalLine', 'originalColumn']

    for (const field of stringFields) {
      if (entry[field] !== undefined && !isString(entry[field])) {
        throw new Error(`frames[${index}].${field} must be a string`)
      }
      if (entry[field] !== undefined) {
        parsed[field] = entry[field]
      }
    }

    for (const field of numberFields) {
      if (entry[field] !== undefined && !isNumber(entry[field])) {
        throw new Error(`frames[${index}].${field} must be a number`)
      }
      if (entry[field] !== undefined) {
        parsed[field] = entry[field]
      }
    }

    return parsed
  })
}

function parseOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isString(value) || value.trim() === '') {
    throw new Error(`${fieldName} must be a string`)
  }

  return value
}

function parseOptionalPositiveInt(
  value: unknown,
  fieldName: string,
  defaultValue: number,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined) {
    return defaultValue
  }

  const parsed = typeof value === 'string' ? Number(value) : value
  if (
    !isNumber(parsed)
    || !Number.isInteger(parsed)
    || parsed < minimum
    || parsed > maximum
  ) {
    throw new Error(
      `${fieldName} must be an integer between ${minimum} and ${maximum}`,
    )
  }

  return parsed
}

function parseOptionalDate(
  value: unknown,
  fieldName: string,
): Date | undefined {
  if (value === undefined) {
    return undefined
  }

  const date = parseDateLike(value)

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`)
  }

  return date
}

function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'number') {
    return new Date(value)
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (normalized === '') {
      return null
    }

    const numeric = Number(normalized)
    return Number.isFinite(numeric)
      && String(numeric) === normalized.replace(/^0+(?=\d)/, '')
      ? new Date(numeric)
      : new Date(normalized)
  }

  return null
}

function validateSortOrder(value: unknown): SortOrder {
  if (value === undefined) {
    return 'desc'
  }

  if (value === 'asc' || value === 'desc') {
    return value
  }

  throw new Error('sortOrder must be asc or desc')
}

function validateBaseQuery<
  T extends {
    appId?: string
    startTime?: Date
    endTime?: Date
  },
>(body: unknown): T {
  if (!isRecord(body)) {
    throw new Error('query must be an object')
  }

  const appId = parseOptionalString(body.appId, 'appId')
  const startTime = parseOptionalDate(body.startTime, 'startTime')
  const endTime = parseOptionalDate(body.endTime, 'endTime')

  if (startTime && endTime && startTime.getTime() > endTime.getTime()) {
    throw new Error('startTime must be earlier than or equal to endTime')
  }

  return {
    appId,
    startTime,
    endTime,
  } as T
}

const TRACKING_SORT_FIELDS = new Set([
  'timestamp',
  'eventName',
  'appId',
  'userId',
  'createdAt',
  'updatedAt',
])
const PERFORMANCE_SORT_FIELDS = new Set([
  'timestamp',
  'metricType',
  'value',
  'appId',
  'createdAt',
  'updatedAt',
])
const ERROR_SORT_FIELDS = new Set([
  'timestamp',
  'errorType',
  'message',
  'appId',
  'createdAt',
  'updatedAt',
])
const REPLAY_SORT_FIELDS = new Set([
  'timestamp',
  'segmentId',
  'route',
  'eventCount',
  'appId',
  'createdAt',
  'updatedAt',
])

function validateListQuery<
  T extends {
    appId?: string
    startTime?: Date
    endTime?: Date
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: SortOrder
  },
>(body: unknown, allowedSortFields: Set<string>): T {
  const base = validateBaseQuery(body)

  if (!isRecord(body)) {
    throw new Error('query must be an object')
  }

  const sortBy = parseOptionalString(body.sortBy, 'sortBy') ?? 'timestamp'
  if (!allowedSortFields.has(sortBy)) {
    throw new Error(
      `sortBy must be one of: ${Array.from(allowedSortFields).join(', ')}`,
    )
  }

  return {
    ...base,
    page: parseOptionalPositiveInt(body.page, 'page', 1, 1),
    pageSize: parseOptionalPositiveInt(body.pageSize, 'pageSize', 20, 1, 100),
    sortBy,
    sortOrder: validateSortOrder(body.sortOrder),
  } as T
}

export function validateTrackingQueryDto(body: unknown): TrackingQueryDto {
  return validateListQuery<TrackingQueryDto>(body, TRACKING_SORT_FIELDS)
}

export function validatePerformanceQueryDto(
  body: unknown,
): PerformanceQueryDto {
  return validateListQuery<PerformanceQueryDto>(body, PERFORMANCE_SORT_FIELDS)
}

export function validateErrorQueryDto(body: unknown): ErrorQueryDto {
  return validateListQuery<ErrorQueryDto>(body, ERROR_SORT_FIELDS)
}

export function validateReplayQueryDto(body: unknown): ReplayQueryDto {
  const query = validateListQuery<ReplayQueryDto>(body, REPLAY_SORT_FIELDS)

  if (isRecord(body) && body.segmentId !== undefined) {
    query.segmentId = parseOptionalString(body.segmentId, 'segmentId')
  }

  return query
}

export function validateStatsQueryDto(body: unknown): StatsQueryDto {
  return validateBaseQuery<StatsQueryDto>(body)
}

export function validateCreateTrackingEventDto(
  body: unknown,
): CreateTrackingEventDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  if (!isString(body.appId)) {
    throw new Error('appId is required')
  }
  if (!isString(body.eventName)) {
    throw new Error('eventName is required')
  }
  if (body.userId !== undefined && !isString(body.userId)) {
    throw new Error('userId must be a string')
  }

  return {
    appId: body.appId,
    eventName: body.eventName,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
    properties: validateObjectFields(body.properties, 'properties'),
    context: validateObjectFields(body.context, 'context'),
    userId: body.userId,
  }
}

export function validateCreateReplaySegmentDto(body: unknown): CreateReplaySegmentDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  if (!isString(body.appId)) {
    throw new Error('appId is required')
  }
  if (!isString(body.segmentId)) {
    throw new Error('segmentId is required')
  }
  if (!isNumber(body.eventCount)) {
    throw new Error('eventCount is required')
  }

  const mode = body.mode === undefined ? undefined : parseOptionalString(body.mode, 'mode')
  if (mode && mode !== 'native' && mode !== 'rrweb') {
    throw new Error('mode must be native or rrweb')
  }

  const rrwebEvents = body.rrwebEvents === undefined
    ? undefined
    : Array.isArray(body.rrwebEvents)
      ? (body.rrwebEvents as Array<Record<string, unknown>>)
      : undefined
  if (body.rrwebEvents !== undefined && !rrwebEvents) {
    throw new Error('rrwebEvents must be an array')
  }

  return {
    appId: body.appId,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
    mode: mode as CreateReplaySegmentDto['mode'],
    segmentId: body.segmentId,
    startedAt: parseTimestamp(body.startedAt, 'startedAt'),
    endedAt: parseTimestamp(body.endedAt, 'endedAt'),
    eventCount: body.eventCount,
    route: parseOptionalString(body.route, 'route'),
    reason: parseOptionalString(body.reason, 'reason'),
    sample: Array.isArray(body.sample) ? (body.sample as Array<Record<string, unknown>>) : undefined,
    rrwebEvents,
    context: validateObjectFields(body.context, 'context'),
    userId: parseOptionalString(body.userId, 'userId'),
    sessionId: parseOptionalString(body.sessionId, 'sessionId'),
  }
}

export function validateCreatePerformanceMetricDto(
  body: unknown,
): CreatePerformanceMetricDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  if (!isString(body.appId)) {
    throw new Error('appId is required')
  }
  if (!isString(body.metricType)) {
    throw new Error('metricType is required')
  }
  if (!isNumber(body.value)) {
    throw new Error('value is required')
  }
  if (body.url !== undefined && !isString(body.url)) {
    throw new Error('url must be a string')
  }

  return {
    appId: body.appId,
    metricType: body.metricType,
    value: body.value,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
    url: body.url,
    extra: validateObjectFields(body.extra, 'extra'),
    context: validateObjectFields(body.context, 'context'),
  }
}

export function validateCreateErrorLogDto(body: unknown): CreateErrorLogDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  if (!isString(body.appId)) {
    throw new Error('appId is required')
  }
  if (!isString(body.message)) {
    throw new Error('message is required')
  }
  if (body.errorType !== undefined && !isString(body.errorType)) {
    throw new Error('errorType must be a string')
  }
  if (body.stack !== undefined && !isString(body.stack)) {
    throw new Error('stack must be a string')
  }
  if (body.url !== undefined && !isString(body.url)) {
    throw new Error('url must be a string')
  }
  if (body.userAgent !== undefined && !isString(body.userAgent)) {
    throw new Error('userAgent must be a string')
  }
  if (body.sessionId !== undefined && !isString(body.sessionId)) {
    throw new Error('sessionId must be a string')
  }
  if (body.appVersion !== undefined && !isString(body.appVersion)) {
    throw new Error('appVersion must be a string')
  }
  if (body.release !== undefined && !isString(body.release)) {
    throw new Error('release must be a string')
  }
  if (body.environment !== undefined && !isString(body.environment)) {
    throw new Error('environment must be a string')
  }
  if (body.fingerprint !== undefined && !isString(body.fingerprint)) {
    throw new Error('fingerprint must be a string')
  }
  if (body.traceId !== undefined && !isString(body.traceId)) {
    throw new Error('traceId must be a string')
  }

  return {
    appId: body.appId,
    message: body.message,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
    errorType: body.errorType,
    stack: body.stack,
    url: body.url,
    userAgent: body.userAgent,
    sessionId: body.sessionId,
    userId: parseOptionalString(body.userId, 'userId'),
    appVersion: body.appVersion,
    release: body.release,
    environment: body.environment,
    fingerprint: body.fingerprint,
    traceId: body.traceId,
    frames: parseErrorFrames(body.frames) as CreateErrorLogDto['frames'],
    detail: validateObjectFields(body.detail, 'detail'),
  }
}

export function validateUploadSourceMapDto(body: unknown): UploadSourceMapDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  if (!isString(body.appId) || body.appId.trim() === '') {
    throw new Error('appId is required')
  }
  if (!isString(body.release) || body.release.trim() === '') {
    throw new Error('release is required')
  }
  if (!isString(body.file) || body.file.trim() === '') {
    throw new Error('file is required')
  }
  if (!isString(body.map) || body.map.trim() === '') {
    throw new Error('map is required')
  }

  return {
    appId: body.appId,
    release: body.release,
    file: body.file,
    map: body.map,
  }
}

export function validateCreateMonitorBatchDto(
  body: unknown,
): CreateMonitorBatchDto {
  const items = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.items)
      ? body.items
      : null

  if (!items) {
    throw new Error('items is required')
  }

  return {
    items: items.map(validateBatchItem),
  }
}

function validateBatchItem(body: unknown): MonitorBatchItemDto {
  if (!isRecord(body)) {
    throw new Error('batch item must be an object')
  }
  if (
    body.type !== MonitorBatchItemType.TRACKING
    && body.type !== MonitorBatchItemType.PERFORMANCE
    && body.type !== MonitorBatchItemType.ERROR
    && body.type !== MonitorBatchItemType.REPLAY
  ) {
    throw new Error('type must be tracking, performance, error, or replay')
  }
  if (!isString(body.appId)) {
    throw new Error('appId is required')
  }

  const item: MonitorBatchItemDto = {
    type: body.type as MonitorBatchItemType,
    appId: body.appId,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
  }

  if (body.properties !== undefined) {
    item.properties = validateObjectFields(body.properties, 'properties')
  }
  if (body.context !== undefined) {
    item.context = validateObjectFields(body.context, 'context')
  }
  if (body.userId !== undefined) {
    if (!isString(body.userId)) {
      throw new Error('userId must be a string')
    }
    item.userId = body.userId
  }
  if (body.url !== undefined) {
    if (!isString(body.url)) {
      throw new Error('url must be a string')
    }
    item.url = body.url
  }
  if (body.extra !== undefined) {
    item.extra = validateObjectFields(body.extra, 'extra')
  }
  if (body.errorType !== undefined) {
    if (!isString(body.errorType)) {
      throw new Error('errorType must be a string')
    }
    item.errorType = body.errorType
  }
  if (body.stack !== undefined) {
    if (!isString(body.stack)) {
      throw new Error('stack must be a string')
    }
    item.stack = body.stack
  }
  if (body.userAgent !== undefined) {
    if (!isString(body.userAgent)) {
      throw new Error('userAgent must be a string')
    }
    item.userAgent = body.userAgent
  }
  if (body.sessionId !== undefined) {
    if (!isString(body.sessionId)) {
      throw new Error('sessionId must be a string')
    }
    item.sessionId = body.sessionId
  }
  if (body.appVersion !== undefined) {
    if (!isString(body.appVersion)) {
      throw new Error('appVersion must be a string')
    }
    item.appVersion = body.appVersion
  }
  if (body.release !== undefined) {
    if (!isString(body.release)) {
      throw new Error('release must be a string')
    }
    item.release = body.release
  }
  if (body.environment !== undefined) {
    if (!isString(body.environment)) {
      throw new Error('environment must be a string')
    }
    item.environment = body.environment
  }
  if (body.fingerprint !== undefined) {
    if (!isString(body.fingerprint)) {
      throw new Error('fingerprint must be a string')
    }
    item.fingerprint = body.fingerprint
  }
  if (body.traceId !== undefined) {
    if (!isString(body.traceId)) {
      throw new Error('traceId must be a string')
    }
    item.traceId = body.traceId
  }
  if (body.frames !== undefined) {
    item.frames = parseErrorFrames(body.frames) as MonitorBatchItemDto['frames']
  }
  if (body.detail !== undefined) {
    item.detail = validateObjectFields(body.detail, 'detail')
  }

  if (body.type === MonitorBatchItemType.TRACKING) {
    if (!isString(body.eventName)) {
      throw new Error('eventName is required for tracking items')
    }
    item.eventName = body.eventName
  }

  if (body.type === MonitorBatchItemType.PERFORMANCE) {
    if (!isString(body.metricType)) {
      throw new Error('metricType is required for performance items')
    }
    if (!isNumber(body.value)) {
      throw new Error('value is required for performance items')
    }
    item.metricType = body.metricType
    item.value = body.value
  }

  if (body.type === MonitorBatchItemType.ERROR) {
    if (!isString(body.message)) {
      throw new Error('message is required for error items')
    }
    item.message = body.message
  }

  if (body.type === MonitorBatchItemType.REPLAY) {
    if (!isString(body.segmentId)) {
      throw new Error('segmentId is required for replay items')
    }
    if (!isNumber(body.eventCount)) {
      throw new Error('eventCount is required for replay items')
    }
    if (!body.startedAt) {
      throw new Error('startedAt is required for replay items')
    }
    if (!body.endedAt) {
      throw new Error('endedAt is required for replay items')
    }

    item.segmentId = body.segmentId
    const mode = body.mode === undefined ? undefined : parseOptionalString(body.mode, 'mode')
    if (mode && mode !== 'native' && mode !== 'rrweb') {
      throw new Error('mode must be native or rrweb for replay items')
    }
    item.mode = mode as MonitorBatchItemDto['mode']
    item.eventCount = body.eventCount
    item.startedAt = parseTimestamp(body.startedAt, 'startedAt')
    item.endedAt = parseTimestamp(body.endedAt, 'endedAt')
    item.route = parseOptionalString(body.route, 'route')
    item.reason = parseOptionalString(body.reason, 'reason')
    if (body.sample !== undefined) {
      if (!Array.isArray(body.sample)) {
        throw new TypeError('sample must be an array for replay items')
      }
      item.sample = body.sample as Array<Record<string, unknown>>
    }
    if (body.rrwebEvents !== undefined) {
      if (!Array.isArray(body.rrwebEvents)) {
        throw new TypeError('rrwebEvents must be an array for replay items')
      }
      item.rrwebEvents = body.rrwebEvents as Array<Record<string, unknown>>
    }
  }

  return item
}

export function validateAiAnalyzeErrorDto(body: unknown): AiAnalyzeErrorDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  if (!isString(body.message)) {
    throw new Error('message is required')
  }

  const frames: AiErrorFrameDto[] | undefined = body.frames === undefined
    ? undefined
    : (() => {
        if (!Array.isArray(body.frames)) {
          throw new TypeError('frames must be an array')
        }
        return (body.frames as unknown[]).map((entry, index) => {
          if (!isRecord(entry)) {
            throw new Error(`frames[${index}] must be an object`)
          }
          const frame: AiErrorFrameDto = {}
          const stringFields: (keyof AiErrorFrameDto)[] = ['file', 'functionName', 'originalFile', 'originalFunctionName']
          const numberFields: (keyof AiErrorFrameDto)[] = ['line', 'column', 'originalLine', 'originalColumn']
          for (const field of stringFields) {
            if (entry[field] !== undefined) {
              if (!isString(entry[field])) {
                throw new Error(`frames[${index}].${field} must be a string`)
              }
              (frame as Record<string, unknown>)[field] = entry[field]
            }
          }
          for (const field of numberFields) {
            if (entry[field] !== undefined) {
              const val = entry[field]
              if (!isNumber(val as unknown)) {
                throw new Error(`frames[${index}].${field} must be a number`)
              }
              (frame as Record<string, unknown>)[field] = val
            }
          }
          return frame
        })
      })()

  return {
    message: body.message,
    errorType: parseOptionalString(body.errorType, 'errorType'),
    stack: parseOptionalString(body.stack, 'stack'),
    url: parseOptionalString(body.url, 'url'),
    frames,
  }
}
