import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true // IP allow karne k liye zaroori hai
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});