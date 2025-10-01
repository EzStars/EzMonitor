import { Link } from 'react-router-dom';

const ErrorPage = () => {
  const triggerError = () => {
    throw new Error('这是一个测试错误');
  };

  const triggerPromiseError = () => {
    Promise.reject('这是一个 Promise 错误');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>错误监控测试页面</h1>
      <Link
        to="/"
        style={{ display: 'block', marginBottom: '20px', color: '#0066cc' }}
      >
        ← 返回首页
      </Link>

      <div style={{ marginTop: '20px' }}>
        <h2>错误测试</h2>
        <button
          onClick={triggerError}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          触发 JS 错误
        </button>

        <button
          onClick={triggerPromiseError}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#ff8844',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          触发 Promise 错误
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>资源加载错误测试</h3>
        <img
          src="/nonexistent-image.jpg"
          alt="测试图片加载错误"
          onError={() => console.log('图片加载失败')}
        />
      </div>
    </div>
  );
};

export default ErrorPage;
