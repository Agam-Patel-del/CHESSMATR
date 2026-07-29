import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    
  ],
  server : {
    port : 3000,
    open : true,
    proxy : {
      '/api' : {
        target : 'http://localhost:5000',
        changeOrigin : true,
        secure : false,
      },
      '/socket.io' : {
        target : 'http://localhost:5000',
        changeOrigin : true,
        ws : true,
      }
    }
  }
})
