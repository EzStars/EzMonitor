import { deepClone } from './utils';

const cache = [];

export function clearCache() {
  cache.length = 0;
}

export function addCache(data) {
  cache.push(data);
}

export function getCache() {
  return deepClone(cache);
}
