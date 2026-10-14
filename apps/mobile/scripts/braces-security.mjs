import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const braces = require('braces');
const nested = depth => '{'.repeat(depth) + 'a,b' + '}'.repeat(depth);

assert.equal(require('braces/package.json').version, '3.0.4');
assert.deepEqual(braces.expand('{a,{b,c}}'), ['a', 'b', 'c']);
assert.equal(braces.stringify('{a,{b}}', { escapeInvalid: true }), '{a,{b}}');
for (const operation of [braces.parse, braces.compile, braces.expand, braces.stringify]) {
  assert.doesNotThrow(() => operation(nested(100)));
  assert.throws(() => operation(nested(101)), /exceeds max depth/);
}
assert.throws(() => braces.compile('{{a,b},c}', { maxDepth: 1 }), /exceeds max depth/);
assert.doesNotThrow(() => braces.compile('{{a,b},c}', { maxDepth: 2 }));

const makeAst = depth => {
  const root = { type: 'root', nodes: [], queue: [] };
  let parent = root;
  for (let i = 0; i < depth; i++) {
    const child = { type: 'brace', nodes: [], queue: [], parent };
    parent.nodes.push(child);
    parent = child;
  }
  parent.nodes.push({ type: 'text', value: 'a', parent });
  return root;
};
const deepAst = makeAst(101);
for (const operation of [braces.compile, braces.expand, braces.stringify]) {
  assert.throws(() => operation(deepAst), /exceeds max depth/);
}
const cyclicAst = { type: 'paren', nodes: [{ type: 'text', value: 'a' }] };
cyclicAst.parent = cyclicAst;
assert.throws(() => braces.expand(cyclicAst), /parent chain contains a cycle/);
console.log('PASS braces depth-limit and compatibility regressions');
