export enum MonitorBatchItemType {
  TRACKING = 'tracking',
  PERFORMANCE = 'performance',
  ERROR = 'error',
}

export class MonitorBatchItemDto {
  type: MonitorBatchItemType;
  appId: string;
  timestamp: Date;
  eventName?: string;
  metricType?: string;
  value?: number;
  message?: string;
  properties?: Record<string, unknown>;
  context?: Record<string, unknown>;
  userId?: string;
  url?: string;
  extra?: Record<string, unknown>;
  errorType?: string;
  stack?: string;
  userAgent?: string;
}

export class CreateMonitorBatchDto {
  items: MonitorBatchItemDto[];
}
