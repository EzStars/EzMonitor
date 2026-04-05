import { NavLink, Route, Routes } from 'react-router-dom'
import DataGeneratorPage from './pages/DataGeneratorPage'
import ErrorPage from './pages/ErrorPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import PerformancePage from './pages/PerformancePage'
import TrackingPage from './pages/TrackingPage'
import './App.css'

function App() {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <h1>EzMonitor Test Portal</h1>
        <p>统一测试主页，按能力路由进入专项验证页面。</p>
        <nav className="portal-nav">
          <NavLink to="/" end>主页</NavLink>
          <NavLink to="/tracking">Tracking</NavLink>
          <NavLink to="/performance">性能</NavLink>
          <NavLink to="/error">错误</NavLink>
          <NavLink to="/data-generator">数据生成器</NavLink>
        </nav>
      </header>

      <main className="portal-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/data-generator" element={<DataGeneratorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
