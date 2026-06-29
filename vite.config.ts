import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Deduplicate so Shyoski-INMAS sub-app uses the parent's single React instance.
    // Without this, INMAS's own node_modules/react causes "Invalid hook call" crashes.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'firebase'],
    alias: {
      // Pin react and react-dom to parent's copy to guarantee one React instance.
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
})



