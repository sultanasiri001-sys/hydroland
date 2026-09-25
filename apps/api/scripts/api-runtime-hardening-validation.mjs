import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const source=await readFile(resolve('src/main.ts'),'utf8');
for(const marker of [
  "const required = ['DATABASE_URL', 'JWT_SECRET']",
  "JWT_SECRET must be at least 32 characters.",
  "WEB_ORIGIN is required in production.",
  "X-Content-Type-Options', 'nosniff'",
  "X-Frame-Options', 'DENY'",
  "Strict-Transport-Security",
  "X-Request-Id",
  "http_request",
  "split('?')[0]",
  "app.useBodyParser('json', { limit: '15mb' })",
  "methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']",
  "'Idempotency-Key'",
  "'X-Webhook-Signature'",
  "credentials: false",
  "maxAge: 600"
])if(!source.includes(marker))throw new Error(`Missing API runtime hardening marker: ${marker}`);
if(!source.includes("/^[A-Za-z0-9._:-]{1,128}$/"))throw new Error('X-Request-Id validation pattern is missing.');
console.log('API runtime hardening validation passed: environment, security headers, CORS, request IDs, logging, and 15mb JSON limit are explicit.');
