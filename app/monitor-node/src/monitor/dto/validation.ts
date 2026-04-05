import {
  CreateMonitorBatchDto,
  MonitorBatchItemDto,
  MonitorBatchItemType,
} from './batch-monitor.dto';
import { CreateErrorLogDto } from './error-log.dto';
import { CreatePerformanceMetricDto } from './performance-metric.dto';
import {
  ErrorQueryDto,
  PerformanceQueryDto,
  SortOrder,
  StatsQueryDto,
  TrackingQueryDto,
} from './query.dto';
import { CreateTrackingEventDto } from './tracking-event.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseTimestamp(value: unknown, fieldName: string): Date {
  const date = parseDateLike(value);

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return date;
}

function validateObjectFields(
  value: unknown,
  fieldName: string,
): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return value;
}

function parseOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isString(value) || value.trim() === '') {
    throw new Error(`${fieldName} must be a string`);
  }

  return value;
}

function parseOptionalPositiveInt(
  value: unknown,
  fieldName: string,
  defaultValue: number,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  if (
    !isNumber(parsed) ||
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new Error(
      `${fieldName} must be an integer between ${minimum} and ${maximum}`,
    );
  }

  return parsed;
}

function parseOptionalDate(
  value: unknown,
  fieldName: string,
): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = parseDateLike(value);

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return date;
}

function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized === '') {
      return null;
    }

    const numeric = Number(normalized);
    return Number.isFinite(numeric) &&
      String(numeric) === normalized.replace(/^0+(?=\d)/, '')
      ? new Date(numeric)
      : new Date(normalized);
  }

  return null;
}

function validateSortOrder(value: unknown): SortOrder {
  if (value === undefined) {
    return 'desc';
  }

  if (value === 'asc' || value === 'desc') {
    return value;
  }

  throw new Error('sortOrder must be asc or desc');
}

function validateBaseQuery<
  T extends {
    appId?: string;
    startTime?: Date;
    endTime?: Date;
  },
>(body: unknown): T {
  if (!isRecord(body)) {
    throw new Error('query must be an object');
  }

  const appId = parseOptionalString(body.appId, 'appId');
  const startTime = parseOptionalDate(body.startTime, 'startTime');
  const endTime = parseOptionalDate(body.endTime, 'endTime');

  if (startTime && endTime && startTime.getTime() > endTime.getTime()) {
    throw new Error('startTime must be earlier than or equal to endTime');
  }

  return {
    appId,
    startTime,
    endTime,
  } as T;
}

const TRACKING_SORT_FIELDS = new Set([
  'timestamp',
  'eventName',
  'appId',
  'userId',
  'createdAt',
  'updatedAt',
]);
const PERFORMANCE_SORT_FIELDS = new Set([
  'timestamp',
  'metricType',
  'value',
  'appId',
  'createdAt',
  'updatedAt',
]);
const ERROR_SORT_FIELDS = new Set([
  'timestamp',
  'errorType',
  'message',
  'appId',
  'createdAt',
  'updatedAt',
]);

function validateListQuery<
  T extends {
    appId?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: SortOrder;
  },
>(body: unknown, allowedSortFields: Set<string>): T {
  const base = validateBaseQuery(body);

  if (!isRecord(body)) {
    throw new Error('query must be an object');
  }

  const sortBy = parseOptionalString(body.sortBy, 'sortBy') ?? 'timestamp';
  if (!allowedSortFields.has(sortBy)) {
    throw new Error(
      `sortBy must be one of: ${Array.from(allowedSortFields).join(', ')}`,
    );
  }

  return {
    ...base,
    page: parseOptionalPositiveInt(body.page, 'page', 1, 1),
    pageSize: parseOptionalPositiveInt(body.pageSize, 'pageSize', 20, 1, 100),
    sortBy,
    sortOrder: validateSortOrder(body.sortOrder),
  } as T;
}

export function validateTrackingQueryDto(body: unknown): TrackingQueryDto {
  return validateListQuery<TrackingQueryDto>(body, TRACKING_SORT_FIELDS);
}

export function validatePerformanceQueryDto(
  body: unknown,
): PerformanceQueryDto {
  return validateListQuery<PerformanceQueryDto>(body, PERFORMANCE_SORT_FIELDS);
}

export function validateErrorQueryDto(body: unknown): ErrorQueryDto {
  return validateListQuery<ErrorQueryDto>(body, ERROR_SORT_FIELDS);
}

export function validateStatsQueryDto(body: unknown): StatsQueryDto {
  return validateBaseQuery<StatsQueryDto>(body);
}

