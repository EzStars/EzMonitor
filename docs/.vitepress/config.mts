import { defineConfig } from 'vitepress'
import { generateSidebar } from './utils/gennerateSidebar'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EzMonitor",
  description: "一个开源开箱即用的前端监控SDK",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '介绍', link: '/使用文档' },
      { text: '关于我们', link: '/about' },
    ],

    sidebar: generateSidebar(),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/EzStars' }
    ]
  },
  base: '/EzMonitor/', // 部署到github时需要设置
})
