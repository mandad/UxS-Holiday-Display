import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Map process.env.API_KEY to window.env.API_KEY which is injected by server.js at runtime.
    // This allows the Docker container to pick up the env var from Cloud Run configuration.
    'process.env.API_KEY': '(window.env?.API_KEY || process.env.API_KEY || "")',
  },
  server: {
    port: 8080
  },
  build: {
    outDir: 'dist'
  }
});