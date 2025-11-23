import type { ReportPayload } from '../types/reporter';
import { TransportType } from '../types/reporter';

export interface TransportStrategy {
  select(
    payload: ReportPayload,
    env: {
      supportBeacon: boolean;
    },
  ): TransportType;
}

export class DefaultTransportStrategy implements TransportStrategy {
  constructor(
    private readonly beaconThresholdKB = 60,
    private readonly imageThresholdKB = 2,
  ) {}
  select(
    payload: ReportPayload,
    env: { supportBeacon: boolean },
  ): TransportType {
    const sizeKB = getSizeKB(payload);
    if (env.supportBeacon && sizeKB < this.beaconThresholdKB)
      return TransportType.BEACON;
    if (!env.supportBeacon && sizeKB < this.imageThresholdKB)
      return TransportType.IMAGE;
    return TransportType.XHR;
  }
}

function getSizeKB(data: unknown): number {
  const str = JSON.stringify(data);
  const bytes = new Blob([str]).size;
  return bytes / 1024;
}
