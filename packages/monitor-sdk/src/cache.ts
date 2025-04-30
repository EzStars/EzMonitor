import { deepClone } from './utils';

const cache: any[] = [];

export function clearCache() {
  cache.length = 0;
}

export function addCache(data: any) {
  cache.push(data);
}

export function getCache() {
  return deepClone(cache);
}
