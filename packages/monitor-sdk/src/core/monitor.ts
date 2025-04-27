import performance from '../plugins/performance';
import error from '../plugins/error';
import { setConfig } from '../utils/config'; // Ensure setConfig is properly imported

// Initialize the global SDK object with type safety
declare global {
  interface Window {
    __EzMonitorSDK__?: {
      version: string;
      vue?: boolean;
      react?: boolean;
    };
  }
}

window.__EzMonitorSDK__ = window.__EzMonitorSDK__ || {
  version: '0.0.1',
};

// 针对 Vue 项目的错误捕获
export function install(Vue, options) {
  if (window.__EzMonitorSDK__?.vue) return;
  window.__EzMonitorSDK__!.vue = true;
  setConfig(options); // Ensure this function is defined and imported
  const handler = Vue.config.errorHandler;
  Vue.config.errorHandler = function (err, vm, info) {
    if (handler) {
      handler(err, vm, info);
    }
    const reportData = {
      type: 'error',
      subType: 'vue',
      info,
      startTime: window.performance.now(),
      pageURL: window.location.href,
    };
    console.log('vue error', reportData);
  };
}

// 针对 React 项目的错误捕获
export function errorBoundary(err, info) {
  if (window.__EzMonitorSDK__?.react) return;
  window.__EzMonitorSDK__!.react = true;
  const reportData = {
    type: 'error',
    subType: 'react',
    info,
    startTime: window.performance.now(),
    pageURL: window.location.href,
  };
  console.log('react error', reportData);
}

// 初始化函数
export function init(options) {
  setConfig(options); // Ensure configuration is set
  performance(); // Initialize performance monitoring
  error(); // Initialize error monitoring
}

export default {
  install,
  errorBoundary,
  init,
  performance,
  error,
};
