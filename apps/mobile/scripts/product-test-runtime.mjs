import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {randomUUID, createHash} from 'node:crypto';
import ts from 'typescript';
import {createNativeProductFixture, NATIVE_FIXTURE_EMAIL, NATIVE_FIXTURE_PASSWORD} from './product-native-fixture.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const mobileRequire = createRequire(path.join(root, 'package.json'));
export const React = mobileRequire('react');
assert.equal(React.version, '19.2.3', 'Use the actual mobile React version, not the monorepo root version.');
// The existing lock has a different root React. Match Metro's mobile resolution
// for the real renderer rather than replacing React or implementing fake hooks.
const rendererPath = mobileRequire.resolve('react-test-renderer');
const rendererRequire = createRequire(rendererPath);
const rendererReact = rendererRequire.resolve('react');
const mobileReact = mobileRequire.resolve('react');
if (rendererReact !== mobileReact) mobileRequire.cache[rendererReact] = mobileRequire.cache[mobileReact];
export const Renderer = mobileRequire('react-test-renderer');
export const act = Renderer.act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
export const deferred = () => {let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};};
export const response = (data, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), {status, headers: {'Content-Type': 'application/json'}});
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function productWorld() {
  const fixture = createNativeProductFixture();
  const server = http.createServer((req, res) => {void fixture.handler(req, res).catch(error => {res.writeHead(500); res.end(String(error));});});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const modules = new Map(), secure = new Map(), files = new Map(), directories = new Set(), calls = [], navigations = [], opened = [], shared = [], appListeners = new Set();
  let handler = null, writeHook = null, picker = null, shareHook = null, renderer = null, params = {}, context, focus = true;
  const uri = values => values.map(value => value?.uri ?? value).join('/');
  class Directory {
    constructor(...values) {this.uri = uri(values);}
    get exists() {return directories.has(this.uri);}
    create() {directories.add(this.uri);}
    delete() {for (const key of files.keys()) if (key.startsWith(this.uri + '/')) files.delete(key); for (const key of directories) if (key === this.uri || key.startsWith(this.uri + '/')) directories.delete(key);}
  }
  class File {
    constructor(...values) {this.uri = uri(values);}
    get exists() {return files.has(this.uri);}
    get size() {return files.get(this.uri)?.byteLength ?? 0;}
    write(value) {files.set(this.uri, typeof value === 'string' ? new TextEncoder().encode(value) : Uint8Array.from(value));}
    delete() {files.delete(this.uri);}
    async base64() {return Buffer.from(files.get(this.uri)).toString('base64');}
    bytesSync() {return Uint8Array.from(files.get(this.uri));}
    async bytes() {return this.bytesSync();}
    textSync() {return new TextDecoder().decode(files.get(this.uri));}
  }
  const Paths = {cache: new Directory('file:///private-cache'), document: new Directory('file:///private-documents')};
  const native = {
    react: React, 'react/jsx-runtime': mobileRequire('react/jsx-runtime'),
    'expo-secure-store': {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only', isAvailableAsync: async () => true, getItemAsync: async key => secure.get(key) ?? null, setItemAsync: async (key, value) => {if (writeHook) await writeHook(key, value); secure.set(key, value);}, deleteItemAsync: async key => {secure.delete(key);}},
    'expo-crypto': {randomUUID, CryptoDigestAlgorithm: {SHA256: 'SHA-256'}, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex')},
    'expo-file-system': {Directory, File, Paths},
    'expo-document-picker': {getDocumentAsync: async options => picker ? picker(options) : {canceled: true, assets: null}},
    'expo-sharing': {isAvailableAsync: async () => true, shareAsync: async (file, options) => {shared.push({file, options, bytes: files.get(file)}); if (shareHook) await shareHook(file, options);}},
    'expo-constants': {__esModule: true, default: {expoConfig: {extra: {}}}},
    'expo-notifications': {},
    'expo-router': {useLocalSearchParams: () => params, useFocusEffect: callback => React.useEffect(() => focus ? callback() : undefined, [callback]), router: {push: target => navigations.push({method: 'push', target}), replace: target => navigations.push({method: 'replace', target})}, Stack: 'Stack'},
    'react-native': {Platform: {OS: 'android'}, StyleSheet: {create: styles => styles}, AppState: {currentState: 'active', addEventListener: (_, listener) => {appListeners.add(listener); return {remove: () => appListeners.delete(listener)};}}, Linking: {openURL: async url => {opened.push(url);}}, ...Object.fromEntries(['View', 'Text', 'TextInput', 'Pressable', 'ScrollView', 'SafeAreaView', 'KeyboardAvoidingView', 'ActivityIndicator', 'Switch'].map(name => [name, name]))},
  };
  function load(relative) {
    let file = path.isAbsolute(relative) ? relative : path.resolve(root, relative);
    const securityRoot = process.env.D05_SECURITY_ROOT;
    if (securityRoot && file.startsWith(path.join(root, 'src') + path.sep) && /^(?:session|api|bootstrap|trip-intelligence|offline[^/]*)\.tsx?$/.test(path.basename(file))) {
      const candidate = path.join(securityRoot, 'apps/mobile/src', path.basename(file)); if (fs.existsSync(candidate)) file = candidate;
    }
    if (modules.has(file)) return modules.get(file).exports;
    const module = {exports: {}}; modules.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}}).outputText;
    const require = name => {
      if (Object.hasOwn(native, name)) return native[name];
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(file), name);
        for (const ext of ['.ts', '.tsx', '.js']) {
          if (fs.existsSync(base + ext)) return load(base + ext);
          if (securityRoot && /^(?:session|api|bootstrap|trip-intelligence|offline[^/]*)$/.test(path.basename(base))) {
            const shared = path.join(securityRoot, 'apps/mobile/src', path.basename(base) + ext);
            if (fs.existsSync(shared)) return load(shared);
          }
        }
      }
      throw new Error('Unexpected native boundary: ' + name);
    };
    const fetch = async (url, init = {}) => {
      const target = new URL(url);
      assert.equal(target.origin, origin, 'No non-loopback provider or production requests are allowed.');
      const route = target.pathname.replace('/api/v1', ''); calls.push({route, init});
      const next = () => globalThis.fetch(url, init);
      return handler ? handler(route, init, next) : next();
    };
    const env = {EXPO_PUBLIC_API_BASE_URL: origin + '/api/v1'};
    vm.runInNewContext('(function(exports,require,module){' + code + '\n})', {console, Date, Promise, Error, Headers, Request, Response, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, FormData, Blob, fetch, setTimeout, clearTimeout, process: {env}, globalThis})(module.exports, require, module);
    return module.exports;
  }
  function Probe() {context = load('src/product-context.tsx').useProduct(); return null;}
  const element = relative => React.createElement(load('src/product-context.tsx').ProductProvider, null, React.createElement(Probe), React.createElement(load(relative).default));
  async function settle(rounds = 8) {for (let i = 0; i < rounds; i++) await act(async () => {await delay(2);});}
  async function until(check, label = 'condition', timeout = 4000) {const deadline = Date.now() + timeout; while (!check()) {if (Date.now() > deadline) throw new Error('Timed out: ' + label); await settle(1);} return true;}
  function find(id, type) {const found = renderer.root.findAll(node => node.props.testID === id && typeof node.type === 'string' && (!type || node.type === type)); assert.equal(found.length, 1, 'One native element for ' + id); return found[0];}
  const has = id => renderer?.root.findAll(node => node.props.testID === id && typeof node.type === 'string').length > 0;
  const text = () => JSON.stringify(renderer?.toJSON());
  async function mount(relative, nextParams = {}) {params = nextParams; await act(async () => {if (renderer) renderer.update(element(relative)); else renderer = Renderer.create(element(relative));}); await settle();}
  async function press(id) {await act(async () => {const node = find(id, 'Pressable'); assert.notEqual(node.props.disabled, true, 'Button is enabled: ' + id); node.props.onPress();}); await settle();}
  async function input(id, value) {await act(async () => find(id, 'TextInput').props.onChangeText(value));}
  async function toggle(id, value) {await act(async () => find(id, 'Switch').props.onValueChange(value));}
  async function login() {await act(async () => {await load('src/session.ts').startLogin(NATIVE_FIXTURE_EMAIL, NATIVE_FIXTURE_PASSWORD); if (context) await context.refreshProfile();}); await settle();}
  async function unmount() {if (renderer) {await act(async () => renderer.unmount()); renderer = null;}}
  async function close() {await unmount(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
  return {fixture, origin, calls, navigations, opened, shared, secure, files, load, find, has, text, mount, press, input, toggle, login, unmount, close, settle, until, context: () => context,
    setHandler: value => {handler = value;}, setWriteHook: value => {writeHook = value;}, setPicker: value => {picker = value;}, setShareHook: value => {shareHook = value;},
    resume: async () => {await act(async () => {for (const listener of appListeners) listener('active');}); await settle();},
    background: async () => {await act(async () => {for (const listener of appListeners) listener('background');});},
  };
}
