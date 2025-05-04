import React from 'react';
import { createRoot } from 'react-dom/client';
import router from './src/router';
import { RouterProvider } from 'react-router';
import { ConfigProvider } from 'antd';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider>
    <RouterProvider router={router}></RouterProvider>,
  </ConfigProvider>,
);
