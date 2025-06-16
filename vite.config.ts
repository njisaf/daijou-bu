import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    define: {
      // Expose environment variables to client-side code
      'process.env.LLM_TOKEN': JSON.stringify(env.LLM_TOKEN),
      'process.env.AGENT_TYPE': JSON.stringify(env.AGENT_TYPE),
      'process.env.OLLAMA_BASE_URL': JSON.stringify(env.OLLAMA_BASE_URL),
      'process.env.OLLAMA_MODEL': JSON.stringify(env.OLLAMA_MODEL),
    },
    build: {
      // Production optimization settings
      target: 'es2020',
      minify: 'terser',
      sourcemap: false,
      chunkSizeWarningLimit: 400, // Warn if chunks exceed 400kb
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'mobx-vendor': ['mobx-state-tree', 'mobx-react-lite'],
            'agent-modules': ['./src/agents/AgentFactory.ts'],
          }
        }
      },
      // Tree-shaking configuration
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console.log in production
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug', 'console.trace']
        }
      }
    },
    // Performance optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'mobx-state-tree', 'mobx-react-lite']
    }
  }
})
