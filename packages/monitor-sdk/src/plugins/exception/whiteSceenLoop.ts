import { getBehaviour, getRecordScreenData } from '../behavior';
import { getConfig } from '../../common/config';
import { TraceSubTypeEnum, TraceTypeEnum } from '../../common/enum';
import { lazyReportBatch } from '../../common/report';
import { whiteScreenType } from '../../types';

let initTime = 0;
const whiteScreenTime = 6000;

// 定义外层容器元素的集合
const { containerElements, skeletonElements } = getConfig();
// 页面加载完毕
function onload(callback: any) {
  if (document.readyState === 'complete') {
    callback();
  } else {
    window.addEventListener('load', callback);
  }
}

// 选中dom的名称
function getSelector(element: Element) {
  if (!element) return '';

  if (element.id) {
    return '#' + element.id;
  } else if (element.className) {
    // 处理 className 的不同类型
    let className = '';

    // 优先使用 classList API（最安全）
    if (element.classList && element.classList.length > 0) {
      return '.' + Array.from(element.classList).join('.');
    }

    // 处理字符串类型的 className（普通 HTML 元素）
    if (typeof element.className === 'string') {
      className = element.className;
    }
    // 处理 SVGAnimatedString 类型（SVG 元素）
    else if (
      element.className &&
      typeof element.className === 'object' &&
      'baseVal' in element.className
    ) {
      className = (element.className as any).baseVal;
    }

    // 分割 className 并过滤空值
    if (className && typeof className === 'string') {
      const classes = className.split(/\s+/).filter(item => !!item);
      if (classes.length > 0) {
        return '.' + classes.join('.');
      }
    }
  }

  return element.nodeName.toLowerCase();
}
// 监听页面白屏
function whiteScreen() {
  // 容器元素个数
  let emptyPoints = 0;

  // 是否为容器节点
  function isContainer(element: Element) {
    if (!element || !element.tagName) {
      return;
    }

    // 跳过特殊元素（SVG、script、style 等）
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'svg' || tagName === 'script' || tagName === 'style') {
      return;
    }

    const selector = getSelector(element);
    if (
      containerElements.indexOf(selector) != -1 ||
      skeletonElements.some(skeletonSelector => {
        try {
          return element.matches(skeletonSelector);
        } catch (error) {
          console.warn('matches 选择器失败:', skeletonSelector, error);
          return false;
        }
      })
    ) {
      emptyPoints++;
    }
  }

  function main() {
    // 页面加载完毕初始化
    for (let i = 1; i <= 9; i++) {
      const xElements = document.elementsFromPoint(
        (window.innerWidth * i) / 10,
        window.innerHeight / 2,
      );
      const yElements = document.elementsFromPoint(
        window.innerWidth / 2,
        (window.innerHeight * i) / 10,
      );
      isContainer(xElements[0]);
      // 中心点只计算一次
      if (i != 5) {
        isContainer(yElements[0]);
      }
    }
    // 17个点都是容器节点算作白屏
    if (emptyPoints != 17) {
      initTime = new Date().getTime();
      // if (window.whiteLoopTimer) {
      //   clearTimeout(window.whiteLoopTimer)
      //   window.whiteLoopTimer = null
      // }
    } else {
      const nowTime = new Date().getTime();
      if (nowTime - initTime >= whiteScreenTime) {
        const behavior = getBehaviour();
        const state = behavior?.breadcrumbs?.state || [];
        const eventData = getRecordScreenData();
        const reportData: whiteScreenType = {
          type: TraceTypeEnum.exception,
          subType: TraceSubTypeEnum.whiteScreen,
          pageUrl: window.location.href,
          timestamp: nowTime,
          state,
          eventData,
        };
        console.error('页面白屏');
        lazyReportBatch(reportData);
        if (window.whiteLoopTimer) {
          clearTimeout(window.whiteLoopTimer);
          window.whiteLoopTimer = null;
        }
      }
      // 开启轮询
      // if (!window.whiteLoopTimer) {
      //   whiteSceenLoop()
      // }
    }
  }
  onload(main);
}

export default function whiteSceenLoop() {
  initTime = new Date().getTime();
  window.whiteLoopTimer = setInterval(() => {
    whiteScreen();
  }, 2000);
}
