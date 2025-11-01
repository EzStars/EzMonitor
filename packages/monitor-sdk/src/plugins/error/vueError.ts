import { getBehaviour, getRecordScreenData } from '../behavior';
import { TraceSubTypeEnum, TraceTypeEnum } from '../../common/enum';
import { lazyReportBatch } from '../../common/report';
import {
  getErrorUid,
  getVueComponentInfo,
  parseStackFrames,
  parseStackFramesWithSourceMap,
} from '../../common/utils';
import { getConfig } from '../../config';
import { VueErrorType } from '../../types';

// 初始化 Vue异常 的数据获取和上报
export interface Vue {
  config: {
    errorHandler?: any;
    warnHandler?: any;
  };
}

const initVueError = (app: Vue) => {
  app.config.errorHandler = async (err: Error, vm: any, info: string) => {
    console.error(err);
    const { componentName, url: src } = getVueComponentInfo(vm);
    const type = TraceTypeEnum.error;
    const subType = TraceSubTypeEnum.vue;
    const message = err.message;
    const config = getConfig();

    // 根据配置选择堆栈解析方式
    let stack;
    if (config.enableSourceMap) {
      try {
        stack = await parseStackFramesWithSourceMap(err);
      } catch (sourceMapError) {
        console.warn(
          'SourceMap parsing failed for Vue error, fallback to basic parsing:',
          sourceMapError,
        );
        stack = parseStackFrames(err);
      }
    } else {
      stack = parseStackFrames(err);
    }

    const pageUrl = window.location.href;
    const behavior = getBehaviour();
    const state = behavior?.breadcrumbs?.state || [];
    const eventData = getRecordScreenData();
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
      eventData,
    };
    lazyReportBatch(reportData);
  };
};

export default initVueError;
