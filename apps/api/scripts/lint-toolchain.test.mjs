import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ESLint } from 'eslint';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd });
const filePath = `${cwd}/src/lint-toolchain-fixture.ts`;

// Each enabled rule must reject a known defect. These are lintText inputs, not
// files written into src, so checks cannot modify or pollute the application.
const defects = {
  'array-callback-return': '[1].map(value => { value + 1; });',
  'for-direction': 'for (let i = 0; i < 10; i--) { consume(i); }',
  'no-async-promise-executor': 'new Promise(async resolve => { resolve(1); });',
  'no-compare-neg-zero': 'const result = value === -0;',
  'no-cond-assign': 'if (value = other) { consume(value); }',
  'no-constant-binary-expression': 'const result = [] || fallback;',
  'no-constant-condition': 'if (true) { consume(value); }',
  'no-debugger': 'debugger;',
  'no-dupe-else-if': 'if (value) { first(); } else if (value) { second(); }',
  'no-duplicate-case': 'switch (value) { case 1: break; case 1: break; }',
  'no-empty-character-class': 'const pattern = /[]/;',
  'no-empty-pattern': 'const {} = value;',
  'no-ex-assign': 'try { run(); } catch (error) { error = replacement; }',
  'no-fallthrough': 'switch (value) { case 1: first();\ncase 2: second(); break; }',
  'no-invalid-regexp': "new RegExp('[');",
  'no-loss-of-precision': 'const value = 9007199254740993;',
  'no-misleading-character-class': 'const pattern = /[á]/;',
  'no-prototype-builtins': "value.hasOwnProperty('key');",
  'no-self-assign': 'value = value;',
  'no-sparse-arrays': 'const values = [1, , 2];',
  'no-unexpected-multiline': 'const value = fn\n[1, 2].forEach(consume);',
  'no-unreachable': 'function run() { return 1; consume(); }',
  'no-unsafe-finally': 'function run() { try { return 1; } finally { return 2; } }',
  'no-unsafe-negation': 'const result = !value in source;',
  'no-unsafe-optional-chaining': '(value?.method)();',
  'no-unused-labels': 'unused: { consume(); }',
  'no-useless-backreference': 'const pattern = /(a)\\1|b\\1/;',
  'use-isnan': 'const result = value === NaN;',
  'valid-typeof': "const result = typeof value === 'strnig';",
};

test('the discovered API config enables exactly the covered correctness rules', async () => {
  const config = await eslint.calculateConfigForFile(filePath);
  assert.ok(config, 'src TypeScript must not be ignored');
  assert.deepEqual(Object.keys(config.rules).sort(), Object.keys(defects).sort());
  for (const [rule, [severity]] of Object.entries(config.rules)) {
    assert.equal(severity, 2, `${rule} must be an error, not disabled or a warning`);
  }
  assert.equal(config.linterOptions.reportUnusedDisableDirectives, 2);
});

test('TypeScript types, Nest-style decorators, and valid runtime code pass', async () => {
  const [result] = await eslint.lintText(`
    import { Injectable } from '@nestjs/common';
    type Entry = { value: number; label?: string };
    @Injectable()
    export class ExampleService {
      values(entries: Entry[]): number[] {
        return entries.map(entry => entry.value);
      }
      async read(load: () => Promise<Entry | undefined>): Promise<string> {
        const entry = await load();
        return entry?.label ?? 'missing';
      }
    }
  `, { filePath });
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
  assert.equal(result.warningCount, 0, JSON.stringify(result.messages));
});

for (const [rule, source] of Object.entries(defects)) {
  test(`detects ${rule}`, async () => {
    const [result] = await eslint.lintText(source, { filePath });
    assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
    assert.ok(result.messages.some(message => message.ruleId === rule && message.severity === 2),
      `Expected ${rule}: ${JSON.stringify(result.messages)}`);
  });
}

test('unused suppression directives fail rather than silently weakening the gate', async () => {
  const [result] = await eslint.lintText('// eslint-disable-next-line no-debugger\nconst value = 1;', { filePath });
  assert.equal(result.errorCount, 1);
  assert.match(result.messages[0].message, /Unused eslint-disable directive/);
});

test('the installed CLI passes valid TypeScript and exits nonzero on a defect', () => {
  const require = createRequire(import.meta.url);
  const cli = path.join(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js');
  const run = input => spawnSync(process.execPath,
    [cli, '--stdin', '--stdin-filename', filePath, '--max-warnings=0'],
    { cwd, input, encoding: 'utf8' });
  const valid = run('const value: number = 1;');
  assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
  const invalid = run('new Promise(async resolve => { resolve(1); });');
  assert.equal(invalid.status, 1, `${invalid.stdout}\n${invalid.stderr}`);
  assert.match(invalid.stdout, /no-async-promise-executor/);
});

test('the TypeScript config does not claim coverage of build output or scripts', async () => {
  assert.equal(await eslint.isPathIgnored(`${cwd}/dist/main.ts`), true);
  assert.equal(await eslint.isPathIgnored(`${cwd}/scripts/example.ts`), true);
});
