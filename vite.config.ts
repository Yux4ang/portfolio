import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 让代码里可以用 "@/xxx" 代替相对路径 "../../xxx"，方便文件移动时不用改一堆 import
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // 本地开发时，把 /api/proxy 请求转发到价格代理服务（见 server/ 目录）
      // 生产环境请改用 VITE_PRICE_PROXY_BASE_URL 环境变量指向真实部署地址
      '/api/proxy': {
        target: process.env.VITE_LOCAL_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/proxy/, ''),
      },
    },
  },
})