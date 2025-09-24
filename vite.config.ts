import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: [
    '**/models/**/*.json',
    '**/models/**/*.bin'
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl']
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('atmospheric.worker')) return 'worker-atmospheric';
          if (id.includes('atmosphericSimulators')) return 'simulators';
          if (id.includes('atmosphericPhysics')) return 'physics';
          if (id.includes('correlation.worker')) return 'worker-correlation';
          if (id.includes('memoizedFilters')) return 'filters-optimized';
          if (id.includes('chartCanvas')) return 'charts-canvas';
          if (id.includes('react-window')) return 'virtualization';
          if (id.includes('@tensorflow/tfjs')) return 'tensorflow';
          if (id.includes('/src/lib/mlClassifier')) return 'ml-classifier';
        }
      }
    }
  }
})
