import { defineConfig } from 'vitepress';
import { generateSidebar } from './utils/gennerateSidebar';

export default defineConfig({
  title: 'EzMonitor',
  description: '一个开源开箱即用的前端监控SDK',
  head: [['link', { rel: 'icon', href: '/EzMonitor/logo.png' }]],
  themeConfig: {
    nav: [
      { text: '💭 首页', link: '/' },
      { text: '🦄 介绍', link: '/使用文档/快速开始' },
      { text: '👫 参与贡献', link: '/贡献文档' },
      { text: '👋 关于我们', link: '/about' },
    ],
    // 直接使用相对于 public 目录的路径
    logo: '/logo.png',
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present EzStars',
    },
    // 是否启动搜索功能
    search: {
      provider: 'local',
    },
    sidebar: generateSidebar(),
    socialLinks: [
      { icon: 'github', link: 'https://github.com/EzStars/EzMonitor' },
    ],
  },
  base: '/EzMonitor/',
  // 自定义主题颜色
  appearance: true,
});
