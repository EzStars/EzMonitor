## promise错误捕获
promise的错误是通过监听unhandledrejection事件捕获的，但捕获到的错误是无法获取到错误文件还是错误行列数的

```
window.addEventListener(
    'unhandledrejection',
    (e: PromiseRejectionEvent) => {
      const stack = parseStackFrames(e.reason)
      const behavior = getBehaviour()
      const state = behavior?.breadcrumbs?.state || []
      const eventData = getRecordScreenData()
      const reportData: PromiseErrorType = {
        type: TraceTypeEnum.error,
        subType: TraceSubTypeEnum.promise,
        message: e.reason.message || e.reason,
        stack,
        pageUrl: window.location.href,
        errId: getErrorUid(`'promise'-${e.reason.message}`),
        state,
        timestamp: new Date().getTime(),
        eventData
      }
      // todo 发送错误信息
      lazyReportBatch(reportData)
    },
    true
  )

```