import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '../auth'
import { AlertController, MonitorController, SseEventsController } from './controllers'
import {
  AlertEvent,
  AlertEventSchema,
  AlertRule,
  AlertRuleSchema,
  ErrorAnalysis,
  ErrorAnalysisSchema,
  ErrorLog,
  ErrorLogSchema,
  PerformanceMetric,
  PerformanceMetricSchema,
  ReplaySegment,
  ReplaySegmentSchema,
  TrackingEvent,
  TrackingEventSchema,
} from './schemas'
import {
  AiService,
  AlertEventService,
  AlertRuleService,
  ErrorAnalysisService,
  MonitorService,
  SourceMapService,
  SseBroadcastService,
} from './services'

@Module({
  controllers: [MonitorController, AlertController, SseEventsController],
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: TrackingEvent.name, schema: TrackingEventSchema },
      { name: PerformanceMetric.name, schema: PerformanceMetricSchema },
      { name: ErrorLog.name, schema: ErrorLogSchema },
      { name: ReplaySegment.name, schema: ReplaySegmentSchema },
      { name: AlertRule.name, schema: AlertRuleSchema },
      { name: AlertEvent.name, schema: AlertEventSchema },
      { name: ErrorAnalysis.name, schema: ErrorAnalysisSchema },
    ]),
  ],
  providers: [
    MonitorService,
    SourceMapService,
    AiService,
    AlertRuleService,
    AlertEventService,
    ErrorAnalysisService,
    SseBroadcastService,
  ],
  exports: [MongooseModule, MonitorService],
})
export class MonitorModule {}
