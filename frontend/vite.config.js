import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/products': 'http://localhost:3000',
      '/checkout': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/orders': 'http://localhost:3000',
      '/licenses': 'http://localhost:3000',
      '/coupons': 'http://localhost:3000',
      '/webhooks': 'http://localhost:3000',
    },
  },
});
