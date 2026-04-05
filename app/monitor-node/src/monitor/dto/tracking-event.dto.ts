export class CreateTrackingEventDto {
  appId: string;
  timestamp: Date;
  eventName: string;
  properties?: Record<string, unknown>;
  context?: Record<string, unknown>;
  userId?: string;
}
