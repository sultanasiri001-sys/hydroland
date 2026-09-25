import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(root, '..', '..');
const dist = path.join(root, 'dist');
const vendor = path.join(dist, 'vendor');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'src'), dist, { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
await mkdir(vendor, { recursive: true });
const maplibreDist = path.join(workspaceRoot, 'node_modules', 'maplibre-gl', 'dist');
await cp(path.join(maplibreDist, 'maplibre-gl.js'), path.join(vendor, 'maplibre-gl.js'));
await cp(path.join(maplibreDist, 'maplibre-gl.css'), path.join(vendor, 'maplibre-gl.css'));
console.log('HYDROLAND web built in apps/web/dist with vendored MapLibre runtime');
