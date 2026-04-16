import type { MessageEvent } from '@nestjs/common'
import type { Observable } from 'rxjs'
import type { AlertEvent } from '../schemas/alert-event.schema'
import { Injectable } from '@nestjs/common'
import { interval, merge, Subject } from 'rxjs'
import { filter, map } from 'rxjs/operators'

export interface AlertStreamPayload {
  id?: string
  ruleId?: string
  ruleName: string
  appId?: string
  severity: string
  score: number
  suppressionHits: number
  status: string
  summary: string
  findings: string[]
  triggeredAt: string
}

@Injectable()
export class SseBroadcastService {
  private readonly alertSubject = new Subject<AlertStreamPayload>()

  stream(appId?: string): Observable<MessageEvent> {
    const alert$ = this.alertSubject.asObservable().pipe(
      filter(payload => !appId || payload.appId === appId),
      map(payload => ({
        type: 'alert',
        data: payload,
      }) as MessageEvent),
    )

    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        type: 'heartbeat',
        data: { ts: Date.now() },
      }) as MessageEvent),
    )

    return merge(alert$, heartbeat$)
  }

  emitAlert(event: AlertEvent): void {
    this.alertSubject.next({
      id: this.getEventId(event),
      ruleId: event.ruleId,
      ruleName: event.ruleName,
      appId: event.appId,
      severity: event.severity,
      score: event.score,
      suppressionHits: event.suppressionHits ?? 0,
      status: event.status,
      summary: event.summary,
      findings: event.findings ?? [],
      triggeredAt: event.triggeredAt.toISOString(),
    })
  }

  private toStringId(value: unknown): string | undefined {
    if (typeof value === 'string' && value.length > 0) {
      return value
    }

    if (value && typeof value === 'object' && typeof (value as { toString: () => string }).toString === 'function') {
      return (value as { toString: () => string }).toString()
    }

    return undefined
  }

  private getEventId(event: AlertEvent): string | undefined {
    const doc = event as unknown as { _id?: unknown }
    return this.toStringId(doc._id)
  }
}
