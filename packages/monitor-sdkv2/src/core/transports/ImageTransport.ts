import type { TransportAdapter } from './types'
import { TransportType } from '../types/reporter'

export class ImageTransport implements TransportAdapter {
  readonly type = TransportType.IMAGE

  isSupported(): boolean {
    return typeof Image !== 'undefined'
  }

  async send(url: string, data: string): Promise<unknown> {
    if (!this.isSupported())
      throw new Error('Image not supported')

    return new Promise((resolve, reject) => {
      const img = new Image()
      let timeoutId: number | undefined

      img.onload = () => {
        if (timeoutId)
          clearTimeout(timeoutId)
        resolve('Image loaded successfully')
      }
      img.onerror = () => {
        if (timeoutId)
          clearTimeout(timeoutId)
        reject(new Error('Image load failed'))
      }

      const encodedData = encodeURIComponent(data)
      img.src = `${url}?data=${encodedData}`

      timeoutId = window.setTimeout(() => {
        reject(new Error('Image request timeout'))
      }, 10000)
    })
  }
}

export default ImageTransport
