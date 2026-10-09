import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forgeRoot = path.join(repoRoot, 'node_modules', 'node-forge');
const packagePath = path.join(forgeRoot, 'package.json');
const rsaPath = path.join(forgeRoot, 'lib', 'rsa.js');

if (!fs.existsSync(packagePath) || !fs.existsSync(rsaPath)) {
  throw new Error('node-forge 1.4.0 is missing from the root install; security backport was not applied.');
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.version !== '1.4.0') {
  throw new Error(`Expected official node-forge 1.4.0, found ${pkg.version}; review the backport before upgrading.`);
}

const source = fs.readFileSync(rsaPath, 'utf8');
if (source.includes('obj.value[0].value.length !==')) {
  console.log('node-forge CVE-2026-85393 backport already present');
} else {
  const before = `          // validate DigestInfo structure and element count
          var capture = {};
          var errors = [];
          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||
            obj.value.length !== 2) {`;
  const after = `          // validate DigestInfo structure and nested element counts
          var capture = {};
          var errors = [];
          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||
            obj.value.length !== 2 ||
            obj.value[0].value.length !==
              (('parameters' in capture) ? 2 : 1)) {`;
  if (source.split(before).length !== 2) {
    throw new Error('Could not identify exactly one node-forge 1.4.0 DigestInfo check; backport was not applied.');
  }
  fs.writeFileSync(rsaPath, source.replace(before, after));
  console.log('Applied repository backport for node-forge CVE-2026-85393');
}
