import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
// Productie wordt geserveerd onder /LeanGame/ (GitHub Pages project-site).
// Lokaal (dev/preview) blijft de base gewoon '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/LeanGame/' : '/',
  plugins: [
    react(),
    svgr({
      // Alleen ?react wordt een React-component; ?url blijft een gewone asset-URL
      // (nodig voor de tile-textures in background-image).
      include: '**/*.svg?react',
      svgrOptions: {
        // house-stages.svg heeft id="stage-1..4" die we per bouwfase tonen: niet strippen.
        svgoConfig: {
          plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false } } }],
        },
      },
    }),
  ],
}))
