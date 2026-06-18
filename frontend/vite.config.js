import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // تحديد ما إذا كنا في Docker أم لا
  const isDocker = process.env.VITE_API_URL?.includes('backend')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // داخل Docker: استخدم proxy إلى backend
      // خارج Docker: دع الواجهة الأمامية تتصل مباشرة بـ localhost:8000
      proxy: isDocker ? {
        '/api': {
          target: 'http://backend:8000',
          changeOrigin: true,
          secure: false,
          ws: true
        }
      } : undefined
    },
    build: {
      outDir: 'dist'
    }
  }
})
