import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
// Productie wordt geserveerd onder /LeanGame/ (GitHub Pages project-site).
// Lokaal (dev/preview) blijft de base gewoon '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/LeanGame/' : '/',
  plugins: [react(), svgr()],
}))
