import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/app';
import router from './src/router';
import { RouterProvider } from 'react-router';

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router}></RouterProvider>,
);
