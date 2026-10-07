import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build stamp: shown in the app and written to /version.json so open copies
// of the app can notice a new release and reload themselves.
const BUILD = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) })
      },
    },
  ],
})
