import type { AiAnalyzeErrorDto, AiErrorFrameDto, AiStatusQueryDto } from './ai.dto'
import type {
  AlertEventQueryDto,
  AlertEventStatus,
  AlertMetric,
  AlertRuleQueryDto,
  AlertSeverity,
  AlertStreamQueryDto,
  CreateAlertRuleDto,
  UpdateAlertEventStatusDto,
  UpdateAlertRuleDto,
} from './alert.dto'
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
  ALERT_EVENT_STATUSES,
  ALERT_METRICS,
  ALERT_SEVERITIES,
  DEDUPE_STRATEGIES,
} from './alert.dto'
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

function parseMaybePositiveInt(
  value: unknown,
  fieldName: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER,
): number | undefined {
  if (value === undefined) {
    return undefined
  }

  return parseOptionalPositiveInt(value, fieldName, minimum, minimum, maximum)
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true
    }
    if (value === 'false') {
      return false
    }
  }

  throw new Error(`${fieldName} must be a boolean`)
}

function parseRequiredEnum<T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  options: T,
): T[number] {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} is required`)
  }

  const normalized = value.trim()
  if ((options as readonly string[]).includes(normalized)) {
    return normalized as T[number]
  }

  throw new Error(`${fieldName} must be one of: ${options.join(', ')}`)
}

function parseOptionalEnum<T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  options: T,
): T[number] | undefined {
  if (value === undefined) {
    return undefined
  }

  return parseRequiredEnum(value, fieldName, options)
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

export function validateCreateAlertRuleDto(body: unknown): CreateAlertRuleDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  const name = parseOptionalString(body.name, 'name')
  if (!name) {
    throw new Error('name is required')
  }

  return {
    name,
    appId: parseOptionalString(body.appId, 'appId'),
    metric: parseRequiredEnum(body.metric, 'metric', ALERT_METRICS) as AlertMetric,
    windowSec: parseOptionalPositiveInt(body.windowSec, 'windowSec', 300, 30, 86400),
    suppressSec: parseOptionalPositiveInt(body.suppressSec, 'suppressSec', 300, 30, 86400),
    dedupeStrategy: parseOptionalEnum(body.dedupeStrategy, 'dedupeStrategy', DEDUPE_STRATEGIES),
    threshold: parseOptionalPositiveInt(body.threshold, 'threshold', 5, 1, 100000),
    severity: parseRequiredEnum(body.severity, 'severity', ALERT_SEVERITIES) as AlertSeverity,
    enabled: parseOptionalBoolean(body.enabled, 'enabled'),
    errorType: parseOptionalString(body.errorType, 'errorType'),
    fingerprint: parseOptionalString(body.fingerprint, 'fingerprint'),
  }
}

export function validateUpdateAlertRuleDto(body: unknown): UpdateAlertRuleDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  return {
    name: parseOptionalString(body.name, 'name'),
    metric: parseOptionalEnum(body.metric, 'metric', ALERT_METRICS) as AlertMetric | undefined,
    windowSec: parseMaybePositiveInt(body.windowSec, 'windowSec', 30, 86400),
    suppressSec: parseMaybePositiveInt(body.suppressSec, 'suppressSec', 30, 86400),
    dedupeStrategy: parseOptionalEnum(body.dedupeStrategy, 'dedupeStrategy', DEDUPE_STRATEGIES),
    threshold: parseMaybePositiveInt(body.threshold, 'threshold', 1, 100000),
    severity: parseOptionalEnum(body.severity, 'severity', ALERT_SEVERITIES) as AlertSeverity | undefined,
    enabled: parseOptionalBoolean(body.enabled, 'enabled'),
    errorType: parseOptionalString(body.errorType, 'errorType'),
    fingerprint: parseOptionalString(body.fingerprint, 'fingerprint'),
  }
}

export function validateAlertRuleQueryDto(body: unknown): AlertRuleQueryDto {
  if (!isRecord(body)) {
    throw new Error('query must be an object')
  }

  return {
    appId: parseOptionalString(body.appId, 'appId'),
    enabled: parseOptionalBoolean(body.enabled, 'enabled'),
    metric: parseOptionalEnum(body.metric, 'metric', ALERT_METRICS) as AlertMetric | undefined,
    page: parseOptionalPositiveInt(body.page, 'page', 1, 1, 100000),
    pageSize: parseOptionalPositiveInt(body.pageSize, 'pageSize', 20, 1, 100),
  }
}

export function validateAlertEventQueryDto(body: unknown): AlertEventQueryDto {
  const base = validateBaseQuery<AlertEventQueryDto>(body)
  if (!isRecord(body)) {
    throw new Error('query must be an object')
  }

  return {
    ...base,
    status: parseOptionalEnum(body.status, 'status', ALERT_EVENT_STATUSES) as AlertEventStatus | undefined,
    page: parseOptionalPositiveInt(body.page, 'page', 1, 1, 100000),
    pageSize: parseOptionalPositiveInt(body.pageSize, 'pageSize', 20, 1, 100),
  }
}

export function validateAlertEventStatusDto(body: unknown): UpdateAlertEventStatusDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object')
  }

  return {
    status: parseRequiredEnum(body.status, 'status', ALERT_EVENT_STATUSES) as AlertEventStatus,
  }
}

export function validateAlertStreamQueryDto(body: unknown): AlertStreamQueryDto {
  if (!isRecord(body)) {
    throw new Error('query must be an object')
  }

  return {
    appId: parseOptionalString(body.appId, 'appId'),
    limit: parseOptionalPositiveInt(body.limit, 'limit', 20, 1, 100),
  }
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
    apiKey: parseOptionalString(body.apiKey, 'apiKey'),
    apiBaseUrl: (() => {
      const value = parseOptionalString(body.apiBaseUrl, 'apiBaseUrl')
      if (!value) {
        return value
      }

      let parsedUrl: URL
      try {
        parsedUrl = new URL(value)
      }
      catch {
        throw new Error('apiBaseUrl must be a valid URL')
      }

      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('apiBaseUrl must use http or https')
      }

      return value
    })(),
    model: parseOptionalString(body.model, 'model'),
  }
}

export function validateAiStatusQueryDto(query: unknown): AiStatusQueryDto {
  if (!isRecord(query)) {
    throw new Error('query must be an object')
  }

  let hasClientApiKey = false
  if (query.hasClientApiKey !== undefined) {
    const raw = query.hasClientApiKey
    if (typeof raw === 'boolean') {
      hasClientApiKey = raw
    }
    else if (typeof raw === 'string') {
      if (raw === 'true') {
        hasClientApiKey = true
      }
      else if (raw === 'false') {
        hasClientApiKey = false
      }
      else {
        throw new Error('hasClientApiKey must be true or false')
      }
    }
    else {
      throw new TypeError('hasClientApiKey must be a boolean')
    }
  }

  const apiBaseUrl = parseOptionalString(query.apiBaseUrl, 'apiBaseUrl')
  if (apiBaseUrl) {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(apiBaseUrl)
    }
    catch {
      throw new Error('apiBaseUrl must be a valid URL')
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('apiBaseUrl must use http or https')
    }
  }

  return {
    hasClientApiKey,
    apiBaseUrl,
    model: parseOptionalString(query.model, 'model'),
  }
}
