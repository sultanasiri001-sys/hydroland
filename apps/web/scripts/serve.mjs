import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

const isWithin = (directory, candidate) => {
  const relative = path.relative(directory, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

export function createStaticServer(directory = root) {
  const publicRoot = path.resolve(directory);
  return createServer(async (request, response) => {
    let requestPath;
    try {
      requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (requestPath.includes('\0')) throw new URIError('Invalid path');
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    let candidate = path.resolve(publicRoot, requestPath === '/' ? 'index.html' : `.${requestPath}`);
    if (!isWithin(publicRoot, candidate)) { response.writeHead(403).end(); return; }
    try {
      if (!(await stat(candidate)).isFile()) throw new Error();
    } catch {
      candidate = path.join(publicRoot, 'index.html');
    }
    try {
      // Resolve links too: a public asset must not expose a file outside dist.
      const [resolvedRoot, resolvedFile] = await Promise.all([realpath(publicRoot), realpath(candidate)]);
      if (!isWithin(resolvedRoot, resolvedFile)) { response.writeHead(403).end(); return; }
      const content = await readFile(resolvedFile);
      response.writeHead(200, { 'content-type': types[path.extname(candidate)] ?? 'application/octet-stream' });
      response.end(content);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  createStaticServer().listen(Number(process.env.PORT ?? 4173), '0.0.0.0', () => console.log('HYDROLAND production web server ready'));
}
