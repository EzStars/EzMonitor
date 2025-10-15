import { SandboxConfig } from './sandbox';
import { WorkerSandbox } from './worker-sandbox';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  code: string;
  permissions: string[];
  config?: any;
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private sandbox: WorkerSandbox;
  private defaultConfig: SandboxConfig = {
    timeout: 5000,
    memoryLimit: 10 * 1024 * 1024, // 10MB
    allowedAPIs: ['console', 'setTimeout', 'clearTimeout'],
    maxExecutionTime: 30000,
  };

  constructor() {
    this.sandbox = new WorkerSandbox();
  }

  async loadPlugin(plugin: Plugin): Promise<void> {
    // 验证插件
    this.validatePlugin(plugin);

    // 存储插件
    this.plugins.set(plugin.id, plugin);

    console.log(`Plugin ${plugin.name} loaded successfully`);
  }

  async executePlugin(pluginId: string, data?: any): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const context = this.createPluginContext(plugin, data);
    return await this.sandbox.executePlugin(
      plugin.code,
      context,
      this.defaultConfig,
    );
  }

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.id || !plugin.name || !plugin.code) {
      throw new Error('Invalid plugin: missing required fields');
    }

    // 检查恶意代码
    if (this.containsMaliciousCode(plugin.code)) {
      throw new Error('Plugin contains potentially malicious code');
    }
  }

  private containsMaliciousCode(code: string): boolean {
    const blacklistedPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /document\./,
      /window\./,
      /global\./,
      /process\./,
      /require\s*\(/,
      /import\s*\(/,
    ];

    return blacklistedPatterns.some(pattern => pattern.test(code));
  }

  private createPluginContext(plugin: Plugin, data?: any): any {
    return {
      pluginId: plugin.id,
      data,
      config: plugin.config,
      // 只提供允许的 API
      console: true,
      setTimeout: true,
      clearTimeout: true,
    };
  }

  unloadPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  destroy(): void {
    this.sandbox.destroy();
    this.plugins.clear();
  }
}
