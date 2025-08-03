import { getBehaviour, getRecordScreenData } from '../../plugins/behavior';
import { TraceSubTypeEnum, TraceTypeEnum } from '../../common/enum';
import { lazyReportBatch } from '../../common/report';
import {
  getErrorUid,
  getPathToElement,
  parseStackFrames,
  parseStackFramesWithSourceMap,
} from '../../common/utils';
import { getConfig } from '../../common/config';
import {
  JsErrorType,
  PromiseErrorType,
  ResourceErrorTarget,
  ResourceErrorType,
} from '../../types';

const getErrorType = (event: ErrorEvent | Event) => {
  const isJsError = event instanceof ErrorEvent;
  if (!isJsError) {
    return TraceSubTypeEnum.resource;
  }
  return event.message === 'Script error.'
    ? TraceSubTypeEnum.cors
    : TraceSubTypeEnum.js;
};

const initResourceError = (e: Event) => {
  // 通过 e.target 确定错误是发生在哪个资源上
  const target = e.target as ResourceErrorTarget;
  const src = target.src || target.href;
  const type = e.type;
  const subType = TraceSubTypeEnum.resource;
  const tagName = target.tagName;
  const message = '';
  const html = target.outerHTML;
  const path = getPathToElement(target);
  const behavior = getBehaviour();
  const state = behavior?.breadcrumbs?.state || [];
  const reportData: ResourceErrorType = {
    type,
    subType,
    tagName,
    message,
    html,
    src,
    pageUrl: window.location.href,
    path,
    errId: getErrorUid(`${subType}-${message}-${src}`),
    state,
    timestamp: new Date().getTime(),
  };
  lazyReportBatch(reportData);
};

const initJsError = async (e: ErrorEvent) => {
  const {
    colno: columnNo,
    lineno: lineNo,
    type,
    message,
    filename: src,
    error,
  } = e;
  const subType = TraceSubTypeEnum.js;
  const config = getConfig();

  // 根据配置选择堆栈解析方式
  let stack;
  if (config.enableSourceMap) {
    try {
      stack = await parseStackFramesWithSourceMap(error);
    } catch (sourceMapError) {
      console.warn(
        'SourceMap parsing failed, fallback to basic parsing:',
        sourceMapError,
      );
      stack = parseStackFrames(error);
    }
  } else {
    stack = parseStackFrames(error);
  }

  const behavior = getBehaviour();
  const state = behavior?.breadcrumbs?.state || [];
  const eventData = getRecordScreenData();
  const reportData: JsErrorType = {
    columnNo,
    lineNo,
    type,
    message,
    src,
    subType,
    pageUrl: window.location.href,
    stack,
    errId: getErrorUid(`${subType}-${message}-${src}`),
    state,
    timestamp: new Date().getTime(),
    eventData,
  };
  lazyReportBatch(reportData);
};

const initCorsError = (e: ErrorEvent) => {
  const { message } = e;
  const type = TraceTypeEnum.error;
  const subType = TraceSubTypeEnum.cors;
  const reportData = {
    type,
    subType,
    message,
  };
  lazyReportBatch(reportData);
};

const initErrorEventListener = () => {
  window.addEventListener(
    'error',
    (e: ErrorEvent | Event) => {
      const errorType = getErrorType(e);
      switch (errorType) {
        case TraceSubTypeEnum.resource:
          initResourceError(e);
          break;
        case TraceSubTypeEnum.js:
          initJsError(e as ErrorEvent);
          break;
        case TraceSubTypeEnum.cors:
          initCorsError(e as ErrorEvent);
          break;
        default:
          break;
      }
    },
    true,
  );
  window.addEventListener(
    'unhandledrejection',
    async (e: PromiseRejectionEvent) => {
      const config = getConfig();

      // 根据配置选择堆栈解析方式
      let stack;
      if (config.enableSourceMap) {
        try {
          stack = await parseStackFramesWithSourceMap(e.reason);
        } catch (sourceMapError) {
          console.warn(
            'SourceMap parsing failed for Promise error, fallback to basic parsing:',
            sourceMapError,
          );
          stack = parseStackFrames(e.reason);
        }
      } else {
        stack = parseStackFrames(e.reason);
      }

      const behavior = getBehaviour();
      const state = behavior?.breadcrumbs?.state || [];
      const eventData = getRecordScreenData();
      const reportData: PromiseErrorType = {
        type: TraceTypeEnum.error,
        subType: TraceSubTypeEnum.promise,
        message: e.reason.message || e.reason,
        stack,
        pageUrl: window.location.href,
        errId: getErrorUid(`'promise'-${e.reason.message}`),
        state,
        timestamp: new Date().getTime(),
        eventData,
      };
      // todo 发送错误信息
      lazyReportBatch(reportData);
    },
    true,
  );
};

export default initErrorEventListener;
