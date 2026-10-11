import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Carpeta raíz del repo con los assets compartidos (img/img1.jpeg del hero de Home).
// ES LA ÚNICA FUENTE: no se duplica ni se mueve el archivo, solo se sirve.
const ROOT_IMG_DIR = path.resolve(__dirname, '../img')

const MIME = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

// Sirve /img/* desde ../img en desarrollo y emite el mismo contenido en
// dist/img/ durante el build (referencia a la misma fuente, sin copias).
function rootImgPlugin() {
  return {
    name: 'cordalia-root-img',
    configureServer(server) {
      server.middlewares.use('/img', (req, res, next) => {
        const pathname = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '')
        const filePath = path.resolve(ROOT_IMG_DIR, pathname)
        if (!filePath.startsWith(ROOT_IMG_DIR + path.sep)) return next()
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next()
        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    generateBundle() {
      if (!fs.existsSync(ROOT_IMG_DIR)) return
      for (const entry of fs.readdirSync(ROOT_IMG_DIR)) {
        const abs = path.join(ROOT_IMG_DIR, entry)
        if (!fs.statSync(abs).isFile()) continue
        this.emitFile({
          type: 'asset',
          fileName: `img/${entry}`,
          source: fs.readFileSync(abs),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), rootImgPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})