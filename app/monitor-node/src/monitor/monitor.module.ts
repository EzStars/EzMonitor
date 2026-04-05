import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MonitorController } from './controllers'
import {
  ErrorLog,
  ErrorLogSchema,
  PerformanceMetric,
  PerformanceMetricSchema,
  TrackingEvent,
  TrackingEventSchema,
} from './schemas'
import { MonitorService } from './services'

@Module({
  controllers: [MonitorController],
  imports: [
    MongooseModule.forFeature([
      { name: TrackingEvent.name, schema: TrackingEventSchema },
      { name: PerformanceMetric.name, schema: PerformanceMetricSchema },
      { name: ErrorLog.name, schema: ErrorLogSchema },
    ]),
  ],
  providers: [MonitorService],
  exports: [MongooseModule, MonitorService],
})
export class MonitorModule {}
