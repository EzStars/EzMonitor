## js错误捕获

```
window.addEventListener(
    'error',
    (e: ErrorEvent | Event) => {
      const errorType = getErrorType(e)
      switch (errorType) {
        case TraceSubTypeEnum.resource:
          initResourceError(e)
          break
        case TraceSubTypeEnum.js:
          initJsError(e as ErrorEvent)
          break
        case TraceSubTypeEnum.cors:
          initCorsError(e as ErrorEvent)
          break
        default:
          break
      }
    },
    true
  )

```

