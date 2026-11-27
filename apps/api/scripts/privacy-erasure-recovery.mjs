import { DatabaseService } from '../dist/database/database.service.js';
import { PrivateErasureJournal } from '../dist/privacy/erasure-journal.js';
import { PrivacyRecoveryService } from '../dist/privacy/privacy-recovery.service.js';
import { AuditService } from '../dist/audit/audit.service.js';
import { IntegrationService } from '../dist/integrations/integration.service.js';

// An explicit maintenance command, not an API route or automatic startup
// mutation. The service must remain offline until verification succeeds.
const apply=process.argv.includes('--apply');
const initialize=process.argv.includes('--initialize');
if(process.argv.slice(2).some(x=>!['--apply','--verify','--initialize'].includes(x))||apply&&initialize)throw new Error('Use --verify, --apply or --initialize.');
if(apply&&process.env.HYDROLAND_PRIVACY_RESTORE_CONFIRM!=='OFFLINE_RESTORE_REPLAY')throw new Error('Offline restore confirmation is required.');
const db=new DatabaseService();
try{const service=new PrivacyRecoveryService(db,new PrivateErasureJournal(new IntegrationService(new AuditService(db)))),result=initialize?await service.initialize():await service.reconcile(apply);console.log(JSON.stringify({mode:initialize?'INITIALIZE':apply?'REPLAY':'VERIFY',...result}));}
finally{await db.$disconnect();}
