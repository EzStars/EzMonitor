import type { AllEvents } from '../types/events'
import type { EventBus } from './EventBus'

/**
 * 带类型的事件总线包装
 */
export class TypedEventBus<TEvents extends Record<string, any> = AllEvents> {
  constructor(private readonly bus: EventBus) {}

  on<K extends keyof TEvents & string>(
    event: K,
    handler: (payload: TEvents[K]) => any,
  ) {
    return this.bus.on(event, handler as any)
  }

  once<K extends keyof TEvents & string>(
    event: K,
    handler: (payload: TEvents[K]) => any,
  ) {
    return this.bus.once(event, handler as any)
  }

  off<K extends keyof TEvents & string>(
    event: K,
    handler?: (payload: TEvents[K]) => any,
  ) {
    return this.bus.off(event, handler as any)
  }

  emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]) {
    return this.bus.emit(event, payload as any)
  }
}

export default TypedEventBus
