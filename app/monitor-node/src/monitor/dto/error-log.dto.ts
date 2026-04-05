export class CreateErrorLogDto {
  appId: string;
  timestamp: Date;
  message: string;
  errorType?: string;
  stack?: string;
  url?: string;
  userAgent?: string;
}
