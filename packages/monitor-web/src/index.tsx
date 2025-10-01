import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Ezmonitor from '@ezstars/monitor-sdk';
Ezmonitor.init();
Ezmonitor.Exception();
Ezmonitor.Error.initErrorEventListener();
Ezmonitor.Performance();
Ezmonitor.getBehaviour();
const ErrorBoundary = Ezmonitor.Error
  .ErrorBoundary as unknown as React.ComponentType<{
  Fallback: React.ReactNode;
  children: React.ReactNode;
}>;
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <ErrorBoundary Fallback={<div>Error occurred</div>}>
      <App />
    </ErrorBoundary>,
  );
}
