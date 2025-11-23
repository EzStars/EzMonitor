import { TransportAdapter } from './types';
import { TransportType } from '../types/reporter';

export class BeaconTransport implements TransportAdapter {
  readonly type = TransportType.BEACON;

  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof (navigator as any).sendBeacon === 'function'
    );
  }

  async send(url: string, data: string): Promise<unknown> {
    if (!this.isSupported()) throw new Error('sendBeacon not supported');
    const blob = new Blob([data], { type: 'application/json' });
    const ok = (navigator as any).sendBeacon(url, blob);
    if (!ok) throw new Error('Beacon send failed');
    return 'Beacon sent successfully';
  }
}

export default BeaconTransport;
