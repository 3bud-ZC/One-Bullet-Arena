import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number.parseInt(process.argv[2] || process.env.PORT || '4173', 10);
const host = process.env.HOST || '127.0.0.1';

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const normalized = normalize(pathname).replace(/^([/\\])+/, '');
  const candidate = resolve(join(root, normalized || 'index.html'));
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  return candidate;
}

function send(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
  });
  response.end(body);
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || '/');
  if (!filePath) {
    send(response, 403, 'Forbidden');
    return;
  }

  let target = filePath;
  try {
    const fileStat = statSync(target);
    if (fileStat.isDirectory()) target = join(target, 'index.html');
  } catch {
    send(response, 404, 'Not found');
    return;
  }

  try {
    const fileStat = statSync(target);
    if (!fileStat.isFile()) {
      send(response, 404, 'Not found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': fileStat.size,
      'Content-Type': mimeTypes.get(extname(target)) || 'application/octet-stream',
    });
    createReadStream(target).pipe(response);
  } catch {
    send(response, 500, 'Server error');
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});
