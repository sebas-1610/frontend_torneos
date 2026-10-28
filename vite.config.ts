import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // El backend (ms_torneos_security) no configura CORS: el proxy evita las peticiones cross-origin.
    proxy: {
      '/api': 'http://localhost:8181',
    },
  },
})
