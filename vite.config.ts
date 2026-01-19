import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  server: {
    port: 8001,
    open: true,
    cors: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; upgrade-insecure-requests; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-analytics.com https://vitals.vercel-insights.com https://vercel.live; style-src 'self' 'unsafe-inline' https://vercel.live; img-src 'self' data: https: blob: https://vercel.live; font-src 'self' data: https://vercel.live; connect-src 'self' https://generativelanguage.googleapis.com https://va.vercel-analytics.com https://vitals.vercel-insights.com https://www.google-analytics.com https://vercel.live; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://vercel.live; object-src 'none'; base-uri 'none'; report-uri /api/csp-report; report-to csp-endpoint",
      'Report-To': '{"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"/api/csp-report"}]}',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      // 'X-XSS-Protection': '1; mode=block', // removed deprecated header
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    cssMinify: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        loadingDemo: path.resolve(__dirname, 'loading-demo.html'),
        mobileTestGuide: path.resolve(__dirname, 'mobile-test-guide.html')
      },
      output: {
        manualChunks: {
          three: ['three'],
        },
        assetFileNames: (assetInfo) => {
          // Organize assets by type
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    }
  }
})
