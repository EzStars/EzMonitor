import pako from 'pako';
import { Base64 } from 'js-base64';
import { PageInformation, originInfoType } from '../types';
import { WebPageLoad } from './enum';
import { getSourceMapResolver, StackFrame } from './sourceMapResolver';

export function deepClone(obj: any, hash = new WeakMap()) {
  if (obj == null) {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj);
  }
  if (obj instanceof RegExp) {
    return new RegExp(obj);
  }
  if (typeof obj === 'function') {
    return obj;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (hash.has(obj)) {
    return hash.get(obj);
  }
  const cloneObj = new obj.constructor();
  hash.set(obj, cloneObj);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloneObj[key] = deepClone(obj[key], hash);
    }
  }
  return cloneObj;
}

export function generateUniqueId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

// 对每一个错误详情，生成一串编码

export const getErrorUid = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    hash = (hash * 31 + charCode) >>> 0; // 保证为非负数
  }
  return hash.toString(36); // 转换为更短的 36 进制字符串
};

export function getPathToElement(element: any) {
  const path = [];
  let currentElement = element;

  try {
    while (currentElement?.tagName?.toLowerCase() !== 'body') {
      const parentNode = currentElement.parentNode;
      const children = Array.from(parentNode?.children);
      const nodeIndex = children.indexOf(currentElement) + 1;
      const name = `${currentElement.tagName.toLowerCase()}:nth-child(${nodeIndex})`;
      // 将当前元素的标签和其兄弟索引添加到路径数组中
      path.unshift(name);
      // 移动到父元素
      currentElement = parentNode;
    }
  } catch (error) {
    console.log(error);
  }
  // 最后添加 body 标签
  path.unshift('body');

  return path.join(' > ');
}

// 解析错误堆栈（基础版本）
export function parseStackFrames(
  error: Error,
): Omit<
  StackFrame,
  | 'originalFilename'
  | 'originalLineno'
  | 'originalColno'
  | 'originalFunctionName'
>[] {
  if (!error) {
    return [];
  }
  const { stack } = error;
  // 正则表达式，用以解析堆栈split后得到的字符串
  const FULL_MATCH =
    /^\s*at (?:(.*?) ?\()?((?:file|https?|blob|chrome-extension|address|native|eval|webpack|<anonymous>|[-a-z]+:|.*bundle|\/).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;

  // 限制只追溯5个
  const STACKTRACE_LIMIT = 5;

  // 解析每一行
  function parseStackLine(line: string) {
    const lineMatch = line.match(FULL_MATCH);
    if (!lineMatch) {
      return {};
    }
    const filename = lineMatch[2];
    const functionName = lineMatch[1] || '';
    const lineno = parseInt(lineMatch[3], 10) || undefined;
    const colno = parseInt(lineMatch[4], 10) || undefined;
    return {
      filename,
      functionName,
      lineno,
      colno,
    };
  }
  // 无 stack 时直接返回
  if (!stack) {
    return [];
  }
  const frames = [];
  for (const line of stack.split('\n').slice(1)) {
    const frame = parseStackLine(line);
    if (frame) {
      frames.push(frame);
    }
  }
  return frames.slice(0, STACKTRACE_LIMIT);
}

/**
 * 解析错误堆栈（增强版本，支持 SourceMap）
 * @param error 错误对象
 * @returns Promise<StackFrame[]> 增强的堆栈帧信息
 */
export async function parseStackFramesWithSourceMap(
  error: Error,
): Promise<StackFrame[]> {
  // 首先获取基础堆栈信息
  const basicFrames = parseStackFrames(error);

  try {
    // 使用 SourceMap 解析器增强堆栈信息
    const resolver = getSourceMapResolver();
    const enhancedFrames = await resolver.resolveStackFrames(basicFrames);

    return enhancedFrames;
  } catch (resolverError) {
    console.warn(
      'SourceMap resolution failed, fallback to basic frames:',
      resolverError,
    );
    return basicFrames as StackFrame[];
  }
}

/**
 * 同步版本的堆栈解析（保持向后兼容）
 * 注意：这个版本不包含 SourceMap 解析
 */
export function parseStackFramesSync(error: Error): StackFrame[] {
  return parseStackFrames(error) as StackFrame[];
}

// 获取vue报错组件信息
export const getVueComponentInfo = (vm: any) => {
  const classifyRE = /(?:^|[-_])(\w)/g;
  const classify = (str: string) =>
    str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '');
  const ROOT_COMPONENT_NAME = '<Root>';
  const ANONYMOUS_COMPONENT_NAME = '<Anonymous>';
  if (!vm) {
    return {
      componentName: ANONYMOUS_COMPONENT_NAME,
      url: '',
    };
  }
  if (vm.$root === vm) {
    return {
      componentName: ROOT_COMPONENT_NAME,
      url: '',
    };
  }
  const options = vm.$options;
  let name = options.name || options._componentTag;
  const file = options.__file;
  if (!name && file) {
    const match = file.match(/([^/\\]+)\.vue$/);
    if (match) {
      name = match[1];
    }
  }
  return {
    componentName: name ? `<${classify(name)}>` : ANONYMOUS_COMPONENT_NAME,
    url: file,
  };
};

// 获取react报错组件信息
export const getReactComponentInfo = (errorInfo: React.ErrorInfo) => {
  const ANONYMOUS_COMPONENT_NAME = '<Anonymous>';
  const ROOT_COMPONENT_NAME = '<Root>';

  // 获取 React 组件调用栈
  const componentStack = errorInfo.componentStack || '';

  /**
   * 提取组件调用栈中最后一个出错的组件
   * React 的 componentStack 通常包含如下格式:
   *   at ComponentName (filePath:line:column)
   *   at AnotherComponent (filePath:line:column)
   */
  const extractComponentName = (stack: string) => {
    const match = stack.match(/at\s+([^\s]+)\s+\(/);
    if (match && match[1]) {
      return `<${match[1]}>`;
    }
    return ANONYMOUS_COMPONENT_NAME;
  };

  const extractComponentFile = (stack: string) => {
    const match = stack.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1]; // 返回文件路径及位置
    }
    return '';
  };

  // 提取信息
  const componentName =
    extractComponentName(componentStack) || ROOT_COMPONENT_NAME;
  const componentFile = extractComponentFile(componentStack);

  return {
    componentName,
    url: componentFile,
  };
};

