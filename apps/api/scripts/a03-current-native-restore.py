import os,sys,json,re,hashlib,tempfile,subprocess,shutil,time,uuid,termios
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlsplit,urlunsplit,unquote,quote,urlencode
SOURCE="dpg-dakd8g5g1s2s73bu70bg-a"
RECOVERY="dpg-db7v3mks728c739pb05g-a"
ORIGINAL="hydroland_32rz"
def now(): return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
def digest(b): return hashlib.sha256(b).hexdigest()
def ident(s): return '"'+s.replace('"','""')+'"'
def main():
 assert os.environ.get("RENDER_SERVICE_ID")=="srv-dakelt142hec73aavvsg"
 terminal=termios.tcgetattr(sys.stdin.fileno()); hidden=termios.tcgetattr(sys.stdin.fileno());hidden[3]&=~termios.ECHO
 termios.tcsetattr(sys.stdin.fileno(),termios.TCSADRAIN,hidden)
 print("WAITING_FOR_PRIVATE_EXISTING_RECOVERY_CONNECTION",flush=True)
 try: config=json.loads(sys.stdin.readline(16385))
 finally: termios.tcsetattr(sys.stdin.fileno(),termios.TCSADRAIN,terminal)
 assert set(config)=={"recoveryUrl"}
 target=urlsplit(config["recoveryUrl"]); source=urlsplit(os.environ["DATABASE_URL"])
 assert target.scheme in ("postgres","postgresql") and target.hostname==RECOVERY and target.path=="/"+ORIGINAL and target.port in (None,5432) and target.password
 assert source.scheme in ("postgres","postgresql") and source.hostname==SOURCE and source.path=="/hydroland" and source.password
 tools={k:shutil.which(k) for k in ("psql","pg_dump","pg_restore","node")};assert all(tools.values())
 work=Path(tempfile.mkdtemp(prefix="hydroland-a03-native-"));work.chmod(0o700)
 name="hydroland_a03_20261113_"+uuid.uuid4().hex[:10]
 report={"scope":"A03_CURRENT_PRODUCTION_NATIVE_LOGICAL_RECOVERY","status":"FAIL","applicationCommit":os.environ.get("RENDER_GIT_COMMIT"),"sourceResource":SOURCE,"targetResource":RECOVERY,"newLogicalDatabase":name,"newPaidResources":0,"productionWrites":0,"cutoverPerformed":False,"providerPitrExecuted":False,"rpoExactSeconds":None,"rpoTargetSeconds":None,"rtoTargetSeconds":None}
 def env_for(u,database,read_only=False):
  e={"PATH":os.environ.get("PATH","/usr/bin:/bin"),"PGHOST":u.hostname,"PGPORT":"5432","PGUSER":unquote(u.username),"PGPASSWORD":unquote(u.password),"PGDATABASE":database,"PGSSLMODE":"require","PGCONNECT_TIMEOUT":"10","PGAPPNAME":"hydroland-a03-isolated-native-recovery","PGTZ":"UTC","PGCLIENTENCODING":"UTF8"}
  if read_only:e["PGOPTIONS"]="-c default_transaction_read_only=on"
  return e
 def run(argv,env,input_bytes=None,timeout=120):
  r=subprocess.run(argv,input=input_bytes,capture_output=True,env=env,timeout=timeout)
  if r.returncode:
   (work/"last-client-error.private.log").write_bytes(r.stderr);(work/"last-client-error.private.log").chmod(0o600)
   raise RuntimeError("CLIENT_OPERATION_FAILED")
  return r.stdout
 def sql(q,database=ORIGINAL):
  return run([tools["psql"],"-X","-q","-A","-t","-w","--set=ON_ERROR_STOP=1","-c",q],env_for(target,database),timeout=60)
 def rows(q,database=ORIGINAL):
  return json.loads(sql("SELECT coalesce(json_agg(q),'[]'::json) FROM ("+q+") q",database))
 def snapshot(database):
  tables=rows("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",database)
  queries=["SELECT '"+t["tablename"].replace("'","''")+"' AS t,count(*)::bigint AS n,md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),'')) AS h FROM public."+ident(t["tablename"])+" r" for t in tables]
  data=rows(" UNION ALL ".join(queries),database)
  return digest(json.dumps(sorted(data,key=lambda x:x["t"]),sort_keys=True,separators=(",",":")).encode())
 try:
  identity=rows("SELECT current_database() AS db,current_setting('server_version') AS version,ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()")
  assert len(identity)==1 and identity[0]["db"]==ORIGINAL and identity[0]["version"].startswith("18.") and identity[0]["ssl"]
  assert not rows("SELECT datname FROM pg_database WHERE datname='"+name+"'")
  original_hash=snapshot(ORIGINAL);report["originalRecoveryDatabaseSha256"]=original_hash
  report["backupCaptureStartedAt"]=now();archive=work/"production.dump"
  run([tools["pg_dump"],"--format=custom","--no-owner","--no-privileges","--file",str(archive)],env_for(source,"hydroland",True),timeout=90)
  archive.chmod(0o600);assert archive.stat().st_size<32*1024*1024
  report["backupCaptureCompletedAt"]=now();report["archiveBytes"]=archive.stat().st_size;report["archiveSha256"]=digest(archive.read_bytes())
  dump_sql=run([tools["pg_restore"],"--data-only","--no-owner","--no-privileges","--file=-",str(archive)],env_for(target,ORIGINAL))
  blocks=re.findall(rb"^(COPY (?:\"public\"|public)\.[^\r\n]* FROM stdin;)\r?\n(.*?)^\\\.\r?\n",dump_sql,re.M|re.S)
  assert 0<len(blocks)<=500
  report["incidentDeclaredAt"]=now();beg=time.monotonic();report["recoveryRequestedAt"]=now()
  sql("CREATE DATABASE "+ident(name)+" TEMPLATE template0")
  assert not rows("SELECT tablename FROM pg_tables WHERE schemaname='public'",name)
  run([tools["pg_restore"],"--exit-on-error","--single-transaction","--no-owner","--no-privileges","--dbname",name,str(archive)],env_for(target,name),timeout=120)
  table_results=[]
  for header,payload in blocks:
   query=header.replace(b" FROM stdin;",b" TO STDOUT;").decode()
   actual=sql(query,name)
   a=b"".join(sorted(actual.splitlines(keepends=True)));b=b"".join(sorted(payload.splitlines(keepends=True)))
   assert a==b
   table_results.append({"table":header.decode().split(" (",1)[0][5:],"rows":len(payload.splitlines()),"bytesAndRowsMatch":True})
  report["databaseVerifiedAt"]=now();report["tablesCompared"]=len(blocks);report["rowsCompared"]=sum(x["rows"] for x in table_results);report["tableChecks"]=table_results
  report["targetCatalog"]=rows("SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public')::int AS tables,(SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public')::int AS constraints,(SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND NOT c.convalidated)::int AS unvalidated_constraints",name)[0]
  assert report["targetCatalog"]["tables"]==len(blocks)
  before_app=snapshot(name)
  netloc=quote(unquote(target.username),safe="")+":"+quote(unquote(target.password),safe="")+"@"+RECOVERY+":5432"
  dsn=urlunsplit(("postgresql",netloc,"/"+name,urlencode({"sslmode":"require","connection_limit":"2"}),""))
  child_env={"PATH":os.environ.get("PATH","/usr/bin:/bin"),"DATABASE_URL":dsn,"NODE_ENV":"test","RENDER_GIT_COMMIT":report["applicationCommit"] or "unknown","A03_EXPECTED_TARGET":name}
  for k,v in os.environ.items():
   if k.startswith("HYDROLAND_OBJECT_STORAGE_") or k=="HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS":child_env[k]=v
  app_code=r"""require("reflect-metadata");const assert=require("node:assert/strict"),crypto=require("node:crypto");const {PrismaClient}=require("@prisma/client"),{HealthController}=require("./dist/health/health.controller.js"),{CredentialsService}=require("./dist/credentials/credentials.service.js"),{CredentialObjectStorageService}=require("./dist/credentials/credential-object-storage.service.js"),{AuditService}=require("./dist/audit/audit.service.js"),{IntegrationService}=require("./dist/integrations/integration.service.js");const p=new PrismaClient();(async()=>{try{const [id]=await p.$queryRawUnsafe("SELECT current_database()::text AS name");assert.equal(id.name,process.env.A03_EXPECTED_TARGET);const ready=await new HealthController(p).getReadiness();assert.equal(ready.database,"ok");const checks=[];const rollback=Object.assign(new Error("intentional rollback"),{a03Rollback:true});try{await p.$transaction(async tx=>{const docs=await tx.document.findMany({where:{status:{not:"ARCHIVED"}},select:{id:true,credentialId:true,ownerId:true,sha256:true,byteSize:true},take:5});assert(docs.length>0&&docs.length<=4);const audit=new AuditService(tx),integrations=new IntegrationService(audit),storage=new CredentialObjectStorageService(integrations),service=new CredentialsService(tx,{},audit,{},storage);for(const d of docs){const owner=await tx.account.findFirst({where:{personId:d.ownerId,status:"ACTIVE"},select:{id:true}}),other=await tx.account.findFirst({where:{personId:{not:d.ownerId},status:"ACTIVE"},select:{id:true}});assert(owner&&other);const count=await tx.auditEvent.count();let denied=false;try{await service.documentAccess(other.id,d.credentialId,d.id);}catch(e){denied=typeof e.getStatus==="function"&&e.getStatus()===404;}assert(denied);assert.equal(await tx.auditEvent.count(),count);const access=await service.documentAccess(owner.id,d.credentialId,d.id);assert(access.url&&access.expiresAt);const response=await fetch(access.url,{redirect:"error",signal:AbortSignal.timeout(8000)});assert(response.ok);const hash=crypto.createHash("sha256");let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;assert(bytes<=8388608);hash.update(chunk);}assert.equal(bytes,d.byteSize);assert.equal(hash.digest("hex"),d.sha256);assert.equal(await tx.auditEvent.count(),count+1);checks.push({index:checks.length,crossAccountDenied:true,denialStatus:404,ownerSignedReadAndHashVerified:true,successAuditVerified:true});}throw rollback;},{maxWait:5000,timeout:40000});}catch(e){if(e!==rollback)throw e;}console.log(JSON.stringify({status:"PASS",readiness:"ready",checks,auditProbeRolledBack:true,httpAuthenticationExercised:false,objectsAndPermissionsVerifiedAt:new Date().toISOString()}));}finally{await p.$disconnect();}})().catch(()=>{console.error("RECOVERED_APPLICATION_CHECK_FAILED");process.exitCode=2;});"""
  report["application"]=json.loads(run([tools["node"],"-e",app_code],child_env,timeout=60))
  assert report["application"]["status"]=="PASS"
  assert snapshot(name)==before_app;report["recoveredDatabaseUnchangedAfterApplicationProbe"]=True
  assert snapshot(ORIGINAL)==original_hash;report["originalRecoveryDatabaseUnchanged"]=True
  report["readyForCutoverAt"]=now();report["rtoObservedSeconds"]=round(time.monotonic()-beg,3)
  t0=datetime.fromisoformat(report["backupCaptureStartedAt"].replace("Z","+00:00"));ti=datetime.fromisoformat(report["incidentDeclaredAt"].replace("Z","+00:00"))
  report["rpoSnapshotAgeUpperBoundSeconds"]=round((ti-t0).total_seconds(),3)
  report["rpoMeasurementMethod"]="Conservative bound: the consistent exported snapshot cannot precede backupCaptureStartedAt; simulated incident was declared after export completion. Exact latest business-commit timestamp was not observed."
  report["nativeLogicalRestoreVerified"]=True;report["status"]="PASS"
  report["privateWorkRemoved"]=True
  shutil.rmtree(work)
 except Exception as e:
  report["errorType"]=type(e).__name__;report["errorCode"]="NATIVE_RECOVERY_ACCEPTANCE_FAILED";report["privateWorkRetained"]=True
 report["completedAt"]=now()
 destination=Path("/tmp/hydroland-a03-current-native-recovery-receipt.json")
 destination.write_text(json.dumps(report,indent=2)+"\n");destination.chmod(0o600)
 print(json.dumps({"receipt":str(destination),**{k:v for k,v in report.items() if k!="tableChecks"}},separators=(",",":")),flush=True)
if __name__=="__main__":
 try:main()
 except Exception as e:print(json.dumps({"status":"FAIL","errorType":type(e).__name__,"stage":"CONFIGURATION_OR_PREPARATION"}),flush=True);sys.exit(2)
