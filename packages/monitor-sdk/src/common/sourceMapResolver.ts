import { SourceMapConsumer } from 'source-map-js';
import { getConfig } from './config';

// 补充类型声明（source-map-js d.ts 里可能缺少 destroy）
declare module 'source-map-js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface SourceMapConsumer {
    destroy?(): void;
  }
}

export interface OriginalPosition {
  source: string | null;
  line: number | null;
  column: number | null;
  name: string | null;
}

/**
 * 堆栈帧接口
 */
export interface StackFrame {
  filename: string;
  functionName: string;
  lineno?: number;
  colno?: number;
  // 原始位置信息
  originalFilename?: string | null;
  originalLineno?: number | null;
  originalColno?: number | null;
  originalFunctionName?: string | null;
}

/**
 * SourceMap 解析器类
 */
export class SourceMapResolver {
  private cache = new Map<string, SourceMapConsumer>();
  private readonly config = getConfig();

  /**
   * 获取 SourceMap 文件内容
   * @param sourceMapUrl SourceMap 文件 URL
   */
  private async fetchSourceMap(sourceMapUrl: string): Promise<any> {
    try {
      const timeout = this.config.sourceMapTimeout || 3000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(sourceMapUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch sourcemap: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch sourcemap from ${sourceMapUrl}:`, error);
      throw error;
    }
  }

  /**
   * 从 JS 文件中提取 SourceMap URL
   * @param jsFileUrl JavaScript 文件 URL
   */
  private async extractSourceMapUrl(jsFileUrl: string): Promise<string | null> {
    try {
      const response = await fetch(jsFileUrl);
      const content = await response.text();

      // 查找 sourceMappingURL 注释
      const sourceMapUrlMatch = content.match(/\/\/# sourceMappingURL=(.+?)$/m);
      if (sourceMapUrlMatch) {
        const sourceMapUrl = sourceMapUrlMatch[1].trim();

        // 处理相对路径
        if (sourceMapUrl.startsWith('http')) {
          return sourceMapUrl;
        } else {
          const baseUrl = jsFileUrl.substring(
            0,
            jsFileUrl.lastIndexOf('/') + 1,
          );
          return baseUrl + sourceMapUrl;
        }
      }

      // 尝试默认的 .map 文件
      return jsFileUrl + '.map';
    } catch (error) {
      console.warn(`Failed to extract sourcemap URL from ${jsFileUrl}:`, error);
      return null;
    }
  }

  /**
   * 获取或创建 SourceMap Consumer
   * @param filename 文件名
   */
  private async getSourceMapConsumer(
    filename: string,
  ): Promise<SourceMapConsumer | null> {
    // 检查缓存
    if (this.cache.has(filename)) {
      return this.cache.get(filename)!;
    }

    try {
      // 提取 SourceMap URL
      const sourceMapUrl = await this.extractSourceMapUrl(filename);
      if (!sourceMapUrl) {
        return null;
      }

      // 获取 SourceMap 内容
      const sourceMapData = await this.fetchSourceMap(sourceMapUrl);

      // 创建 Consumer
      const consumer = await new SourceMapConsumer(sourceMapData);

      // 缓存结果
      this.cache.set(filename, consumer);

      return consumer;
    } catch (error) {
      console.warn(`Failed to load sourcemap for ${filename}:`, error);
      return null;
    }
  }

  /**
   * 解析原始位置
   * @param filename 文件名
   * @param line 行号
   * @param column 列号
   */
  async getOriginalPosition(
    filename: string,
    line: number,
    column: number,
  ): Promise<OriginalPosition> {
    try {
      const consumer = await this.getSourceMapConsumer(filename);
      if (!consumer) {
        return {
          source: null,
          line: null,
          column: null,
          name: null,
        };
      }

      const position = consumer.originalPositionFor({
        line: line,
        column: column,
      });

      return {
        source: position.source,
        line: position.line,
        column: position.column,
        name: position.name ?? null,
      };
    } catch (error) {
      console.warn(`Failed to resolve original position:`, error);
      return {
        source: null,
        line: null,
        column: null,
        name: null,
      };
    }
  }

  /**
   * 解析增强的堆栈帧
   * @param frames 原始堆栈帧
   */
  async resolveStackFrames(
    frames: Omit<
      StackFrame,
      | 'originalFilename'
      | 'originalLineno'
      | 'originalColno'
      | 'originalFunctionName'
    >[],
  ): Promise<StackFrame[]> {
    if (!this.config.enableSourceMap) {
      return frames as StackFrame[];
    }

    const enhancedFrames = await Promise.all(
      frames.map(async frame => {
        try {
          if (!frame.lineno || !frame.colno || !frame.filename) {
            return frame as StackFrame;
          }

          const originalPosition = await this.getOriginalPosition(
            frame.filename,
            frame.lineno,
            frame.colno,
          );

          return {
            ...frame,
            originalFilename: originalPosition.source,
            originalLineno: originalPosition.line,
            originalColno: originalPosition.column,
            originalFunctionName: originalPosition.name || frame.functionName,
          } as StackFrame;
        } catch (error) {
          console.warn(`Failed to resolve frame:`, error);
          return frame as StackFrame;
        }
      }),
    );

    return enhancedFrames;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.forEach(consumer => {
      try {
        const destroyFn = (consumer as any).destroy;
        if (typeof destroyFn === 'function') {
          destroyFn.call(consumer);
        }
      } catch {
        // 忽略销毁失败
      }
    });
    this.cache.clear();
  }

  /**
   * 销毁解析器
   */
  destroy(): void {
    this.clearCache();
  }
}

// 单例实例
let sourceMapResolver: SourceMapResolver | null = null;

/**
 * 获取 SourceMap 解析器实例
 */
export function getSourceMapResolver(): SourceMapResolver {
  if (!sourceMapResolver) {
    sourceMapResolver = new SourceMapResolver();
  }
  return sourceMapResolver;
}

/**
 * 销毁 SourceMap 解析器
 */
export function destroySourceMapResolver(): void {
  if (sourceMapResolver) {
    sourceMapResolver.destroy();
    sourceMapResolver = null;
  }
}
