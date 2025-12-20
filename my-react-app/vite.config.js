import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow accessing the dev server via network IP (useful when proxying through Burp)
    host: true,
    // Disable HMR (WebSocket) so requests are plain HTTP and can be intercepted by tools
    hmr: false,
  },
})