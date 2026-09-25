const base=process.env.API_HARDENING_E2E_BASE_URL||process.env.RBAC_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const allowedOrigin=process.env.WEB_ORIGIN?.split(',').map(value=>value.trim()).filter(Boolean)[0]||'http://localhost:3000';

const assert=(condition,message)=>{if(!condition)throw new Error(message)};

let response=await fetch(base+'/health',{headers:{'X-Request-Id':'hydroland-e2e-request-123'}});
assert(response.ok,`Health request failed: ${response.status}`);
assert(response.headers.get('x-content-type-options')==='nosniff','Missing X-Content-Type-Options: nosniff');
assert(response.headers.get('x-frame-options')==='DENY','Missing X-Frame-Options: DENY');
assert(response.headers.get('referrer-policy')==='no-referrer','Missing Referrer-Policy: no-referrer');
assert(response.headers.get('permissions-policy')==='camera=(), microphone=(), geolocation=()','Unexpected Permissions-Policy');
assert(response.headers.get('content-security-policy')==="default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",'Unexpected API Content-Security-Policy');
assert(response.headers.get('x-request-id')==='hydroland-e2e-request-123','Valid X-Request-Id was not echoed');

response=await fetch(base+'/health',{headers:{'X-Request-Id':'x'.repeat(129)}});
assert(response.ok,`Health request with oversized request id failed: ${response.status}`);
const generatedId=response.headers.get('x-request-id')||'';
assert(generatedId.length>0&&generatedId!=='x'.repeat(129),'Oversized X-Request-Id was not replaced');

response=await fetch(base+'/health',{
  method:'OPTIONS',
  headers:{
    Origin:allowedOrigin,
    'Access-Control-Request-Method':'GET',
    'Access-Control-Request-Headers':'authorization,x-request-id'
  }
});
assert(response.status===200||response.status===204,`Allowed CORS preflight failed: ${response.status}`);
assert(response.headers.get('access-control-allow-origin')===allowedOrigin,'Allowed origin was not returned by CORS');
const methods=(response.headers.get('access-control-allow-methods')||'').toUpperCase();
assert(methods.includes('GET')&&methods.includes('POST')&&methods.includes('PATCH')&&methods.includes('DELETE'),'CORS methods are incomplete');
const headers=(response.headers.get('access-control-allow-headers')||'').toLowerCase();
assert(headers.includes('authorization')&&headers.includes('x-request-id')&&headers.includes('idempotency-key'),'CORS allowed headers are incomplete');

response=await fetch(base+'/health',{headers:{Origin:'https://untrusted.example.invalid'}});
assert(response.ok,`Disallowed-origin health request failed unexpectedly: ${response.status}`);
assert(!response.headers.get('access-control-allow-origin'),'Untrusted origin received Access-Control-Allow-Origin');

console.log('API runtime hardening HTTP E2E passed: security headers, request IDs, restricted CORS, and origin denial are active.');
