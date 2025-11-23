import { TransportType } from '../types/reporter';

export interface TransportAdapter {
  readonly type: TransportType;
  isSupported(): boolean;
  send(url: string, data: string): Promise<unknown>;
}
