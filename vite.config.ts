import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'three';
            }
            if (id.includes('vanilla-tilt') || id.includes('web-vitals')) {
              return 'vendor';
            }
            if (id.includes('@vercel')) {
              return 'vercel';
            }
            // Put other small deps in a common vendor chunk to reduce request count
            return 'vendor-common';
          }

          // Application chunks for deferred modules
          if (id.includes('src/modules')) {
            // Group deferred UI enhancements
            const uiModules = [
              'scroll-animations',
              'custom-cursor',
              'about-enhancements',
              'awards-accordion',
              'tooltip-portal',
              'tech-stack',
              'video-thumbnails',
              'projects-sort',
            ];
            if (uiModules.some(m => id.includes(m))) {
              return 'deferred-ui';
            }

            // Group heavier deferred features
            const features = [
              'chatbot',
              'particle-background',
              'pwa-manager',
            ];
            if (features.some(m => id.includes(m))) {
              return 'deferred-features';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
