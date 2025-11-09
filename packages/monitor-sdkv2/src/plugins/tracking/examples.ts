/**
 * 自定义埋点插件使用示例
 *
 * 本文件展示如何使用 TrackingPlugin 的核心功能
 */

import { TrackingPlugin } from './TrackingPlugin';

/**
 * 基础使用示例
 */
export function createBasicExample() {
  // 创建埋点插件实例
  const trackingPlugin = new TrackingPlugin({
    autoTrackPage: true,
  });

  return {
    plugin: trackingPlugin,

    // 基础埋点示例
    basicTracking() {
      // 事件埋点
      trackingPlugin.track('button_click', {
        buttonName: '登录按钮',
        location: 'header',
        userId: 'user123',
      });

      // 页面埋点
      trackingPlugin.trackPage('/home', {
        source: 'direct',
        loadTime: 1200,
      });

      // 用户埋点
      trackingPlugin.trackUser('user123', {
        email: 'user@example.com',
        plan: 'premium',
      });
    },

    // 上下文管理示例
    contextManagement() {
      // 设置全局上下文
      trackingPlugin.setContext({
        experimentId: 'A001',
        variant: 'control',
      });

      // 事件会自动包含上下文
      trackingPlugin.track('feature_used', {
        featureName: 'search',
      });

      // 移除上下文
      trackingPlugin.removeContext('experimentId');
    },
  };
}

/**
 * 高级配置示例
 */
export function createAdvancedExample() {
  const trackingPlugin = new TrackingPlugin({
    // 自定义数据处理器
    dataProcessor: data => ({
      ...data,
      processed: true,
      version: '2.0.0',
      timestamp: Date.now(),
    }),

    // 自定义事件过滤器
    eventFilter: (eventName, properties) => {
      // 过滤调试事件
      if (eventName.startsWith('debug_')) return false;
      // 过滤没有属性的事件
      if (!properties || Object.keys(properties).length === 0) return false;
      return true;
    },
  });

  return {
    plugin: trackingPlugin,

    // 过滤器测试
    testFiltering() {
      // 这个会被过滤掉
      trackingPlugin.track('debug_test');

      // 这个会被上报
      trackingPlugin.track('valid_event', { action: 'click' });
    },
  };
}

/**
 * 电商场景示例
 */
export function createEcommerceExample() {
  const trackingPlugin = new TrackingPlugin({
    autoTrackPage: true,
  });

  return {
    plugin: trackingPlugin,

    // 完整购物流程埋点
    trackShoppingFlow() {
      // 1. 商品浏览
      trackingPlugin.track('product_view', {
        productId: 'prod_001',
        productName: 'iPhone 15 Pro',
        category: 'electronics',
        price: 7999,
      });

      // 2. 加入购物车
      trackingPlugin.track('add_to_cart', {
        productId: 'prod_001',
        quantity: 1,
        price: 7999,
      });

      // 3. 访问购物车
      trackingPlugin.trackPage('/cart', {
        itemCount: 1,
        totalAmount: 7999,
      });

      // 4. 开始结算
      trackingPlugin.track('checkout_start', {
        orderId: 'order_456',
        totalAmount: 7999,
        paymentMethod: 'credit_card',
      });

      // 5. 完成购买
      trackingPlugin.track('purchase_complete', {
        orderId: 'order_456',
        totalAmount: 7999,
        itemCount: 1,
      });
    },
  };
}

/**
 * 使用说明和最佳实践
 */
export const UsageGuide = {
  // 推荐的事件命名
  eventNaming: {
    good: [
      'button_click',
      'page_view',
      'user_login',
      'product_purchase',
      'form_submit',
    ],
    bad: ['click', 'event1', 'action', 'data'],
  },

  // 推荐的属性结构
  propertyStructure: {
    example: {
      // 基础信息
      objectId: 'unique_id',
      objectType: 'button|page|product',

      // 业务属性
      businessValue: 'specific_value',
      category: 'classification',

      // 上下文信息
      source: 'where_from',
      timestamp: 'when_happened',
    },
  },

  // 性能优化建议
  performanceOptimization: {
    batchSettings: {
      highTraffic: { batchInterval: 10000, batchSize: 100 },
      normalTraffic: { batchInterval: 5000, batchSize: 50 },
      lowTraffic: { batchInterval: 2000, batchSize: 20 },
    },

    filteringStrategy: {
      sampleHighFrequency: true,
      filterDebugEvents: true,
      validateProperties: true,
    },
  },
};
