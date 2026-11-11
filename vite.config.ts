import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Los backends no configuran CORS: el proxy evita las peticiones cross-origin.
    // Vite usa la PRIMERA regla que coincide, así que la más específica va primero:
    //   /api/deportiva/... → ms_torneos_deportiva (Gestión Deportiva, Anexo 2)
    //   /api/...           → ms_torneos_security
    // Las variables permiten apuntar a otro backend (por ejemplo, uno de pruebas) sin tocar este archivo.
    proxy: {
      '/api/deportiva': process.env.DEPORTIVA_PROXY_TARGET ?? 'http://localhost:8182',
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8181',
    },
  },
})
