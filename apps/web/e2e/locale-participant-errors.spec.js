import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { participantErrorLocaleScenarios } from './fixtures/participant-error-locale-scenarios.mjs';
const names = ['i18n', 'booking-participants', 'center-safety', 'training-certificate-admin'];
const modules = Object.fromEntries(names.map(name => ['hydroland-' + name + '.js', readFileSync(resolve(__dirname, '../src/hydroland-' + name + '.js'), 'utf8')]));
for (const [index, scenario] of participantErrorLocaleScenarios(null, {}, null).entries()) test(scenario.name, async ({ page }) => {
  await page.route('**/locale-error-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto('/locale-error-fixture');
  await page.evaluate(async ({ creatorSource, modules, index }) => {
    const assert = { equal(actual, expected) { if (actual !== expected) throw new Error('Expected ' + JSON.stringify(expected) + '; received ' + JSON.stringify(actual)); }, ok(value) { if (!value) throw new Error('Expected a truthy condition'); } };
    const createWindow = markup => { document.open(); document.write(markup); document.close(); return { window, close() {} }; };
    const creator = (0, eval)('(' + creatorSource + ')');
    await creator(createWindow, modules, assert)[index].run();
  }, { creatorSource: participantErrorLocaleScenarios.toString(), modules, index });
});
