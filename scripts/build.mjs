import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
const files = ['index.html', 'game.css', 'manifest.webmanifest', 'sw.js'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) await cp(resolve(root, file), resolve(output, file));
await cp(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });
await cp(resolve(root, 'icons'), resolve(output, 'icons'), { recursive: true });
await cp(resolve(root, '.nojekyll'), resolve(output, '.nojekyll')).catch(async () => {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(resolve(output, '.nojekyll'), '');
});
console.log(`Built ${output}`);
