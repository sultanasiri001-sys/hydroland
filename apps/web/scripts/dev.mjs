import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8' };
createServer(async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const candidate = path.resolve(root, requestPath === '/' ? 'index.html' : `.${requestPath}`);
  if (!candidate.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    if (!(await stat(candidate)).isFile()) throw new Error();
    response.writeHead(200, { 'content-type': types[path.extname(candidate)] ?? 'application/octet-stream' });
    response.end(await readFile(candidate));
  } catch { response.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT ?? 4173), () => console.log('HYDROLAND UI: http://localhost:4173'));
