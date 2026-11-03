import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiOrigin = env.NURPOS_LARAVEL_API_ORIGIN || 'http://127.0.0.1:8000';
  const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
  return {
  root: frontendRoot,
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: apiOrigin,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.authorization || !req.headers.cookie) return;
            const session = req.headers.cookie.split(';').map(v => v.trim()).find(v => v.startsWith('nurpos_session='));
            if (session) proxyReq.setHeader('Authorization', `Bearer ${decodeURIComponent(session.slice('nurpos_session='.length))}`);
          });
        }
      }
    }
  },
  preview: {
    proxy: {
      '/api': {
        target: apiOrigin,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.authorization || !req.headers.cookie) return;
            const session = req.headers.cookie.split(';').map(v => v.trim()).find(v => v.startsWith('nurpos_session='));
            if (session) proxyReq.setHeader('Authorization', `Bearer ${decodeURIComponent(session.slice('nurpos_session='.length))}`);
          });
        }
      }
    }
  },
  plugins: [
    {
      name: 'copy-pos-assets',
      closeBundle() {
        const srcJsDir = resolve(frontendRoot, 'js');
        const destJsDir = resolve(frontendRoot, 'dist', 'js');
        if (fs.existsSync(srcJsDir)) {
          if (!fs.existsSync(destJsDir)) fs.mkdirSync(destJsDir, { recursive: true });
          for (const f of fs.readdirSync(srcJsDir)) fs.copyFileSync(resolve(srcJsDir, f), resolve(destJsDir, f));
        }

        const srcManifest = resolve(frontendRoot, 'manifest.json');
        const destManifest = resolve(frontendRoot, 'dist', 'manifest.json');
        if (fs.existsSync(srcManifest)) fs.copyFileSync(srcManifest, destManifest);

        for (const page of ['dashboard.html', 'new_shift.html', 'splash.html', 'owner-setup.html']) {
          const srcPage = resolve(frontendRoot, page);
          if (fs.existsSync(srcPage)) fs.copyFileSync(srcPage, resolve(frontendRoot, 'dist', page));
        }
      }
    }
  ]
  };
});
