import { Link } from 'react-router-dom'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

export default function HomePage() {
  const { status } = useMonitorSDK()

  return (
    <section className="page-card">
      <h2>测试主页</h2>
      <p className="muted">这里是 monitor-test 的统一入口。每个专题页只验证一类能力，方便回归和扩展。</p>
      <p>
        当前 SDK 状态：
        <strong>
          {' '}
          {status}
        </strong>
      </p>
      <div className="grid">
        <article className="tile">
          <h3>Tracking</h3>
          <p>验证 track / trackPage / trackUser 三种埋点调用。</p>
          <Link to="/tracking">进入测试页</Link>
        </article>
        <article className="tile">
          <h3>性能监控</h3>
          <p>首版包含手动性能采样触发和结果回显。</p>
          <Link to="/performance">进入测试页</Link>
        </article>
        <article className="tile">
          <h3>错误监控</h3>
          <p>首版包含 JS 错误、Promise 错误与资源错误触发。</p>
          <Link to="/error">进入测试页</Link>
        </article>
      </div>
    </section>
  )
}
