import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/', // Add this! (Use './' if you are on a cPanel/shared host)
  plugins: [
    react(),
    tailwindcss(),
  ],
})