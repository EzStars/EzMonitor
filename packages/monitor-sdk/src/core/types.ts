export interface MonitorOptions {
  reportUrl: string; // 上报地址
  delay?: number; // 上报延迟
}

// 定义监控事件接口
export interface MonitorEvent {
  type: string; // 事件类型
  timestamp: number; // 时间戳
  data: any; // 事件数据
}

// 定义错误事件接口
export interface ErrorEvent extends MonitorEvent {
  data: {
    message: string; // 错误信息
    stack?: string; // 错误堆栈
    filename?: string; // 发生错误的文件
    lineno?: number; // 行号
    colno?: number; // 列号
  };
}
