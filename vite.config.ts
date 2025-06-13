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
    },
  }
})
