import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Optional: Set base if deploying to a subpath (e.g., /my-app/)
  base: '/',  

  // Optional: Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
    ]
  },

  // Optional: Add CSS preprocessors (e.g., Sass)
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/styles/variables.scss";` // Include global variables if using SCSS
      },
    },
  },
})
