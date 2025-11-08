import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeGlobalSDK } from './api/sdk';

// 初始化全局 SDK
initializeGlobalSDK();

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
