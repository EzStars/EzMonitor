import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const PerformancePage = () => {
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    // 获取性能数据
    if (window.performance) {
      const perfData = {
        navigation: performance.getEntriesByType('navigation')[0],
        memory: (performance as any).memory,
      };
      setPerformanceData(perfData);
    }
  }, []);

  const triggerSlowOperation = () => {
    const start = Date.now();
    // 模拟耗时操作
    let result = 0;
    for (let i = 0; i < 100000000; i++) {
      result += i;
    }
    const end = Date.now();
    alert(`操作耗时: ${end - start}ms`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>性能监控测试页面</h1>
      <Link
        to="/"
        style={{ display: 'block', marginBottom: '20px', color: '#0066cc' }}
      >
        ← 返回首页
      </Link>

      <div style={{ marginTop: '20px' }}>
        <h2>性能测试</h2>
        <button
          onClick={triggerSlowOperation}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#4488ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          触发慢操作
        </button>
      </div>

      {performanceData && (
        <div style={{ marginTop: '30px' }}>
          <h3>当前页面性能数据</h3>
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(performanceData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PerformancePage;
