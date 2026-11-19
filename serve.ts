// Neon Bay Cover Studio — a tiny static file server for local development only.
//
// Serves the app/ directory on http://localhost:8080 so the cover maker can be
// tried in a desktop browser with no build step. Node 22, standard library only.
// Usage: `node serve.ts` (or `node serve.ts --port 8123`).
// It refuses every path that escapes app/ and sends the MIME types the app needs.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const args = process.argv.slice(2);
const flagAt = args.indexOf('--port');
const wanted = flagAt === -1 ? 8080 : Number(args[flagAt + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

function sendStatus(response, code, text) {
  response.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(text);
}

createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    sendStatus(response, 400, 'bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = resolve(join(appRoot, normalize(pathname)));
  if (filePath !== appRoot && !filePath.startsWith(appRoot + sep)) {
    sendStatus(response, 403, 'forbidden');
    return;
  }

  let size;
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    sendStatus(response, 404, 'not found');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Neon Bay Cover Studio is on http://localhost:${port}`);
});
