import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function validateAuditReport(report,status){
  const counts=report?.metadata?.vulnerabilities;
  if(![0,1].includes(status)||report?.error||!counts||
     !Number.isInteger(counts.high)||!Number.isInteger(counts.critical)||
     counts.high<0||counts.critical<0||!report.vulnerabilities||
     typeof report.vulnerabilities!=='object'||Array.isArray(report.vulnerabilities)||
     Object.values(report.vulnerabilities).some(v=>!v||typeof v!=='object'||!['info','low','moderate','high','critical'].includes(v.severity))){
    throw new Error('Dependency audit did not return a complete valid report.');
  }
  const rows=Object.entries(report.vulnerabilities).filter(([,v])=>['high','critical'].includes(v?.severity));
  if(rows.length||counts.high||counts.critical)throw new Error('High/critical dependency vulnerabilities remain. No package-name exceptions are permitted.');
  return counts;
}

export const auditScopes={
  'web-api':['--workspace=@hydroland/api','--workspace=@hydroland/web','--include-workspace-root=true'],
  mobile:['--workspace=@hydroland/mobile','--include-workspace-root=false'],
  repository:[],
};

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const scope=process.argv[2],output=process.argv[3];
  try{
    if(!Object.hasOwn(auditScopes,scope)||!output)throw new Error('Expected an explicit web-api, mobile or repository scope and report path.');
    // Include development dependencies: build tooling belongs to its release.
    const result=spawnSync('npm',['audit',...auditScopes[scope],'--include=dev','--json'],{encoding:'utf8',maxBuffer:16*1024*1024});
    fs.writeFileSync(output,result.stdout||'');
    if(result.error)throw result.error;
    const report=JSON.parse(result.stdout);
    console.log(JSON.stringify({scope,counts:report.metadata?.vulnerabilities,affected:Object.keys(report.vulnerabilities||{})},null,2));
    validateAuditReport(report,result.status);
    console.log(`Dependency security passed for ${scope}.`);
  }catch(error){console.error(`Dependency security failed for ${scope}: ${error.message}`);process.exitCode=1;}
}
