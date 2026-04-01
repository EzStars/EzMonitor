import { createSDK, TrackingPlugin } from '@ezstars/monitor-sdkv2'
import { useState } from 'react'
import './App.css'

const sdk = createSDK({
  appId: 'monitor-test-app',
  debug: true,
  enabled: true,
})

const trackingPlugin = new TrackingPlugin({ autoTrackPage: true })
sdk.use(trackingPlugin)

const sdkReady = sdk
  .init()
  .then(() => sdk.start())
  .catch((error: unknown) => {
    console.error('[TrackingPlugin] SDK start failed', error)
    throw error
  })

function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  void sdkReady
    .then(() => {
      trackingPlugin.track(eventName, properties)
    })
    .catch((error: unknown) => {
      console.error('[TrackingPlugin] track failed', error)
    })
}

function App() {
  const [count, setCount] = useState(0)

  const handleCountTrack = () => {
    const nextCount = count + 1
    setCount(nextCount)
    trackEvent('count_button_click', {
      count: nextCount,
    })
  }

  const handleCustomTrack = () => {
    trackEvent('manual_custom_event', {
      page: '/monitor-test',
      action: 'manual-trigger',
      now: new Date().toISOString(),
    })
  }

  return (
    <section id="center">
      <h1>monitor-test SDK 内置埋点联调页</h1>
      <button className="counter" onClick={handleCountTrack}>
        触发计数埋点（Count:
        {' '}
        {count}
        ）
      </button>
      <button className="counter" onClick={handleCustomTrack}>
        触发自定义埋点
      </button>
      <p>这里直接调用 SDK 内置 TrackingPlugin，未增加额外业务封装文件。</p>
      <p>提示：打开浏览器控制台，搜索 [TrackingPlugin] 查看完整 payload。</p>
    </section>
  )
}

export default App
