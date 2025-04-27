export const originalProto = XMLHttpRequest.prototype;
export const originalOpen = XMLHttpRequest.prototype.open;
export const originalSend = XMLHttpRequest.prototype.send;

// Map to store metadata for each XMLHttpRequest instance
const xhrMetadata = new WeakMap<
  XMLHttpRequest,
  {
    url?: string | URL;
    method?: string;
    startTime?: number;
    endTime?: number;
    duration?: number;
    status?: number;
  }
>();

function overwriteOpenAndSend() {
  originalProto.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    // Store metadata in the WeakMap
    xhrMetadata.set(this, { url, method });
    (originalOpen as any).call(this, method, url, async, username, password);
  };

  originalProto.send = function (...args) {
    const startTime = performance.now();
    const xhr = this as XMLHttpRequest;

    // Update startTime in the metadata
    const metadata = xhrMetadata.get(xhr) || {};
    metadata.startTime = startTime;
    xhrMetadata.set(xhr, metadata);

    const onloadEnd = () => {
      const endTime = performance.now();
      const duration = endTime - (metadata.startTime || 0);
      const status = xhr.status;

      // Update metadata with endTime, duration, and status
      Object.assign(metadata, { endTime, duration, status });

      const reportData = {
        url: metadata.url,
        method: metadata.method,
        endTime: metadata.endTime,
        duration: metadata.duration,
        status: metadata.status,
        type: 'performance',
        success: (status >= 200 && status < 300) || status === 304,
        subType: 'xhr',
      };

      // Remove the event listener to avoid memory leaks
      xhr.removeEventListener('loadend', onloadEnd, true);

      // You can now use `reportData` for reporting purposes
      console.log(reportData); // Example: Replace with actual reporting logic
    };

    xhr.addEventListener('loadend', onloadEnd, true);
    (originalSend as any).call(xhr, ...args);
  };
}

export default function xhr() {
  overwriteOpenAndSend();
}
