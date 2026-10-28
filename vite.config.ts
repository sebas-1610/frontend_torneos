import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // El backend (ms_torneos_security) no configura CORS: el proxy evita las peticiones cross-origin.
    // API_PROXY_TARGET permite apuntar a otro backend (por ejemplo, uno de pruebas) sin tocar este archivo.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8181',
    },
  },
})
