import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiOrigin = process.env.PILATES_API_ORIGIN ?? 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': apiOrigin },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    restoreMocks: true,
  },
});