// 获取 PI 页面基本信息
export const getPageInfo = (): PageInformation => {
  const {
    host,
    hostname,
    href,
    protocol,
    origin,
    port,
    pathname,
    search,
    hash,
  } = window.location;
  const { width, height } = window.screen;
  const { language, userAgent } = navigator;
  const { type } = performance.navigation;

  return {
    host,
    hostname,
    href,
    protocol,
    origin,
    port,
    pathname,
    search,
    hash,
    title: document.title,
    language: language.substr(0, 2),
    userAgent,
    winScreen: `${width}x${height}`,
    docScreen: `${document.documentElement.clientWidth || document.body.clientWidth}x${
      document.documentElement.clientHeight || document.body.clientHeight
    }`,
    pageLoadType: WebPageLoad[type],
  };
};

export const afterLoad = (callback: any) => {
  if (document.readyState === 'complete') {
    setTimeout(callback);
  } else {
    window.addEventListener('pageshow', callback, {
      once: true,
      capture: true,
    });
  }
};

export const getOriginInfo = (): originInfoType => {
  return {
    referrer: document.referrer,
    navigationType: window.performance?.navigation.type || '',
  };
};

// URL查询字符串转换为JSON对象
export function urlToJson(url: string) {
  const params = new URLSearchParams(url.split('?')[1]);
  const json = {};
  // @ts-expect-error: URLSearchParams entries may not be iterable in some environments
  for (const [key, value] of params) {
    // @ts-expect-error: Suppressing type error for dynamic key-value assignment
    json[key] = decodeURIComponent(value);
  }
  return JSON.stringify(json);
}

/**
 * 压缩
 * @param data 压缩源
 */
export function zip(data: any): string {
  if (!data) {
    return data;
  }

  // 判断数据是否需要转为JSON
  const dataJson =
    typeof data !== 'string' && typeof data !== 'number'
      ? JSON.stringify(data)
      : data;

  // 使用Base64.encode处理字符编码，兼容中文
  const str = Base64.encode(dataJson as string);
  const binaryString = pako.gzip(str);
  const arr = Array.from(binaryString);
  let s = '';
  arr.forEach((item: number) => {
    s += String.fromCharCode(item);
  });
  return Base64.btoa(s);
}

/**
 * 解压
 * @param b64Data 解压源
 */
export function unzip(b64Data: string) {
  const strData = Base64.atob(b64Data);
  const charData = strData.split('').map(function (x) {
    return x.charCodeAt(0);
  });
  const binData = new Uint8Array(charData);
  const data: any = pako.ungzip(binData);
  // ↓切片处理数据，防止内存溢出报错↓
  let str = '';
  const chunk = 8 * 1024;
  let i;
  for (i = 0; i < data.length / chunk; i++) {
    str += String.fromCharCode.apply(
      null,
      data.slice(i * chunk, (i + 1) * chunk),
    );
  }
  str += String.fromCharCode.apply(null, data.slice(i * chunk));
  // ↑切片处理数据，防止内存溢出报错↑
  const unzipStr = Base64.decode(str);
  let result = '';
  // 对象或数组进行JSON转换
  try {
    result = JSON.parse(unzipStr);
  } catch (error: any) {
    if (/Unexpected token o in JSON at position 0/.test(error)) {
      // 如果没有转换成功，代表值为基本数据，直接赋值
      result = unzipStr;
    }
  }
  return result;
}

/**
 * 解压错误录屏数据
 */
export function unzipRecordscreen(recordscreen: string) {
  return unzip(recordscreen);
}

/**
 * 获取对象kb
 * @param object 源对象
 */
export function isObjectSize(object: object): number {
  const serializedObject = JSON.stringify(object);
  const sizeInBytes = new TextEncoder().encode(serializedObject).length;
  const sizeInKB = sizeInBytes / 1024;
  return sizeInKB;
}
