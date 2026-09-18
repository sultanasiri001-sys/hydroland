const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const email = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.E2E_ADMIN_PASSWORD;

if (!baseUrl?.startsWith('https://')) throw new Error('E2E_BASE_URL must use https.');
if (!email?.endsWith('@hydroland.test')) throw new Error('E2E_ADMIN_EMAIL must use @hydroland.test.');
if (!password || password.length < 12) throw new Error('E2E_ADMIN_PASSWORD must be at least 12 characters.');

const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

if (response.ok) {
  console.log(`E2E account registered for ${email}.`);
  process.exit(0);
}

if (response.status === 409) {
  console.log(`E2E account already exists for ${email}; continuing.`);
  process.exit(0);
}

const body = await response.text();
throw new Error(`E2E account preparation failed with HTTP ${response.status}: ${body.slice(0, 500)}`);
