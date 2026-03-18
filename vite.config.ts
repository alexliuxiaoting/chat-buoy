import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin that copies static extension files to dist
function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const iconsDir = resolve(distDir, 'icons');

      // Ensure icons directory exists
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }

      // Copy manifest
      copyFileSync(
        resolve(__dirname, 'src', 'manifest.json'),
        resolve(distDir, 'manifest.json')
      );

      // Copy icons
      for (const size of ['16', '48', '128']) {
        const src = resolve(__dirname, 'assets', 'icons', `icon${size}.png`);
        const dest = resolve(iconsDir, `icon${size}.png`);
        if (existsSync(src)) {
          copyFileSync(src, dest);
        }
      }

      console.log('✓ Copied manifest.json and icons to dist/');
    },
  };
}

export default defineConfig({
  root: 'src',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [copyExtensionFiles()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
