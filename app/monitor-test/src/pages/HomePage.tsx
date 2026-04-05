import { Link } from 'react-router-dom'
import { getReportUrl } from '../services/sdkRuntime'
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
      <p className="muted">上报地址：{getReportUrl()}</p>
      <div className="grid">
        <article className="tile">
          <h3>Tracking</h3>
          <p>验证 track / trackPage / trackUser 多场景调用与结果回显。</p>
          <Link to="/tracking">进入测试页</Link>
        </article>
        <article className="tile">
          <h3>性能监控</h3>
          <p>验证 long task、Navigation Timing、Resource Timing 等采样。</p>
          <Link to="/performance">进入测试页</Link>
        </article>
        <article className="tile">
          <h3>错误监控</h3>
          <p>验证同步错误、Promise rejection、资源加载错误的捕获与回显。</p>
          <Link to="/error">进入测试页</Link>
        </article>
        <article className="tile">
          <h3>数据生成器</h3>
          <p>批量生成各类测试数据，验证 SDK 性能和稳定性。</p>
          <Link to="/data-generator">进入测试页</Link>
        </article>
      </div>
    </section>
  )
}
