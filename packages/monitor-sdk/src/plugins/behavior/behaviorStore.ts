export interface behaviorRecordsOptions {
  maxBehaviorRecords: number;
}

/**
 * 行为记录的格式
 * @param name 行为名称
 * @param page 页面名称
 * @param timestamp 时间戳
 * @param value 行为参数
 */
export interface behaviorStack {
  name: string;
  page: string;
  timestamp: number | string;
  value: object;
}

// 暂存用户的行为记录追踪
export default class BehaviorStore {
  // 数组形式的 stack
  private state: Array<behaviorStack>;

  // 记录的最大数量
  private maxBehaviorRecords: number;

  // 外部传入 options 初始化，
  constructor(options: behaviorRecordsOptions) {
    const { maxBehaviorRecords } = options;
    this.maxBehaviorRecords = maxBehaviorRecords;
    this.state = [];
  }

  // 从底部插入一个元素，且不超过 maxBehaviorRecords 限制数量
  push(value: behaviorStack) {
    if (this.length() === this.maxBehaviorRecords) {
      this.shift(); // 超过最大数量，删除第一个元素
    }
    this.state.push(value);
  }

  // 从顶部删除一个元素，返回删除的元素
  shift() {
    return this.state.shift();
  }

  length() {
    return this.state.length;
  }

  get() {
    return this.state;
  }

  clear() {
    this.state = [];
  }
}
