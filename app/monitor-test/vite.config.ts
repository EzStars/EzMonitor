import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createAutoSourcemapUploadPlugin } from './build/autoSourcemapUploadPlugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '')
  const baseUrl = env.VITE_API_URL?.trim() || 'http://localhost:3000'
  const release = env.MONITOR_RELEASE?.trim() || env.VITE_MONITOR_RELEASE?.trim() || 'monitor-test-local'

  return {
    build: {
      sourcemap: true,
    },
    envDir: '../../',
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      createAutoSourcemapUploadPlugin({
        appId: env.MONITOR_APP_ID?.trim() || 'monitor-test-app',
        release,
        uploadKey: env.MONITOR_SOURCEMAP_UPLOAD_KEY?.trim(),
        baseUrl,
        strict: env.MONITOR_SOURCEMAP_STRICT === 'true',
      }),
    ],
  }
})
