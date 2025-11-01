import { getConfig } from '../config';
import { addCache, getCache, clearCache, getCacheManager } from './cache';
import { deepClone, isObjectSize } from './utils';

const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

function isSupportSendBeacon() {
  return 'sendBeacon' in window.navigator;
}

const config = getConfig();

const sendServe = (reportData: any) => {
  let sendType = 'xhr';
  let sendTraceServer = xhrRequest;
  const ObjectSize = isObjectSize(reportData);

  if (config.isAjax) {
    sendTraceServer = xhrRequest;
    sendType = 'xhr';
  } else if (isSupportSendBeacon() && ObjectSize < 60) {
    // sendBeacon 最大支持64kb数据
    sendTraceServer = beaconRequest;
    sendType = 'beacon';
  } else if (ObjectSize < 2) {
    // 图片最大支持2kb数据
    sendTraceServer = imgRequest;
    sendType = 'img';
  }

  reportData = {
    data: reportData,
    userId: config.userId,
    sendType,
  };
  const jsonData = JSON.stringify(reportData);
  const response = deepClone(reportData);
  if (config.reportBefore) {
    config.reportBefore(response.data);
  }
  sendTraceServer(jsonData)
    .then(() => {
      if (config.reportSuccess) {
        config.reportSuccess(response.data);
      }
    })
    .catch(() => {
      if (config.reportFail) {
        config.reportFail(response.data);
      }
    })
    .finally(() => {
      console.log('埋点上报----', response.data);
      if (config.reportAfter) {
        config.reportAfter(response.data);
      }
    });
};

/**
 * 延迟批量上报数据
 *
 * @param data 需要上报的数据
 */
export function lazyReportBatch(data: any) {
  addCache(data);
  const dataCache = getCache();

  const reportData = async () => {
    if (!dataCache.length) {
      return;
    }

    // 先复制数据，避免清空后丢失
    const dataToSend = [...dataCache];

    try {
      await sendServe(dataToSend);
      // ✅ 只有成功后才清空缓存
      clearCache();
    } catch (error) {
      console.error('[EzMonitor] 上报失败，数据保留在缓存中:', error);
      // ✅ 失败时不清空，等待下次重试
      // 可选：添加重试计数器，超过一定次数才丢弃
    }
  };

  if (dataCache.length && dataCache.length > config.batchSize) {
    reportData();
  } else {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(reportData, { timeout: 1000 });
    } else {
      setTimeout(reportData, 1000);
    }
  }
}

// 图片发送数据
function imgRequest(data: any) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = `${config.url}?data=${encodeURIComponent(data)}`;
  });
}

// 普通ajax发送请求数据
function xhrRequest(data: any) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    originalOpen.call(xhr, 'POST', config.url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.responseText);
      } else {
        reject(new Error('XHR request failed'));
      }
    };

    xhr.onerror = () => reject(new Error('XHR request failed'));

    const sendData = () => originalSend.call(xhr, data);
    sendData();
  });
}

// sendBeacon发送数据
function beaconRequest(data: any) {
  return new Promise((resolve, reject) => {
    const result = window.navigator.sendBeacon(config.url, data);
    if (result) {
      resolve('Beacon request succeeded');
    } else {
      reject(new Error('Beacon request failed'));
    }
  });
}

/**
 * 初始化上报系统
 * 监听网络状态，在网络恢复时自动上报离线数据
 */
export function initReportSystem() {
  // 监听网络恢复事件
  window.addEventListener('ez-monitor-online', () => {
    const cacheManager = getCacheManager();
    const offlineData = cacheManager.getCache();

    if (offlineData.length > 0) {
      console.log(
        `[EzMonitor] 网络已恢复，开始上报 ${offlineData.length} 条离线数据`,
      );

      // 批量上报离线数据
      sendServe(offlineData);
      cacheManager.clearCache();
    }
  });

  // 页面加载时检查是否有离线数据
  const cacheManager = getCacheManager();
  const offlineData = cacheManager.getCache();

  if (offlineData.length > 0 && navigator.onLine) {
    console.log(
      `[EzMonitor] 检测到 ${offlineData.length} 条离线数据，开始上报`,
    );

    // 延迟上报，避免阻塞页面加载
    setTimeout(() => {
      sendServe(offlineData);
      cacheManager.clearCache();
    }, 1000);
  }
}
