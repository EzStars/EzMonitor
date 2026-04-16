function toRrwebEvent(
  value: Record<string, unknown>,
  fallbackTimestamp?: unknown,
): Record<string, unknown> | null {
  const timestamp = value.timestamp
  const type = value.type
  const nextTimestamp = typeof timestamp === 'number'
    ? timestamp
    : (typeof fallbackTimestamp === 'number' ? fallbackTimestamp : undefined)

  if (typeof nextTimestamp !== 'number' || typeof type !== 'number') {
    return null
  }

  return {
    ...value,
    timestamp: nextTimestamp,
  }
}

export function normalizeReplayEvents(input?: Array<Record<string, unknown>>) {
  if (!input || input.length === 0) {
    return [] as Array<Record<string, unknown>>
  }

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const directEvent = toRrwebEvent(item)
      if (directEvent) {
        return directEvent
      }

      const wrapper = item as { at?: unknown, data?: unknown }
      if (wrapper.data && typeof wrapper.data === 'object') {
        return toRrwebEvent(wrapper.data as Record<string, unknown>, wrapper.at)
      }

      return null
    })
    .filter((item): item is Record<string, unknown> => item !== null)
}
