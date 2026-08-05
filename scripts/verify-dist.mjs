import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
const required = [
  'index.html',
  'game.css',
  'manifest.webmanifest',
  'sw.js',
  'icons/app-icon.svg',
  'src/main.js',
  'src/config.js',
  'src/storage.js',
  'src/game.js',
  'src/game-data.js',
  'src/arena.js',
  'src/audio.js',
  'src/input.js',
  'src/render.js',
  'src/ui.js',
];

for (const file of required) await access(resolve(output, file));
const html = await readFile(resolve(output, 'index.html'), 'utf8');
for (const reference of ['./game.css', './manifest.webmanifest', './src/main.js']) {
  if (!html.includes(reference)) throw new Error(`Built index is missing ${reference}`);
}
const worker = await readFile(resolve(output, 'sw.js'), 'utf8');
if (worker.includes("cached || caches.match('./index.html')")) {
  throw new Error('Service worker must not return HTML for missing static assets.');
}
console.log(`Verified ${required.length} deployment files.`);
