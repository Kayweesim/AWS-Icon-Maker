/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dynamically imported on first use; pre-bundling them avoids a dev-server reload at that moment.
  optimizeDeps: {
    include: [
      'elkjs/lib/elk.bundled.js',
      'shiki/core',
      'shiki/engine/javascript',
      '@shikijs/langs/mermaid',
      '@shikijs/langs/python',
      '@shikijs/langs/terraform',
      '@shikijs/themes/github-light',
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
