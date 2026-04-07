import type { ReplayErrorContext } from './types'

type ReplayProvider = () => ReplayErrorContext | undefined
type ReplayFlusher = (reason?: string) => void

type ReplayBridgeGlobal = typeof globalThis & {
  __EZ_MONITOR_REPLAY_PROVIDER__?: ReplayProvider
  __EZ_MONITOR_REPLAY_FLUSHER__?: ReplayFlusher
}

function getGlobalBridge(): ReplayBridgeGlobal {
  return globalThis as ReplayBridgeGlobal
}

export function setReplayErrorContextProvider(provider?: ReplayProvider): void {
  const target = getGlobalBridge()
  if (!provider) {
    delete target.__EZ_MONITOR_REPLAY_PROVIDER__
    return
  }

  target.__EZ_MONITOR_REPLAY_PROVIDER__ = provider
}

export function setReplayErrorFlusher(flusher?: ReplayFlusher): void {
  const target = getGlobalBridge()
  if (!flusher) {
    delete target.__EZ_MONITOR_REPLAY_FLUSHER__
    return
  }

  target.__EZ_MONITOR_REPLAY_FLUSHER__ = flusher
}

export function getReplayErrorContext(): ReplayErrorContext | undefined {
  const provider = getGlobalBridge().__EZ_MONITOR_REPLAY_PROVIDER__
  if (!provider) {
    return undefined
  }

  try {
    return provider()
  }
  catch {
    return undefined
  }
}

export function flushReplayOnError(reason = 'error'): void {
  const flusher = getGlobalBridge().__EZ_MONITOR_REPLAY_FLUSHER__
  if (!flusher) {
    return
  }

  try {
    flusher(reason)
  }
  catch {
    // Ignore replay flush failures while handling errors.
  }
}
