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
            if (id.includes('firebase')) {
              return 'firebase';
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

          // Preserve application-level dynamic-import boundaries. Grouping
          // them here can pull shared modules into a lazy feature chunk and
          // accidentally turn that feature into a critical modulepreload.
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
