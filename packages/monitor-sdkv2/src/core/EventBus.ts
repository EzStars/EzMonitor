type Handler<T = any> = (payload: T) => void

export class EventBus {
  private handlers: Map<string, Set<Handler>> = new Map()

  on<T = any>(event: string, handler: Handler<T>) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as Handler)
    return () => this.off(event, handler)
  }

  once<T = any>(event: string, handler: Handler<T>) {
    const wrapper = (payload: T) => {
      handler(payload)
      this.off(event, wrapper)
    }
    return this.on(event, wrapper)
  }

  off<T = any>(event: string, handler?: Handler<T>) {
    if (!this.handlers.has(event))
      return
    if (!handler) {
      this.handlers.delete(event)
      return
    }
    this.handlers.get(event)!.delete(handler as Handler)
  }

  emit<T = any>(event: string, payload?: T) {
    const set = this.handlers.get(event)
    if (!set)
      return
    for (const h of Array.from(set)) {
      try {
        (h as Handler<T>)(payload as T)
      }
      catch (e) {
        // 保持事件总线健壮性，单个处理器异常不影响其他处理器
        console.error('[EventBus] handler error', e)
      }
    }
  }
}

export default new EventBus()
