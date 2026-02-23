import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Default Azure backend URL
  const defaultBackendUrl = 'https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net'
  const proxyTarget = env.VITE_PROXY_TARGET || defaultBackendUrl

  return {
    plugins: [react()],
    resolve: {
      // Force single React instance to fix "unstable_scheduleCallback" undefined
      dedupe: ['react', 'react-dom', 'scheduler'],
    },
    server: {
      port: 3000,
      open: true,
      headers: {
        'Content-Security-Policy': `default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob: http: https:; media-src 'self' data: blob: http: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: ws: wss:; frame-src 'self' data: blob: https://docs.google.com https://www.google.com 
        https://maps.google.com 
        https://www.youtube.com 
        https://www.youtube-nocookie.com 
        https://player.vimeo.com 
        https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net;`.replace(/\s+/g, ' ').trim()
      },
    
      proxy: {
        // Proxy API requests to the backend server to avoid CORS issues
        // Defaults to Azure backend, can be overridden with VITE_PROXY_TARGET env variable
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          // Only proxy if backend is actually running (optional)
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log(`Proxy error - make sure backend server is running on ${proxyTarget}:`, err.message)
            })
          }
        }
      }
    },
  build: {
    outDir: 'build', // Match Azure Static Web Apps expected output location
    // Increase chunk size warning limit to 1500kb
    // Note: survey-vendor is ~1.37MB but gzipped is only ~327KB which is acceptable
    // icons-vendor is ~732KB but gzipped is only ~116KB which is acceptable
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better code splitting
        manualChunks: (id) => {
          // Node modules vendor chunks
          if (id.includes('node_modules')) {
            // React + react-dom + scheduler must stay together to avoid
            // "unstable_scheduleCallback" undefined TypeError (scheduler init order)
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules\\react\\') ||
              id.includes('react-dom') ||
              id.includes('scheduler')
            ) {
              return 'react-vendor'
            }
            
            // Puck editor (large library)
            if (id.includes('@measured/puck')) {
              return 'puck-vendor'
            }
            
            // Survey libraries (split into separate chunks as they're large)
            if (id.includes('survey-core')) {
              return 'survey-core-vendor'
            }
            if (id.includes('survey-react-ui')) {
              return 'survey-react-vendor'
            }
            
            // Icons library (can be large with many icons, but gzipped size is acceptable)
            if (id.includes('@untitled-ui/icons-react')) {
              return 'icons-vendor'
            }
            
            // React UI libraries
            if (id.includes('react-select') || id.includes('react-hot-toast') || id.includes('react-time-picker')) {
              return 'react-ui-vendor'
            }
            
            // Excel/File processing
            if (id.includes('xlsx')) {
              return 'xlsx-vendor'
            }
            
            // Utility libraries
            if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
              return 'utils-vendor'
            }
            
            // Other node_modules (catch-all for remaining dependencies)
            return 'vendor'
          }
          
          // Split large component directories
          if (id.includes('/components/eventhub/') || id.includes('\\components\\eventhub\\')) {
            // Split eventhub components by feature area
            if (id.includes('communication')) {
              return 'eventhub-communication'
            }
            if (id.includes('schedulesession')) {
              return 'eventhub-schedule'
            }
            if (id.includes('attendeemanagement') || id.includes('speakermanagement')) {
              return 'eventhub-attendees'
            }
            if (id.includes('resourcemanagement')) {
              return 'eventhub-resources'
            }
            return 'eventhub-other'
          }
          
          // Split dashboard components
          if (id.includes('/components/dashboard/') || id.includes('\\components\\dashboard\\')) {
            return 'dashboard'
          }
          
          // Split public components
          if (id.includes('/components/public/') || id.includes('\\components\\public\\')) {
            return 'public-components'
          }
          
          // Split advanced components (Puck blocks)
          if (id.includes('/components/advanced/') || id.includes('\\components\\advanced\\')) {
            return 'advanced-components'
          }
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Optimize asset file names
          const name = assetInfo.name || ''
          if (name.indexOf('.png') > -1 || name.indexOf('.jpg') > -1 || name.indexOf('.jpeg') > -1) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (name.indexOf('.css') > -1) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    // Optimize asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    // Source maps for production (optional - set to false for smaller builds)
    sourcemap: false
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@measured/puck']
  }
  }
})
