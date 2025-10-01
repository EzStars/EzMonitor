import { Link } from 'react-router-dom';
import { useState } from 'react';

const BehaviorPage = () => {
  const [clickCount, setClickCount] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    console.log(`按钮被点击了 ${clickCount + 1} 次`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    console.log('输入值变化:', e.target.value);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>行为监控测试页面</h1>
      <Link
        to="/"
        style={{ display: 'block', marginBottom: '20px', color: '#0066cc' }}
      >
        ← 返回首页
      </Link>

      <div style={{ marginTop: '20px' }}>
        <h2>用户行为测试</h2>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleClick}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#44cc44',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            点击测试 (点击次数: {clickCount})
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="输入测试"
            style={{
              padding: '10px',
              fontSize: '16px',
              width: '300px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#666',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            外链点击测试
          </a>
        </div>

        <div>
          <h3>操作日志</h3>
          <p>请打开浏览器控制台查看行为日志</p>
        </div>
      </div>
    </div>
  );
};

export default BehaviorPage;
