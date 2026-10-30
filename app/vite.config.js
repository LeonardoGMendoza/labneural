import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))

// Igual ao StudentMedical: o build converte o código para iPhones com iOS antigo e gera a pasta ../demo (GitHub Pages).
// Duas páginas: as lições (index.html) e o mundo real com a câmera (camera.html).
export default defineConfig({
  base: './',
  build: {
    target: ['es2020', 'safari13', 'ios13'],
    outDir: '../demo',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: resolve(aqui, 'index.html'),
        camera: resolve(aqui, 'camera.html')
      }
    }
  }
})
