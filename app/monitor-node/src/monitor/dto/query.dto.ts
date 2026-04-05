export type SortOrder = 'asc' | 'desc'

export class BaseQueryDto {
  appId?: string
  startTime?: Date
  endTime?: Date
}

export class ListQueryDto extends BaseQueryDto {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: SortOrder
}

export class TrackingQueryDto extends ListQueryDto {}

export class PerformanceQueryDto extends ListQueryDto {}

export class ErrorQueryDto extends ListQueryDto {}

export class StatsQueryDto extends BaseQueryDto {}
