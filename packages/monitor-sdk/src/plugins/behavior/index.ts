import { record } from 'rrweb';
import { TraceSubTypeEnum, TraceTypeEnum } from '../../common/enum';
import { lazyReportBatch } from '../../common/report';
import {
  afterLoad,
  getOriginInfo,
  getPageInfo,
  getPathToElement,
  zip,
} from '../../common/utils';
import {
  PvInfoType,
  RecordEventScope,
  RouterChangeType,
  TargetInfoType,
  customAnalyticsData,
} from '../../types';
import BehaviorStore from './behaviorStore';
import { proxyHash, proxyHistory, wrHistory } from './utils';
/**
 * 行为追踪
 */
export class Behavior {
  // 本地暂存数据在 Map 里 （也可以自己用对象来存储）
  public metrics: any;

  // 行为追踪记录
  public breadcrumbs: any;

  // 自定义埋点的信息一般立即上报
  public customHandler!: Function;

  // 最大行为追踪记录数
  public maxBehaviorRecords!: number;

  // 允许捕获click事件的DOM标签 eg:button div img canvas
  public clickMountList!: Array<string>;

  // 初始化单例模式
  static instance: any;

  constructor() {
    if (Behavior.instance) {
      return Behavior.instance;
    }
    this.maxBehaviorRecords = 25;
    // 初始化行为追踪记录
    this.breadcrumbs = new BehaviorStore({
      maxBehaviorRecords: this.maxBehaviorRecords,
    });
    // 初始化 用户自定义 事件捕获
    this.customHandler = this.initCustomerHandler();
    this.clickMountList = ['click'].map(x => x.toLowerCase());
    // 重写事件
    wrHistory();
    // 初始化路由跳转获取
    this.initRouteChange();
    // 初始化 PV 的获取;
    this.initPV();
    // 初始化 click 事件捕获
    this.initClickHandler(this.clickMountList);
    window.$SDK.Behaviour = this;
    Behavior.instance = this;
  }

  /**
   * 初始化用户自定义埋点数据的获取上报
   * @param reportData 自定义埋点数据
   */
  initCustomerHandler = (): Function => {
    const handler = (reportData: customAnalyticsData) => {
      // 自定义埋点的信息一般立即上报
      const data = {
        ...reportData,
        type: TraceTypeEnum.behavior,
        subType: TraceSubTypeEnum.tracker,
        timestamp: new Date().getTime(),
      };
      lazyReportBatch(data);
    };
    return handler;
  };

  // 初始化 RCR 路由跳转的获取以及返回
  initRouteChange = (): void => {
    let oldDate = Date.now();
    const handler = (e: Event) => {
      // 记录到行为记录追踪
      const behavior: RouterChangeType = {
        type: TraceTypeEnum.behavior,
        subType: TraceSubTypeEnum.routerChange,
        pageUrl: window.location.href,
        jumpType: e.type, // 跳转的方法 eg:replaceState
        timestamp: new Date().getTime(),
        pageTime: Date.now() - oldDate,
      };
      oldDate = Date.now();
      this.breadcrumbs.push(behavior);
    };
    proxyHash(handler);
    // 为 pushState 以及 replaceState 方法添加 Evetn 事件
    proxyHistory(handler);
  };

  // 初始化 PV 的获取以及返回
  initPV = () => {
    const handler = () => {
      const reportData: PvInfoType = {
        type: TraceTypeEnum.behavior,
        subType: TraceSubTypeEnum.pv,
        timestamp: new Date().getTime(),
        // 页面信息
        pageInfo: getPageInfo(),
        // 用户来路
        originInfo: getOriginInfo(),
      };
      // 一般来说， PV 可以立即上报
      lazyReportBatch(reportData);
    };
    afterLoad(() => {
      handler();
    });
    proxyHash(handler);
    // 为 pushState 以及 replaceState 方法添加 Evetn 事件
    proxyHistory(handler);
  };

  // 初始化 CBR 点击事件的获取和返回
  initClickHandler = (mountList: Array<string>): void => {
    const handler = (e: MouseEvent | any) => {
      const target = e.target as HTMLElement;
      if (!target) {
        return;
      }
      const behavior: TargetInfoType = {
        type: TraceTypeEnum.behavior,
        subType: e.type as string,
        tagName: target.tagName,
        pageUrl: window.location.href,
        path: getPathToElement(target),
        timestamp: new Date().getTime(),
        textContent: target.textContent,
      };
      lazyReportBatch(behavior);
      this.breadcrumbs.push(behavior);
    };
    mountList.forEach(eventType => {
      window.addEventListener(
        eventType,
        e => {
          handler(e);
        },
        true,
      );
    });
  };
}

export class RecordScreen {
  public eventList: RecordEventScope[] = [
    { scope: `${Date.now()}-`, eventList: [] },
  ];
  public scopeScreenTime = 3000;
  public screenCnt = 3;
  private closeCallback: ReturnType<typeof record>;

  constructor() {
    this.init();
  }

  init = () => {
    this.closeCallback = record({
      emit: (event, isCheckout) => {
        const lastEvents = this.eventList[this.eventList.length - 1];
        lastEvents.eventList.push(event);
        if (isCheckout) {
          if (this.eventList.length > 0) {
            this.eventList[this.eventList.length - 1].scope =
              lastEvents.scope + Date.now();
          }
          if (this.eventList.length >= this.screenCnt) {
            this.eventList.shift();
          }
          this.eventList.push({ scope: `${Date.now()}-`, eventList: [] });
        }
      },
      recordCanvas: true,
      checkoutEveryNms: this.scopeScreenTime, // 每5s重新制作快照
    });
  };

  close() {
    this.closeCallback?.();
    this.closeCallback = undefined;
  }
}

let behaviorInstance: Behavior;
let recordScreenInstance: RecordScreen;

export const getBehaviour = () => {
  return behaviorInstance;
};

export const getRecordScreen = () => {
  return recordScreenInstance;
};

export const getRecordScreenData = () => {
  const recordScreen = getRecordScreen();
  const eventList = recordScreen?.eventList.slice(-2) || [];
  const data = eventList.reduce(
    (pre, cur) => {
      return [...pre, ...cur.eventList];
    },
    [] as RecordEventScope['eventList'],
  );
  const eventData = zip(data.flat());

  return eventData;
};

export default function initBehavior() {
  const behaviour = new Behavior();
  behaviorInstance = behaviour;
  const recordScreen = new RecordScreen();
  recordScreenInstance = recordScreen;
}
