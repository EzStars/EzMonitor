import {
  createSDK,
  PerformancePlugin,
  TrackingPlugin,
} from '@ezstars/monitor-sdkv2'

const DEFAULT_API_URL = 'http://localhost:3000'
const apiUrl = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL
const reportUrl = import.meta.env.VITE_MONITOR_REPORT_URL?.trim() || `${apiUrl}/api/monitor/batch`

const sdk = createSDK({
  appId: 'monitor-test-app',
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
