import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const provider = read('src/translation/google-cloud-translation.provider.ts');
const router = read('src/translation/translation-router.service.ts');
const moduleFile = read('src/translation/translation.module.ts');
const render = read('../../render.yaml');

for (const marker of [
  "readonly id = 'GOOGLE_CLOUD_TRANSLATION'",
  "readonly mode = 'ONLINE'",
  "HYDROLAND_TRANSLATION_PROVIDER",
  "GOOGLE_CLOUD_TRANSLATION_API_KEY",
  "https://translation.googleapis.com/language/translate/v2",
  "'X-Goog-Api-Key': apiKey",
  "format: 'text'",
  "AbortSignal.timeout(8_000)",
  "Translation provider rejected the request",
]) {
  if (!provider.includes(marker)) throw new Error(`Google translation invariant missing: ${marker}`);
}

if (provider.includes('?key=') || provider.includes('console.log') || provider.includes('console.error')) {
  throw new Error('Google translation adapter must not place credentials in URLs or logs.');
}

for (const marker of [
  "GoogleCloudTranslationProvider",
  "this.providers=[googleCloud]",
  "requireOperational('TRANSLATION_ENGINE')",
  "contentClass==='CONTROLLED_SAFETY_CONTENT'",
]) {
  if (!router.includes(marker)) throw new Error(`Translation router invariant missing: ${marker}`);
}

if (!moduleFile.includes('GoogleCloudTranslationProvider') || !moduleFile.includes('providers: [TranslationService, GoogleCloudTranslationProvider, TranslationRouterService]')) {
  throw new Error('Google translation provider is not registered in TranslationModule.');
}

for (const key of [
  'HYDROLAND_INTEGRATION_TRANSLATION_ENGINE_STATUS',
  'HYDROLAND_TRANSLATION_PROVIDER',
  'GOOGLE_CLOUD_TRANSLATION_API_KEY',
]) {
  if (!render.includes(`key: ${key}`)) throw new Error(`Render blueprint missing translation activation input: ${key}`);
}

console.log('Google translation Stage 3 validation passed.');
