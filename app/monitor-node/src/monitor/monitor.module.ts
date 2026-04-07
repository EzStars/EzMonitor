import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MonitorController } from './controllers'
import {
  ErrorLog,
  ErrorLogSchema,
  PerformanceMetric,
  PerformanceMetricSchema,
  ReplaySegment,
  ReplaySegmentSchema,
  TrackingEvent,
  TrackingEventSchema,
} from './schemas'
import { MonitorService, SourceMapService } from './services'

@Module({
  controllers: [MonitorController],
  imports: [
    MongooseModule.forFeature([
      { name: TrackingEvent.name, schema: TrackingEventSchema },
      { name: PerformanceMetric.name, schema: PerformanceMetricSchema },
      { name: ErrorLog.name, schema: ErrorLogSchema },
      { name: ReplaySegment.name, schema: ReplaySegmentSchema },
    ]),
  ],
  providers: [MonitorService, SourceMapService],
  exports: [MongooseModule, MonitorService],
})
export class MonitorModule {}
