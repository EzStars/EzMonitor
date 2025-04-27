import { addCache, clearCache } from '../cache';
import { getCache } from '../cache';
import config from '../config';
import { getUUID } from '../utils';

const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

export function report(data) {
  if (!config.url) {
    console.error('webEyesSDK: 请先配置上报地址');
    return;
  }
  const reportData = JSON.stringify({
    id: getUUID(),
    data,
  });
  // 上报数据，使用图片的方式
  if (config.isImageUpload) {
    imgRequest(reportData);
  } else {
    // 优先使用 sendBeacon 上报
    if (
      window.navigator.sendBeacon &&
      typeof window.navigator.sendBeacon === 'function'
    ) {
      return beaconRequest(reportData);
    } else {
      xhrRequest(reportData);
    }
  }
}

// 批量上报数据
export function lazyReportBatch(data) {
  addCache(data);
  const dataCache = getCache();
  console.error(data);
  if (dataCache.length && dataCache.length >= config.batchSize) {
    report(dataCache);
    clearCache();
  }
}

export function imgRequest(data) {
  const img = new Image();
  img.src = `${config.url}?data=${encodeURIComponent(JSON.stringify(data))}`;
}

export function xhrRequest(data) {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(
      () => {
        const xhr = new XMLHttpRequest();
        originalOpen.call(xhr, 'post', config.url);
        originalSend.call(xhr, data);
      },
      { timeout: 3000 },
    );
  } else {
    setTimeout(() => {
      const xhr = new XMLHttpRequest();
      originalOpen.call(xhr, 'post', config.url);
      originalSend.call(xhr, data);
    }, 0);
  }
}

export function beaconRequest(data) {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(
      () => {
        window.navigator.sendBeacon(config.url, data);
      },
      { timeout: 3000 },
    );
  } else {
    setTimeout(() => {
      window.navigator.sendBeacon(config.url, data);
    }, 0);
  }
}
