import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Usa caminhos relativos para compatibilidade com Electron
  server: {
    port: 6987,
    strictPort: true, // Falha se a porta não estiver disponível
    host: true // Permite acesso de outros dispositivos na rede
  }
})
