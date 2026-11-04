const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const proxyToLaravel = require('../api/_proxy');
const DIST_DIR = path.resolve(__dirname, 'dist');
const APP_ROUTES = new Map([
  ['/', 'index.html'],
  ['/dashboard', 'dashboard.html'],
  ['/new-shift', 'new_shift.html'],
  ['/splash', 'splash.html'],
  ['/owner-setup', 'owner-setup.html'],
]);

const MIME_TYPES = {
  '.avif': 'image/avif', '.bmp': 'image/bmp', '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wasm': 'application/wasm',
};

function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(message);
}

function resolveStaticFile(pathname) {
  const routeFile = APP_ROUTES.get(pathname);
  const requestedPath = routeFile || pathname.replace(/^\/+/, '');
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestedPath);
  } catch (_) {
    return null;
  }
  if (!decodedPath || decodedPath.includes('\0')) return null;

  const filePath = path.resolve(DIST_DIR, decodedPath);
  const relativePath = path.relative(DIST_DIR, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return filePath;
}

function serveStatic(req, res, pathname) {
  const filePath = resolveStaticFile(pathname);
  if (!filePath) return sendError(res, 404, 'Not found');

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) return sendError(res, 404, 'Not found');
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.end();

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) sendError(res, 500, 'Internal server error');
      else res.destroy();
    });
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  let requestUrl;
  try {
    requestUrl = new URL(req.url || '/', 'http://frontend.invalid');
  } catch (_) {
    return sendError(res, 400, 'Bad request');
  }
  const pathname = requestUrl.pathname;

  if (pathname === '/healthz') {
    if (!['GET', 'HEAD'].includes(method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return sendError(res, 405, 'Method not allowed');
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(method === 'HEAD' ? undefined : 'ok');
  }
  if (pathname === '/api' || pathname.startsWith('/api/')) return proxyToLaravel(req, res);
  if (!['GET', 'HEAD'].includes(method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'Method not allowed');
  }
  return serveStatic(req, res, pathname);
});

server.listen(process.env.PORT || 10000, '0.0.0.0');
