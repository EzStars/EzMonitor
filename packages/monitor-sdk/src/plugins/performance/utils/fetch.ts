const originalFetch = window.fetch;

function owerwriteFetch() {
  window.fetch = function newFetch(url, config) {
    const startTime = performance.now();
    const reportData = {
      type: 'performance',
      subType: 'fetch',
      url,
      startTime: startTime,
      endTime: 0,
      duration: 0,
      method: config?.method || 'GET',
      status: 0,
      success: false,
    };
    return originalFetch(url, config)
      .then(response => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        reportData.endTime = endTime;
        reportData.duration = duration;
        reportData.status = response.status;
        reportData.success = response.ok;
        console.log('fetch', reportData);
        // 这里可以添加上报逻辑
        return response;
      })
      .catch(error => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        reportData.endTime = endTime;
        reportData.duration = duration;
        reportData.status = error.status || 0;
        reportData.success = false;
        console.log('fetch error', reportData);
        // 这里可以添加上报逻辑
        return Promise.reject(error);
      });
  };
}
export default function fetch() {
  if (window.fetch) {
    owerwriteFetch();
  } else {
    console.warn('fetch is not supported in this browser');
  }
}
