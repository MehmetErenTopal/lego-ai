import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // GitHub Pages üzerinde subfolder (alt klasör) olarak çalıştığı için depo adını ekliyoruz.
  base: '/lego-ai/',
})
