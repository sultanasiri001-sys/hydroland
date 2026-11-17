const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),fork=path.join(root,'vendor/picomatch');
const pm=require(fork);

test('private backport retains its reviewed provenance and source bytes',()=>{
  const provenance=require(path.join(fork,'provenance.json'));
  assert.equal(provenance.upstreamVersion,'4.0.7');
  assert.equal(provenance.patchHead,'44f192261f312ddf236cb7bdc05d8f22663f98f9');
  for(const [file,sha256] of Object.entries(provenance.sha256)){
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(fork,file))).digest('hex'),sha256,file);
  }
  const meta=require(path.join(fork,'package.json'));
  assert.equal(meta.name,'picomatch');
  assert.equal(meta.private,true);assert.equal(meta.version,'4.0.8-hydroland.1');
});

test('the reported repeated-extglob cases finish in a bounded child process',()=>{
  const patterns=['+(*a)','*(*a)','+(a|*a)','+(?*a)','*(?*a)','+(*?a)'];
  const script=`const pm=require(${JSON.stringify(fork)});console.log(JSON.stringify(${JSON.stringify(patterns)}.map(pattern=>pm(pattern)('a'.repeat(40)+'!'))))`;
  const result=spawnSync(process.execPath,['-e',script],{encoding:'utf8',timeout:2500});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),patterns.map(()=>false));
  for(const pattern of ['+(*a)','*(*a)','+(a|*a)']){
    assert.equal(pm.isMatch(pattern,pattern),true,'unsafe pattern is interpreted literally');
  }
});

test('ordinary build globs, alternatives, classes and public APIs remain usable',()=>{
  for(const [input,pattern,result] of [
    ['src/main.ts','**/*.ts',true],['src/main.js','**/*.ts',false],
    ['apps/api/src/a.ts','apps/**/src/*.{js,ts}',true],
    ['apps/api/src/a.css','apps/**/src/*.{js,ts}',false],
    ['abc','+(*)',true],['abc','+(a*)',true],['aaa','+(a*)',true],
    ['abcabc','+(abc)',true],['foobar','*(foo|bar)',true],
    ['123','+([0-9])',true],['abc','+([0-9])',false],
    ['file.js','!*.ts',true],['file.ts','!*.ts',false],
    ['.env','*',false],['foo/a.js','foo/?.js',true],
  ])assert.equal(pm.isMatch(input,pattern),result,JSON.stringify([input,pattern]));
  assert.equal(pm(['*.js','*.ts'])('module.ts'),true);
  assert.equal(pm('*.ts',{ignore:'test.*'})('test.ts'),false);
  assert.equal(pm('*.ts',{ignore:'test.*'})('source.ts'),true);
  assert.equal(pm.makeRe('**/*.ts').test('src/a.ts'),true);
  assert.equal(pm.scan('src/**/*.ts').isGlob,true);
  assert.equal(typeof pm.parse('src/**/*.ts').output,'string');
  assert.equal(require(path.join(fork,'posix.js'))('src/*.ts')('src/a.ts'),true);
});

test('all installed picomatch entries use the private backport',()=>{
  const lock=require(path.join(root,'package-lock.json'));
  assert.equal(require(path.join(root,'package.json')).overrides.picomatch,'file:vendor/picomatch');
  assert.equal(require(path.join(root,'package.json')).dependencies.picomatch,'file:vendor/picomatch');
  for(const [key,value] of Object.entries(lock.packages)){
    if(/(?:^|\/)node_modules\/picomatch$/.test(key)){
      assert.equal(value.link,true,key);assert.equal(value.resolved,'vendor/picomatch',key);
    }
  }
  assert.equal(require('picomatch'),pm);
  const owners=[];
  for(const name of ['@angular-devkit/core','tinyglobby','fdir']){
    try{owners.push(require.resolve(name,{paths:[root]}))}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
  }
  for(const owner of owners){
    const from=createRequire(owner);
    assert.equal(fs.realpathSync(from.resolve('picomatch')),fs.realpathSync(path.join(fork,'index.js')),owner);
  }
});

test('negative control detects the original defect when only the backport guard is removed',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hydroland-picomatch-control-'));
  try{
    fs.cpSync(fork,temp,{recursive:true});
    const source=path.join(temp,'lib/parse.js'),guard='    if (hasUnsafeLeadingQuantifier(branch)) {\n      return { risky: true };\n    }\n\n';
    const before=fs.readFileSync(source,'utf8');assert.equal(before.split(guard).length,2);
    fs.writeFileSync(source,before.replace(guard,''));
    const script=`const pm=require(${JSON.stringify(temp)});pm('+(*a)')('a'.repeat(36)+'!')`;
    const result=spawnSync(process.execPath,['-e',script],{encoding:'utf8',timeout:1000});
    assert.equal(result.error?.code,'ETIMEDOUT','negative control must expose the original unbounded backtracking');
    assert.equal(result.signal,'SIGTERM');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
