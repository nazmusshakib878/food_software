import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function apiServerPlugin() {
  const loginHandler = require('./api/auth/login.js');
  const sessionHandler = require('./api/auth/session.js');
  const logoutHandler = require('./api/auth/logout.js');
  const reportsHandler = require('./api/reports.js');

  function setupMiddleware(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';
      if (url.startsWith('/api/')) {
        res.status = function(code) {
          res.statusCode = code;
          return res;
        };
        res.json = function(data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };

        if (req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          await new Promise(r => req.on('end', r));
          try {
            req.body = bodyStr ? JSON.parse(bodyStr) : {};
          } catch (e) {
            req.body = bodyStr;
          }
        }

        if (url === '/api/auth/login' || url === '/api/auth/pin') {
          return loginHandler(req, res);
        } else if (url === '/api/auth/session') {
          return sessionHandler(req, res);
        } else if (url === '/api/auth/logout') {
          return logoutHandler(req, res);
        } else if (url === '/api/reports') {
          return reportsHandler(req, res);
        } else {
          return res.status(404).json({ error: 'Endpoint not found' });
        }
      }
      next();
    });
  }

  return {
    name: 'api-server-middleware',
    configureServer(server) {
      setupMiddleware(server);
    },
    configurePreviewServer(server) {
      setupMiddleware(server);
    }
  };
}

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    apiServerPlugin(),
    {
      name: 'copy-pos-assets',
      closeBundle() {
        // Ensure js/ directory is copied into dist/js
        const srcJsDir = resolve(__dirname, 'js');
        const destJsDir = resolve(__dirname, 'dist', 'js');
        if (fs.existsSync(srcJsDir)) {
          if (!fs.existsSync(destJsDir)) {
            fs.mkdirSync(destJsDir, { recursive: true });
          }
          const jsFiles = fs.readdirSync(srcJsDir);
          for (const f of jsFiles) {
            fs.copyFileSync(resolve(srcJsDir, f), resolve(destJsDir, f));
          }
        }

        // Ensure api/ directory is copied into dist/api
        const srcApiDir = resolve(__dirname, 'api');
        const destApiDir = resolve(__dirname, 'dist', 'api');
        if (fs.existsSync(srcApiDir)) {
          if (!fs.existsSync(destApiDir)) {
            fs.mkdirSync(destApiDir, { recursive: true });
          }
          const copyRecursive = (src, dest) => {
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
              const srcPath = resolve(src, entry.name);
              const destPath = resolve(dest, entry.name);
              if (entry.isDirectory()) {
                if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
                copyRecursive(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          };
          copyRecursive(srcApiDir, destApiDir);
        }

        // Ensure manifest.json is present in dist
        const srcManifest = resolve(__dirname, 'manifest.json');
        const destManifest = resolve(__dirname, 'dist', 'manifest.json');
        if (fs.existsSync(srcManifest)) {
          fs.copyFileSync(srcManifest, destManifest);
        }

        // Copy standalone entry pages used by the cashier flow.
        const pages = ['dashboard.html', 'new_shift.html', 'splash.html'];
        for (const page of pages) {
          const srcPage = resolve(__dirname, page);
          const destPage = resolve(__dirname, 'dist', page);
          if (fs.existsSync(srcPage)) {
            fs.copyFileSync(srcPage, destPage);
          }
        }
      }
    }
  ]
});
