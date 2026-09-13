import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  plugins: [
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
