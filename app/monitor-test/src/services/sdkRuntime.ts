import {
  createSDK,
  TrackingPlugin,
} from '@ezstars/monitor-sdkv2'

const sdk = createSDK({
  appId: 'monitor-test-app',
  debug: true,
  enabled: true,
})

const trackingPlugin = new TrackingPlugin({ autoTrackPage: true })
sdk.use(trackingPlugin)

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
