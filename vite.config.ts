import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages: ganti REPO dengan nama repo final Anda, lalu uncomment base.
export default defineConfig({
  plugins: [react()],
  // base: '/REPO-NAME/',
})
