import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliPackage = expoRequire.resolve('@expo/cli/package.json');
const cliRequire = createRequire(cliPackage);
const { z } = cliRequire('zod');

// Exercise the actual dependency resolved by Expo, not a second test-only copy.
// Oversized collections must fail before walking their otherwise valid members.
for (const asyncMode of [false, true]) {
  for (const kind of ['array', 'set', 'map']) {
    let visited = 0;
    const member = z.string().refine(() => { visited += 1; return true; });
    const input = kind === 'array' ? ['a', 'b', 'c']
      : kind === 'set' ? new Set(['a', 'b', 'c'])
        : new Map([['a', 'a'], ['b', 'b'], ['c', 'c']]);
    const schema = kind === 'array' ? z.array(member).max(2)
      : kind === 'set' ? z.set(member).max(2) : z.map(member, member).max(2);
    const result = asyncMode ? await schema.safeParseAsync(input) : schema.safeParse(input);
    assert.equal(result.success, false);
    assert.equal(result.error.issues.length, 1);
    assert.equal(result.error.issues[0].code, 'too_big');
    assert.equal(visited, 0, `${kind} size limit must run before element parsing`);
  }
}

assert.deepEqual(z.array(z.string()).max(2).parse(['a', 'b']), ['a', 'b']);
assert.equal(cliRequire('zod/package.json').version, '4.6.6');

// The installed Expo CLI declares Zod 3. Test its real consumers before using
// the scoped Zod 4 override; these are the CLI's plugin and MCP input schemas.
const serverDir = path.join(path.dirname(cliPackage), 'build/src/start/server');
const { PluginSchema, DevToolsPluginOutputSchema } = cliRequire(path.join(serverDir, 'DevToolsPlugin.schema.js'));
const { createMCPDevToolsExtensionSchema } = cliRequire(path.join(serverDir, 'createMCPDevToolsExtensionSchema.js'));
const plugin = {
  packageName: 'hydroland-test-plugin', packageRoot: '/synthetic/hydroland',
  cliExtensions: {
    description: 'Synthetic compatibility check', entryPoint: './never-executed.cjs',
    commands: [{
      name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'],
      parameters: [
        { name: 'label', type: 'text' }, { name: 'limit', type: 'number' },
        { name: 'confirmed', type: 'confirm' },
      ],
    }],
  },
};
assert.equal(PluginSchema.safeParse(plugin).success, true);
assert.equal(PluginSchema.safeParse({ ...plugin, packageName: '' }).success, false);
assert.equal(PluginSchema.safeParse({ ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [] } }).success, false);
const command = createMCPDevToolsExtensionSchema(plugin);
assert.deepEqual(command.parse({ command: 'inspect', label: 'check', limit: 2, confirmed: false }),
  { command: 'inspect', label: 'check', limit: 2, confirmed: false });
for (const input of [
  { command: 'other' }, { command: 'inspect', extra: true },
  { command: 'inspect', limit: '2' }, { command: 'inspect', confirmed: 'false' },
]) assert.equal(command.safeParse(input).success, false);
const output = [
  { type: 'text', text: 'ok', level: 'info' },
  { type: 'image', url: 'https://example.invalid/image.png' },
  { type: 'audio', url: 'https://example.invalid/audio.wav' },
];
assert.deepEqual(DevToolsPluginOutputSchema.parse(output), output);
assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'audio', url: 'invalid' }]).success, false);
assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 2 }]).success, false);
console.log('PASS Zod collection bounds and installed Expo CLI schema compatibility');
