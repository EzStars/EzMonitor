import { theme as antdTheme, ConfigProvider } from 'antd'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'
import './index.css'

const theme = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: '#73f0b7',
    colorInfo: '#74c9ff',
    colorSuccess: '#6ae4a7',
    colorWarning: '#f7c66f',
    colorError: '#ff7a90',
    borderRadius: 14,
    fontFamily: 'var(--font-body)',
    fontFamilyCode: 'var(--font-mono)',
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>,
)
