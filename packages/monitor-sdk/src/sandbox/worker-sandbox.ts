export class WorkerSandbox {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingPromises = new Map<
    number,
    { resolve: Function; reject: Function }
  >();

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    const workerCode = `
      self.onmessage = function(e) {
        const { id, code, context, config } = e.data;
        
        try {
          // 设置执行超时
          const timeoutId = setTimeout(() => {
            self.postMessage({ id, error: 'Execution timeout' });
          }, config.timeout);

          // 创建受限环境
          const sandbox = {
            console: {
              log: (...args) => self.postMessage({ id, type: 'log', data: args }),
              warn: (...args) => self.postMessage({ id, type: 'warn', data: args }),
              error: (...args) => self.postMessage({ id, type: 'error', data: args })
            },
            setTimeout: self.setTimeout.bind(self),
            clearTimeout: self.clearTimeout.bind(self)
          };

          // 更安全的执行方式
          const executeInSandbox = (code: string, sandbox: any) => {
            // 1. 代码预处理 - 移除危险语句
            const sanitizedCode = sanitizeCode(code);
            
            // 2. 添加严格模式
            const wrappedCode = \`
              "use strict";
              \${sanitizedCode}
            \`;
            
            // 3. 创建函数时添加返回值包装
            const func = new Function(...Object.keys(sandbox), \`
              try {
                \${wrappedCode}
              } catch (error) {
                throw new Error('Plugin execution error: ' + error.message);
              }
            \`);
            
            return func(...Object.values(sandbox));
          };

          // 代码清理函数
          const sanitizeCode = (code: string): string => {
            // 移除潜在危险的全局对象访问
            return code
              .replace(/\\beval\\s*\\(/g, '/* eval disabled */(')
              .replace(/\\bFunction\\s*\\(/g, '/* Function disabled */(')
              .replace(/\\bthis\\s*\\./g, '/* this disabled */.')
              .replace(/\\barguments\\s*\\[/g, '/* arguments disabled */[');
          }

          // 执行插件代码
          const result = executeInSandbox(code, sandbox);
          
          clearTimeout(timeoutId);
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = e => {
      const { id, result, error, type, data } = e.data;

      if (type === 'log' || type === 'warn' || type === 'error') {
        console[type as 'log' | 'warn' | 'error']('[Plugin Worker]', ...data);
        return;
      }

      const promise = this.pendingPromises.get(id);
      if (promise) {
        this.pendingPromises.delete(id);
        if (error) {
          promise.reject(new Error(error));
        } else {
          promise.resolve(result);
        }
      }
    };
  }

  executePlugin(
    code: string,
    context: any,
    config: SandboxConfig,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = ++this.messageId;
      this.pendingPromises.set(id, { resolve, reject });

      this.worker.postMessage({ id, code, context, config });
    });
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingPromises.clear();
  }
}
