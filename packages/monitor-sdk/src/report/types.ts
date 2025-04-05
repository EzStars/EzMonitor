export interface reportDataInterface {
  url: string;
  data: dataInterface;
  time?: Date;
  delay?: any;
}

export interface dataInterface {
  event: any[];
  performance: performanceDataInterface;
  error?: any[];
  resource?: any[];
}

export interface performanceDataInterface {
  fcp: number;
  fp: number;
  lcp: {
    name: string;
    startTime: number;
    renderTime: number;
    loadTime: number;
    size: number;
    id: string;
    url: string;
  };
  resources: {
    name: string;
    startTime: number;
    requestStart: number;
    responseEnd: number;
    duration: number;
    initiatorType: string;
  }[];
  navigation: {
    navigation: any;
    redirectCount: number;
    fetchStart: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    connectStart: number;
    connectEnd: number;
    secureConnectionStart: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    domInteractive: number;
    domContentLoadedEventStart: number;
    domContentLoadedEventEnd: number;
    domComplete: number;
    loadEventStart: number;
    loadEventEnd: number;
    dnsLookupTime: number;
    tcpConnectionTime: number;
    ttfb: number;
    domContentLoadedTime: number;
    loadTime: number;
  };
  whiteScreenCount: number;
}
