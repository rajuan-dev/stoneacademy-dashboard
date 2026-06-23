import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'recharts'],
          antd: ['antd', '@ant-design/icons'],
          editor: ['jodit-react'],
          icons: ['lucide-react', 'react-icons'],
        },
      },
    },
  },
})
