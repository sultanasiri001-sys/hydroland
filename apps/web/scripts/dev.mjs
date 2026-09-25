import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(appRoot, 'src');
const require = createRequire(import.meta.url);
const maplibreEntry = require.resolve('maplibre-gl');
const maplibreDist = path.dirname(maplibreEntry);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8' };
createServer(async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let candidate;
  if(requestPath==='/vendor/maplibre-gl.js')candidate=maplibreEntry;
  else if(requestPath==='/vendor/maplibre-gl.css')candidate=path.join(maplibreDist,'maplibre-gl.css');
  else candidate = path.resolve(root, requestPath === '/' ? 'index.html' : `.${requestPath}`);
  const allowed=candidate.startsWith(root)||candidate.startsWith(maplibreDist);
  if (!allowed) { response.writeHead(403).end(); return; }
  try {
    if (!(await stat(candidate)).isFile()) throw new Error();
    response.writeHead(200, { 'content-type': types[path.extname(candidate)] ?? 'application/octet-stream' });
    response.end(await readFile(candidate));
  } catch { response.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT ?? 4173), () => console.log('HYDROLAND UI: http://localhost:4173'));
