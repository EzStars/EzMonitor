export interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  allowedAPIs: string[];
  maxExecutionTime: number;
}

export interface PluginContext {
  console: Console;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  fetch?: typeof fetch;
  localStorage?: Storage;
}

export class PluginSandbox {
  private config: SandboxConfig;
  private iframe?: HTMLIFrameElement;
  private worker?: Worker;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  async executePlugin(code: string, context: PluginContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Plugin execution timeout'));
      }, this.config.timeout);

      try {
        const result = this.runInSandbox(code, context);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private runInSandbox(code: string, context: PluginContext): any {
    // 创建受限的执行环境
    const sandbox = this.createSandboxEnvironment(context);
    const func = new Function(...Object.keys(sandbox), code);
    return func(...Object.values(sandbox));
  }

  private createSandboxEnvironment(context: PluginContext): any {
    return {
      console: this.createSafeConsole(),
      setTimeout: context.setTimeout,
      clearTimeout: context.clearTimeout,
      // 其他安全的API
    };
  }

  private createSafeConsole(): Console {
    return {
      log: (...args: any[]) => console.log('[Plugin]', ...args),
      warn: (...args: any[]) => console.warn('[Plugin]', ...args),
      error: (...args: any[]) => console.error('[Plugin]', ...args),
    } as Console;
  }
}
