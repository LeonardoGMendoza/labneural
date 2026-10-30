import { defineConfig } from 'vite'

// Igual ao StudentMedical: o build converte o código para iPhones com iOS antigo e gera a pasta ../demo (GitHub Pages).
export default defineConfig({
  base: './',
  build: {
    target: ['es2020', 'safari13', 'ios13'],
    outDir: '../demo',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000
  }
})
