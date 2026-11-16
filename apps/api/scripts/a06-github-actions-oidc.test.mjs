import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {test} from 'node:test';
import {A06_OIDC_AUDIENCE,A06_OIDC_ISSUER,A06_OIDC_WORKFLOW,verifyA06GitHubActionsToken} from '../src/health/a06-github-actions-oidc.ts';

const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const publicJwk=publicKey.export({format:'jwk'});
const kid='a06-test-key';
const now=1_800_000_000_000;
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function token(overrides={}){
  const header=b64({alg:'RS256',typ:'JWT',kid});
  const claims=b64({
    iss:A06_OIDC_ISSUER,aud:A06_OIDC_AUDIENCE,
    repository:'sultanasiri001-sys/hydroland',repository_id:'1366555943',repository_owner_id:'326666007',
    workflow_ref:A06_OIDC_WORKFLOW,ref:'refs/heads/main',event_name:'schedule',
    run_id:'43419947841',run_attempt:'1',iat:Math.floor(now/1000),nbf:Math.floor(now/1000),exp:Math.floor(now/1000)+300,
    ...overrides,
  });
  const signingInput=header+'.'+claims;
  return signingInput+'.'+sign('RSA-SHA256',Buffer.from(signingInput),privateKey).toString('base64url');
}
function fetchJwks(){
  return async url=>{
    assert.equal(String(url),A06_OIDC_ISSUER+'/.well-known/jwks');
    return new Response(JSON.stringify({keys:[{...publicJwk,kid,use:'sig',alg:'RS256'}]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
}

test('accepts a signed schedule token for the exact production workflow and audience',async()=>{
  const claims=await verifyA06GitHubActionsToken(token(),fetchJwks(),now);
  assert.equal(claims.repository,'sultanasiri001-sys/hydroland');
});
test('accepts a signed manual dispatch token for the exact production workflow',async()=>{
  await verifyA06GitHubActionsToken(token({event_name:'workflow_dispatch'}),fetchJwks(),now);
});
test('rejects every untrusted claim variant',async()=>{
  const variants=[
    {aud:'https://attacker.example'},
    {workflow_ref:'sultanasiri001-sys/hydroland/.github/workflows/other.yml@refs/heads/main'},
    {repository_id:'1'},
    {repository_owner_id:'2'},
    {ref:'refs/heads/feature'},
    {event_name:'pull_request'},
    {exp:Math.floor(now/1000)-1},
    {exp:Math.floor(now/1000)+601},
  ];
  for(const claims of variants)await assert.rejects(verifyA06GitHubActionsToken(token(claims),fetchJwks(),now),/A06_OIDC_TOKEN_INVALID/);
});
test('rejects tampered claims and unavailable signing keys',async()=>{
  const valid=token();
  const parts=valid.split('.');
  const tampered=parts[0]+'.'+b64({iss:A06_OIDC_ISSUER,aud:A06_OIDC_AUDIENCE})+'.'+parts[2];
  await assert.rejects(verifyA06GitHubActionsToken(tampered,fetchJwks(),now),/A06_OIDC_TOKEN_INVALID/);
  await assert.rejects(verifyA06GitHubActionsToken(valid,async()=>new Response('{}',{status:503}),now),/A06_OIDC_TOKEN_INVALID/);
});
