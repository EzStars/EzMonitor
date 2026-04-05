import type { ITransportAdapter } from './types'

class BeaconTransport implements ITransportAdapter {
  readonly type = 'beacon' as const

  isSupported(): boolean {
    return typeof navigator !== 'undefined'
      && typeof navigator.sendBeacon === 'function'
  }

  async send(url: string, body: string): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('sendBeacon is not supported')
    }

    const blob = new Blob([body], { type: 'application/json' })
    const success = navigator.sendBeacon(url, blob)
    if (!success) {
      throw new Error('sendBeacon rejected the payload')
    }
  }
}

class ImageTransport implements ITransportAdapter {
  readonly type = 'image' as const

  isSupported(): boolean {
    return typeof Image !== 'undefined'
  }

  async send(url: string, body: string): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Image transport is not supported')
    }

    await new Promise<void>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Image transport failed'))

      const separator = url.includes('?') ? '&' : '?'
      image.src = `${url}${separator}payload=${encodeURIComponent(body)}`
    })
  }
}

class XhrTransport implements ITransportAdapter {
  readonly type = 'xhr' as const

  isSupported(): boolean {
    return typeof fetch === 'function' || typeof XMLHttpRequest !== 'undefined'
  }

  async send(url: string, body: string): Promise<void> {
    if (typeof fetch === 'function') {
      const response = await fetch(url, {
        body,
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return
    }

    if (typeof XMLHttpRequest === 'undefined') {
      throw new Error('XHR transport is not supported')
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url, true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          return
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
          return
        }

        reject(new Error(`HTTP ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('XHR transport failed'))
      xhr.send(body)
    })
  }
}

export function createDefaultTransports(): ITransportAdapter[] {
  return [new BeaconTransport(), new ImageTransport(), new XhrTransport()]
}