export function validateCreateTrackingEventDto(
  body: unknown,
): CreateTrackingEventDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object');
  }

  if (!isString(body.appId)) {
    throw new Error('appId is required');
  }
  if (!isString(body.eventName)) {
    throw new Error('eventName is required');
  }
  if (body.userId !== undefined && !isString(body.userId)) {
    throw new Error('userId must be a string');
  }

  return {
    appId: body.appId,
    eventName: body.eventName,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
    properties: validateObjectFields(body.properties, 'properties'),
    context: validateObjectFields(body.context, 'context'),
    userId: body.userId,
  };
}

export function validateCreatePerformanceMetricDto(
  body: unknown,
): CreatePerformanceMetricDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object');
  }

  if (!isString(body.appId)) {
    throw new Error('appId is required');
  }
  if (!isString(body.metricType)) {
    throw new Error('metricType is required');
  }
  if (!isNumber(body.value)) {
    throw new Error('value is required');
  }
  if (body.url !== undefined && !isString(body.url)) {
    throw new Error('url must be a string');
  }

  return {
    appId: body.appId,
    metricType: body.metricType,
    value: body.value,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
    url: body.url,
    extra: validateObjectFields(body.extra, 'extra'),
    context: validateObjectFields(body.context, 'context'),
  };
}

export function validateCreateErrorLogDto(body: unknown): CreateErrorLogDto {
  if (!isRecord(body)) {
    throw new Error('body must be an object');
  }

  if (!isString(body.appId)) {
    throw new Error('appId is required');
  }
  if (!isString(body.message)) {
    throw new Error('message is required');
  }
  if (body.errorType !== undefined && !isString(body.errorType)) {
    throw new Error('errorType must be a string');
  }
  if (body.stack !== undefined && !isString(body.stack)) {
    throw new Error('stack must be a string');
  }
  if (body.url !== undefined && !isString(body.url)) {
    throw new Error('url must be a string');
  }
  if (body.userAgent !== undefined && !isString(body.userAgent)) {
    throw new Error('userAgent must be a string');
  }

  return {
    appId: body.appId,
    message: body.message,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
    errorType: body.errorType,
    stack: body.stack,
    url: body.url,
    userAgent: body.userAgent,
  };
}

export function validateCreateMonitorBatchDto(
  body: unknown,
): CreateMonitorBatchDto {
  const items = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.items)
      ? body.items
      : null;

  if (!items) {
    throw new Error('items is required');
  }

  return {
    items: items.map(validateBatchItem),
  };
}

function validateBatchItem(body: unknown): MonitorBatchItemDto {
  if (!isRecord(body)) {
    throw new Error('batch item must be an object');
  }
  if (
    body.type !== MonitorBatchItemType.TRACKING &&
    body.type !== MonitorBatchItemType.PERFORMANCE &&
    body.type !== MonitorBatchItemType.ERROR
  ) {
    throw new Error('type must be tracking, performance, or error');
  }
  if (!isString(body.appId)) {
    throw new Error('appId is required');
  }

  const item: MonitorBatchItemDto = {
    type: body.type as MonitorBatchItemType,
    appId: body.appId,
    timestamp: parseTimestamp(body.timestamp, 'timestamp'),
  };

  if (body.properties !== undefined) {
    item.properties = validateObjectFields(body.properties, 'properties');
  }
  if (body.context !== undefined) {
    item.context = validateObjectFields(body.context, 'context');
  }
  if (body.userId !== undefined) {
    if (!isString(body.userId)) {
      throw new Error('userId must be a string');
    }
    item.userId = body.userId;
  }
  if (body.url !== undefined) {
    if (!isString(body.url)) {
      throw new Error('url must be a string');
    }
    item.url = body.url;
  }
  if (body.extra !== undefined) {
    item.extra = validateObjectFields(body.extra, 'extra');
  }
  if (body.errorType !== undefined) {
    if (!isString(body.errorType)) {
      throw new Error('errorType must be a string');
    }
    item.errorType = body.errorType;
  }
  if (body.stack !== undefined) {
    if (!isString(body.stack)) {
      throw new Error('stack must be a string');
    }
    item.stack = body.stack;
  }
  if (body.userAgent !== undefined) {
    if (!isString(body.userAgent)) {
      throw new Error('userAgent must be a string');
    }
    item.userAgent = body.userAgent;
  }

  if (body.type === MonitorBatchItemType.TRACKING) {
    if (!isString(body.eventName)) {
      throw new Error('eventName is required for tracking items');
    }
    item.eventName = body.eventName;
  }

  if (body.type === MonitorBatchItemType.PERFORMANCE) {
    if (!isString(body.metricType)) {
      throw new Error('metricType is required for performance items');
    }
    if (!isNumber(body.value)) {
      throw new Error('value is required for performance items');
    }
    item.metricType = body.metricType;
    item.value = body.value;
  }

  if (body.type === MonitorBatchItemType.ERROR) {
    if (!isString(body.message)) {
      throw new Error('message is required for error items');
    }
    item.message = body.message;
  }

  return item;
}
