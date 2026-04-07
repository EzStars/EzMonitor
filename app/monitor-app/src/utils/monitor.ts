import type { ErrorRecord, PerformanceRecord, ReplayRecord, TrackingRecord } from '../services/monitor'

export type DateLike = string | number | Date | undefined

export function toDate(value: DateLike): Date {
  if (value === undefined) {
    return new Date(Number.NaN)
  }

  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return new Date(value)
  }

  return new Date(0)
}

export function formatDateTime(value: DateLike): string {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function formatDate(value: DateLike): string {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
  }).format(value)
}

export function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}

export function getDayKey(value: DateLike): string {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) {
    return 'unknown'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getRecentDays(days = 7) {
  const result: { key: string, label: string }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    result.push({
      key: getDayKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    })
  }

  return result
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function percentile(values: number[], rank: number) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = clampNumber(Math.ceil((rank / 100) * sorted.length) - 1, 0, sorted.length - 1)
  return sorted[index]
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function groupCountsByDay<T>(
  records: T[],
  getTime: (record: T) => DateLike,
  getValue: (record: T) => number = () => 1,
) {
  const buckets = new Map<string, number>()

  for (const record of records) {
    const key = getDayKey(getTime(record))
    buckets.set(key, (buckets.get(key) ?? 0) + getValue(record))
  }

  return buckets
}

export function groupValuesByDay<T>(
  records: T[],
  getTime: (record: T) => DateLike,
  getValue: (record: T) => number,
) {
  const buckets = new Map<string, number[]>()

  for (const record of records) {
    const key = getDayKey(getTime(record))
    const values = buckets.get(key) ?? []
    values.push(getValue(record))
    buckets.set(key, values)
  }

  return buckets
}

export function collectLatestRecords(
  tracking: TrackingRecord[],
  performance: PerformanceRecord[],
  error: ErrorRecord[],
  replay: ReplayRecord[],
) {
  return [...tracking.map(item => ({ ...item, type: 'tracking' as const })), ...performance.map(item => ({
    ...item,
    type: 'performance' as const,
  })), ...error.map(item => ({
    ...item,
    type: 'error' as const,
  })), ...replay.map(item => ({
    ...item,
    type: 'replay' as const,
  }))].sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime())
}
