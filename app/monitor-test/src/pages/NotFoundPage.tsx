import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="page-card">
      <h2>页面不存在</h2>
      <p className="muted">该测试路由尚未配置或地址输入错误。</p>
      <Link to="/">返回测试主页</Link>
    </section>
  )
}
