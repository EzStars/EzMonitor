import { useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

interface GenerationLog {
  id: number
  timestamp: string
  type: 'info' | 'success' | 'error'
  message: string
}

export default function DataGeneratorPage() {
  const { status, trackEvent, trackPage, trackUser } = useMonitorSDK()
  const [trackingCount, setTrackingCount] = useState(100)
  const [performanceCount, setPerformanceCount] = useState(50)
  const [errorCount, setErrorCount] = useState(20)
  const [isGenerating, setIsGenerating] = useState(false)
  const [logs, setLogs] = useState<GenerationLog[]>([])
  const [progress, setProgress] = useState(0)

  const addLog = (type: GenerationLog['type'], message: string) => {
    const log: GenerationLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    }
    setLogs(prev => [log, ...prev].slice(0, 50)) // 只保留最近50条
  }

  // 生成随机用户ID
  const randomUserId = () => `user_${Math.floor(Math.random() * 10000)}`

  // 生成随机页面路径
  const randomPagePath = () => {
    const pages = ['/home', '/product', '/cart', '/checkout', '/profile', '/settings', '/search', '/detail']
    return pages[Math.floor(Math.random() * pages.length)]
  }

  // 生成随机事件名
  const randomEventName = () => {
    const events = [
      'button_click',
      'form_submit',
      'product_view',
      'add_to_cart',
      'search_query',
      'tab_switch',
      'modal_open',
      'video_play',
      'file_download',
      'share_click',
    ]
    return events[Math.floor(Math.random() * events.length)]
  }

  // 批量生成 Tracking 事件
  const generateTrackingData = async () => {
    setIsGenerating(true)
    addLog('info', `开始生成 ${trackingCount} 条 Tracking 事件...`)
    
    try {
      for (let i = 0; i < trackingCount; i++) {
        const eventType = Math.random()
        
        if (eventType < 0.5) {
          // 生成 trackEvent
          await trackEvent(randomEventName(), {
            timestamp: Date.now(),
            index: i,
            random: Math.random(),
            source: 'data-generator',
          })
        } else if (eventType < 0.8) {
          // 生成 trackPage
          await trackPage(randomPagePath(), {
            timestamp: Date.now(),
            index: i,
            referrer: randomPagePath(),
          })
        } else {
          // 生成 trackUser
          await trackUser(randomUserId(), {
            timestamp: Date.now(),
            role: Math.random() > 0.5 ? 'user' : 'admin',
            vip: Math.random() > 0.7,
          })
        }
        
        setProgress(Math.round(((i + 1) / trackingCount) * 100))
        
        // 每10条暂停一下，避免阻塞UI
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      addLog('success', `成功生成 ${trackingCount} 条 Tracking 事件`)
    } catch (error) {
      addLog('error', `生成 Tracking 事件失败: ${error}`)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  // 批量生成 Performance 数据
  const generatePerformanceData = async () => {
    setIsGenerating(true)
    addLog('info', `开始生成 ${performanceCount} 条 Performance 数据...`)
    
    try {
      for (let i = 0; i < performanceCount; i++) {
        // 模拟长任务性能数据
        const duration = Math.floor(Math.random() * 1000) + 50
        
        await trackEvent('performance_long_task', {
          type: 'longtask',
          duration,
          startTime: Date.now(),
          index: i,
          taskName: `task_${Math.floor(Math.random() * 100)}`,
        })
        
        setProgress(Math.round(((i + 1) / performanceCount) * 100))
        
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      addLog('success', `成功生成 ${performanceCount} 条 Performance 数据`)
    } catch (error) {
      addLog('error', `生成 Performance 数据失败: ${error}`)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  // 批量生成 Error 日志
  const generateErrorData = async () => {
    setIsGenerating(true)
    addLog('info', `开始生成 ${errorCount} 条 Error 日志...`)
    
    try {
      const errorTypes = [
        'TypeError: Cannot read property',
        'ReferenceError: variable is not defined',
        'SyntaxError: Unexpected token',
        'RangeError: Maximum call stack size exceeded',
        'Network Error: Failed to fetch',
      ]
      
      for (let i = 0; i < errorCount; i++) {
        const errorMessage = errorTypes[Math.floor(Math.random() * errorTypes.length)]
        
        await trackEvent('error_occurred', {
          type: 'error',
          message: errorMessage,
          stack: `Error at line ${Math.floor(Math.random() * 1000)}`,
          timestamp: Date.now(),
          index: i,
          severity: Math.random() > 0.5 ? 'warning' : 'error',
        })
        
        setProgress(Math.round(((i + 1) / errorCount) * 100))
        
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      addLog('success', `成功生成 ${errorCount} 条 Error 日志`)
    } catch (error) {
      addLog('error', `生成 Error 日志失败: ${error}`)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  // 一键生成所有类型数据
  const generateAllData = async () => {
    addLog('info', '开始批量生成所有类型测试数据...')
    await generateTrackingData()
    await generatePerformanceData()
    await generateErrorData()
    addLog('success', '所有测试数据生成完成！')
  }

  return (
    <section className="page-card">
      <h2>测试数据生成器</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>
      <p className="muted">批量生成各类测试数据，用于验证 SDK 的性能和稳定性。</p>

      <div style={{ marginTop: '20px' }}>
        <h3>Tracking 事件生成</h3>
        <div className="control-row">
          <label htmlFor="tracking-count">数量：</label>
          <input
            id="tracking-count"
            type="number"
            min="1"
            max="1000"
            value={trackingCount}
            onChange={e => setTrackingCount(Number(e.target.value))}
            disabled={isGenerating}
            style={{ width: '100px' }}
          />
          <button onClick={generateTrackingData} disabled={isGenerating}>
            生成 Tracking 事件
          </button>
        </div>

        <h3>Performance 数据生成</h3>
        <div className="control-row">
          <label htmlFor="performance-count">数量：</label>
          <input
            id="performance-count"
            type="number"
            min="1"
            max="500"
            value={performanceCount}
            onChange={e => setPerformanceCount(Number(e.target.value))}
            disabled={isGenerating}
            style={{ width: '100px' }}
          />
          <button onClick={generatePerformanceData} disabled={isGenerating}>
            生成 Performance 数据
          </button>
        </div>

        <h3>Error 日志生成</h3>
        <div className="control-row">
          <label htmlFor="error-count">数量：</label>
          <input
            id="error-count"
            type="number"
            min="1"
            max="200"
            value={errorCount}
            onChange={e => setErrorCount(Number(e.target.value))}
            disabled={isGenerating}
            style={{ width: '100px' }}
          />
          <button onClick={generateErrorData} disabled={isGenerating}>
            生成 Error 日志
          </button>
        </div>

        <h3>一键生成所有数据</h3>
        <div className="control-row">
          <button
            onClick={generateAllData}
            disabled={isGenerating}
            style={{ backgroundColor: '#ff6b6b', color: 'white' }}
          >
            🚀 生成全部测试数据
          </button>
        </div>

        {isGenerating && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ 
              width: '100%', 
              height: '30px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '5px', 
              overflow: 'hidden' 
            }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#4caf50',
                  transition: 'width 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                {progress}%
              </div>
            </div>
          </div>
        )}
      </div>

      <h3>生成日志</h3>
      <div className="log-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {logs.length === 0 ? (
          <p className="muted">暂无日志</p>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className="log-item"
              style={{
                padding: '8px',
                marginBottom: '8px',
                borderRadius: '4px',
                backgroundColor:
                  log.type === 'success'
                    ? '#e8f5e9'
                    : log.type === 'error'
                      ? '#ffebee'
                      : '#e3f2fd',
              }}
            >
              <strong style={{ marginRight: '10px' }}>[{log.timestamp}]</strong>
              <span
                style={{
                  color:
                    log.type === 'success'
                      ? '#2e7d32'
                      : log.type === 'error'
                        ? '#c62828'
                        : '#1565c0',
                }}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
