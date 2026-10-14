import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.mjs':'text/javascript; charset=utf-8', '.wasm':'application/wasm', '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

const isWithin = (directory, candidate) => {
  const relative = path.relative(directory, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

export function createStaticServer(directory = root, { onReject = event => console.warn(JSON.stringify(event)) } = {}) {
  const publicRoot = path.resolve(directory);
  return createServer(async (request, response) => {
    const reject = (status, reason, message) => {
      const requestId = randomUUID();
      // Never log request URLs, headers, cookies, credentials or client addresses.
      onReject({ event: 'web_request_rejected', requestId, status, reason });
      response.writeHead(status, {
        'content-type': 'text/plain; charset=utf-8',
        'content-length': Buffer.byteLength(message),
        'cache-control': 'no-store',
        'x-hydroland-request-id': requestId,
      }).end(message);
    };
    let requestPath;
    try {
      requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (requestPath.includes('\0')) throw new URIError('Invalid path');
    } catch {
      reject(400, 'invalid_path', 'Bad request');
      return;
    }
    let candidate = path.resolve(publicRoot, requestPath === '/' ? 'index.html' : `.${requestPath}`);
    if (!isWithin(publicRoot, candidate)) { reject(403, 'outside_public_root', 'Forbidden'); return; }
    try {
      if (!(await stat(candidate)).isFile()) throw new Error();
    } catch {
      candidate = path.join(publicRoot, 'index.html');
    }
    try {
      // Resolve links too: a public asset must not expose a file outside dist.
      const [resolvedRoot, resolvedFile] = await Promise.all([realpath(publicRoot), realpath(candidate)]);
      if (!isWithin(resolvedRoot, resolvedFile)) { reject(403, 'outside_public_root', 'Forbidden'); return; }
      const content = await readFile(resolvedFile);
      response.writeHead(200, { 'content-type': types[path.extname(candidate)] ?? 'application/octet-stream' });
      response.end(content);
    } catch {
      reject(404, 'file_unavailable', 'Not found');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  createStaticServer().listen(Number(process.env.PORT ?? 4173), '0.0.0.0', () => console.log('HYDROLAND production web server ready'));
}
