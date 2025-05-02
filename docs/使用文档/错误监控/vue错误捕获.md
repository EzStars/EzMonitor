## vue错误捕获
`errorHandler` 是 `Vue` 提供的全局错误处理方法，用于捕获组件渲染、事件处理、生命周期钩子和子组件中的未捕获错误。开发者可以通过 `errorHandler` 实现错误的统一处理和上报。

```
import { getBehaviour, getRecordScreenData } from '../behavior'
import { TraceSubTypeEnum, TraceTypeEnum } from '../common/enum'
import { lazyReportBatch } from '../common/report'
import {
  getErrorUid,
  getVueComponentInfo,
  parseStackFrames
} from '../common/utils'
import { VueErrorType } from '../types'

// 初始化 Vue异常 的数据获取和上报
export interface Vue {
  config: {
    errorHandler?: any
    warnHandler?: any
  }
}

const initVueError = (app: Vue) => {
  app.config.errorHandler = (err: Error, vm: any, info: string) => {
    console.error(err)
    const { componentName, url: src } = getVueComponentInfo(vm)
    const type = TraceTypeEnum.error
    const subType = TraceSubTypeEnum.vue
    const message = err.message
    const stack = parseStackFrames(err)
    const pageUrl = window.location.href
    const behavior = getBehaviour()
    const state = behavior?.breadcrumbs?.state || []
    const eventData = getRecordScreenData()
    const reportData: VueErrorType = {
      type,
      subType,
      message,
      stack,
      pageUrl,
      info,
      componentName,
      src,
      errId: getErrorUid(`${subType}-${message}-${src}`),
      state,
      timestamp: new Date().getTime(),
      eventData
    }
    lazyReportBatch(reportData)
  }
}

export default initVueError

```