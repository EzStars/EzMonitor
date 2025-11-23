import { TransportAdapter } from './types';
import { TransportType } from '../types/reporter';

export class XHRTransport implements TransportAdapter {
  readonly type = TransportType.XHR;
  private originalOpen?: typeof XMLHttpRequest.prototype.open;
  private originalSend?: typeof XMLHttpRequest.prototype.send;

  constructor() {
    if (typeof XMLHttpRequest !== 'undefined') {
      this.originalOpen = XMLHttpRequest.prototype.open;
      this.originalSend = XMLHttpRequest.prototype.send;
    }
  }

  isSupported(): boolean {
    return (
      typeof XMLHttpRequest !== 'undefined' &&
      !!this.originalOpen &&
      !!this.originalSend
    );
  }

  async send(url: string, data: string): Promise<unknown> {
    if (!this.isSupported()) throw new Error('XMLHttpRequest not supported');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.originalOpen!.call(xhr, 'POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
        else reject(new Error(`XHR request failed with status: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('XHR request failed'));
      xhr.ontimeout = () => reject(new Error('XHR request timeout'));
      xhr.timeout = 30000;

      try {
        this.originalSend!.call(xhr, data);
      } catch (e) {
        reject(e as Error);
      }
    });
  }
}

export default XHRTransport;
