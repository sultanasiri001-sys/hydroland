import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Render rootDir is apps/api; resolve from this file rather than caller cwd.
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const run=(command,args)=>{
  const result=spawnSync(command,args,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
};
const scope=['--workspace=@hydroland/api','--include-workspace-root=false'];
run('npm',['ci',...scope,'--include=dev','--ignore-scripts']);
run('npm',['run','db:generate','--workspace=@hydroland/api']);
run('npm',['run','build','--workspace=@hydroland/api']);
run('npm',['prune',...scope,'--omit=dev','--ignore-scripts']);
run('node',['apps/api/scripts/runtime-dependency-boundary.mjs']);
run('node',['scripts/release-dependency-audit.mjs','web-api','api-release-audit.json']);
