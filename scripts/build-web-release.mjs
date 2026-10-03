import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const run=(command,args)=>{
  const result=spawnSync(command,args,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
};
run('npm',['ci','--workspace=@hydroland/web','--include-workspace-root=true','--ignore-scripts']);
run('npm',['run','test','--workspace=@hydroland/web']);
run('npm',['run','build','--workspace=@hydroland/web']);
run('node',['scripts/release-dependency-audit.mjs','web-api','web-release-audit.json']);
