import {
  createSDK,
  PerformancePlugin,
  TrackingPlugin,
} from '@ezstars/monitor-sdkv2'

const DEFAULT_API_URL = 'http://localhost:3000'
const DEFAULT_RELEASE = 'monitor-test-local'
const apiUrl = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL
const reportUrl = import.meta.env.VITE_MONITOR_REPORT_URL?.trim() || `${apiUrl}/api/monitor/batch`
const release = import.meta.env.VITE_MONITOR_RELEASE?.trim() || DEFAULT_RELEASE

const sdk = createSDK({
  appId: 'monitor-test-app',
  appVersion: release,
  release,
  debug: true,
  enabled: true,
  reportUrl,
})

const trackingPlugin = new TrackingPlugin({ autoTrackPage: true })
sdk.use(trackingPlugin)

const performancePlugin = new PerformancePlugin()
sdk.use(performancePlugin)

type TrackEventResult = Awaited<ReturnType<typeof trackingPlugin.track>>
type TrackPageResult = Awaited<ReturnType<typeof trackingPlugin.trackPage>>
type TrackUserResult = Awaited<ReturnType<typeof trackingPlugin.trackUser>>

let startPromise: Promise<void> | null = null

export async function ensureSDKStarted() {
  if (sdk.getStatus() === 'started') {
    return
  }

  if (startPromise) {
    return startPromise
  }

  startPromise = (async () => {
    await sdk.init()
    await sdk.start()
  })()

  try {
    await startPromise
  }
  finally {
    startPromise = null
  }
}

export function getSDKStatus() {
  return sdk.getStatus()
}

export function getReportUrl() {
  return reportUrl
}

export function getRelease() {
  return release
}

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): Promise<TrackEventResult> {
  await ensureSDKStarted()
  return trackingPlugin.track(eventName, properties)
}

export async function trackPage(
  page: string,
  properties?: Record<string, unknown>,
): Promise<TrackPageResult> {
  await ensureSDKStarted()
  return trackingPlugin.trackPage(page, properties)
}

export async function trackUser(
  userId: string,
  properties?: Record<string, unknown>,
): Promise<TrackUserResult> {
  await ensureSDKStarted()
  return trackingPlugin.trackUser(userId, properties)
}

export async function reportError(
  errorType: string,
  payload: {
    message: string
    stack?: string
    url?: string
    detail?: Record<string, unknown>
    [key: string]: unknown
  },
): Promise<void> {
  await ensureSDKStarted()
  const safeType = errorType.trim() || 'manual'
  sdk.report(`error_${safeType}`, {
    type: `error_${safeType}`,
    ...payload,
    timestamp: Date.now(),
    appId: sdk.getConfig().appId as string | undefined,
    appVersion: (sdk.getConfig().appVersion as string | undefined) ?? release,
    release: (sdk.getConfig().release as string | undefined) ?? release,
    sessionId: sdk.getSessionId(),
    userId: sdk.getConfig().userId as string | undefined,
    url: payload.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  })
}
