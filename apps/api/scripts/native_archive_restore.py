"""Guarded real-archive verification on the existing Render recovery instance.

Private configuration is read once from stdin. Never run application workers or
production repair helpers. Never overwrite a database or upload backup bytes.
"""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, unquote, quote, urlencode
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request

SERVICE = 'srv-dakelt142hec73aavvsg'
RECOVERY = 'dpg-db7v3mks728c739pb05g-a'
SOURCE = 'dpg-dakd8g5g1s2s73bu70bg-a'
ORIGINAL = 'hydroland_32rz'
HASH = '4514bac1e5dc6779b81edfb07ab68a49eb5d2b27b8fc07b015154db7afb1c787'
CATALOG = {
 'tables': "SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relreplident FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')",
 'columns': "SELECT table_name,column_name,ordinal_position,is_nullable,data_type,udt_schema,udt_name,column_default,character_maximum_length,numeric_precision,numeric_scale,datetime_precision,is_identity,is_generated,generation_expression FROM information_schema.columns WHERE table_schema='public'",
 'constraints': "SELECT c.relname AS table_name,co.conname,co.contype,co.convalidated,pg_get_constraintdef(co.oid,true) AS definition FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'",
 'indexes': "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'",
 'enums': "SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'",
 'sequences': "SELECT sequencename,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public'",
 'triggers': "SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal",
 'functions': "SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')",
 'views': "SELECT viewname,definition FROM pg_views WHERE schemaname='public'",
 'policies': "SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public'",
 'extensions': "SELECT extname,extversion FROM pg_extension",
}

def stable(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'))

def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else stable(value).encode()).hexdigest()

def identifier(value):
    return '"' + value.replace('"', '""') + '"'

def literal(value):
    return "'" + value.replace("'", "''") + "'"

def validate(config):
    if not isinstance(config, dict) or set(config) != {'recoveryUrl', 'archiveUrl', 'archiveSha256'}:
        raise ValueError('Unexpected configuration shape')
    target, archive = urlsplit(config['recoveryUrl']), urlsplit(config['archiveUrl'])
    if target.scheme not in ('postgres', 'postgresql') or target.hostname != RECOVERY or target.path != '/' + ORIGINAL or not target.password or target.port not in (None, 5432):
        raise ValueError('Only the existing internal recovery instance is allowed')
    if archive.scheme != 'https' or archive.hostname != 'backups.render.com' or archive.path != '/db/' + SOURCE + '/2026-10-24T15:26Z.dir.tar.gz' or config['archiveSha256'] != HASH:
        raise ValueError('Unexpected source archive')
    return target

def main():
    if '--confirmed-isolated' not in sys.argv or os.environ.get('RENDER_SERVICE_ID') != SERVICE:
        raise ValueError('Confirmed approved Render execution is required')
    print('WAITING_FOR_PRIVATE_RECOVERY_CONFIGURATION', flush=True)
    raw = sys.stdin.readline(16385)
    if len(raw) > 16384:
        raise ValueError('Configuration too large')
    config = json.loads(raw)
    target = validate(config)
    cwd = Path.cwd()
    if not (cwd / 'prisma/schema.prisma').is_file():
        raise ValueError('Run from the deployed API directory')
    tools = {name: shutil.which(name) for name in ('psql', 'pg_restore', 'node')}
    if not all(tools.values()):
        raise ValueError('Native clients are required')
    work = Path(tempfile.mkdtemp(prefix='hydroland-native-archive-'))
    work.chmod(0o700)
    base_env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'PGHOST': RECOVERY, 'PGPORT': '5432', 'PGUSER': unquote(target.username), 'PGPASSWORD': unquote(target.password), 'PGSSLMODE': 'require', 'PGCONNECT_TIMEOUT': '10', 'PGAPPNAME': 'hydroland-isolated-native-recovery', 'PGTZ': 'UTC', 'PGCLIENTENCODING': 'UTF8'}
    names = ['hydroland_restore_20261024_4514_' + suffix for suffix in ('a', 'b')]
    report = {'kind': 'REAL_ARCHIVE_NATIVE_RECOVERY_V1', 'sourceArchiveSha256': HASH, 'sourceArchiveBytes': 1980853, 'recoveryResource': RECOVERY, 'applicationCommit': os.environ.get('RENDER_GIT_COMMIT'), 'operatorScriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'productionWrites': 0, 'newPaidResources': 0, 'applicationWorkersStarted': False, 'businessProviderCredentialsPassed': False, 'providerPitrVerified': False, 'cutoverPerformed': False, 'ownerAclTransferVerified': False, 'targets': []}
    started = time.monotonic()

    def run(argv, database=ORIGINAL, input_bytes=None, timeout=180, extra=None, expect=0):
        env = {**base_env, 'PGDATABASE': database, **(extra or {})}
        result = subprocess.run(argv, input=input_bytes, capture_output=True, env=env, cwd=cwd, timeout=timeout)
        if result.returncode != expect:
            path = work / 'last-client-error.private.log'
            path.write_bytes(result.stderr); path.chmod(0o600)
            codes = re.findall(rb'\b(?:23\d{3}|P\d{4}|42\w{3})\b', result.stderr)
            raise RuntimeError('Client failure: ' + str(result.returncode) + '; SQLSTATE=' + (codes[-1].decode() if codes else 'not reported'))
        return result.stdout

    def sql(database, query):
        return run([tools['psql'], '-X', '-q', '-A', '-t', '-w', '--set=ON_ERROR_STOP=1', '--set=VERBOSITY=sqlstate', '-c', query], database)

    def rows(database, query):
        value = json.loads(sql(database, 'SELECT coalesce(json_agg(q),\'[]\'::json) FROM (' + query.rstrip(';') + ') q;'))
        return sorted(value, key=stable)

    def snapshot(database):
        tables = rows(database, "SELECT tablename FROM pg_tables WHERE schemaname='public'")
        queries = ["SELECT " + literal(r['tablename']) + " AS table_name,count(*)::bigint AS row_count,md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),'')) AS data_hash FROM public." + identifier(r['tablename']) + ' r' for r in tables]
        return {'catalog': {key: rows(database, query) for key, query in CATALOG.items()}, 'contents': rows(database, ' UNION ALL '.join(queries)) if queries else [], 'history': rows(database, 'SELECT * FROM public."_prisma_migrations"') if any(r['tablename'] == '_prisma_migrations' for r in tables) else []}

    try:
        transport = rows(ORIGINAL, "SELECT current_database() AS database,current_setting('server_version') AS version,ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()")
        assert len(transport) == 1 and transport[0]['database'] == ORIGINAL and transport[0]['ssl'] and transport[0]['version'].startswith('18.'), 'Unexpected native recovery transport'
        report['nativeServer'] = transport[0]['version']; report['tls'] = True
        assert not rows(ORIGINAL, 'SELECT datname FROM pg_database WHERE datname IN (' + ','.join(map(literal, names)) + ')'), 'A target already exists; never overwrite or repeat this restore'
        original = snapshot(ORIGINAL)
        report['originalRecoverySnapshotSha256'] = digest(original)
        print(json.dumps({'stage': 'native_target_verified', 'originalTables': len(original['contents']), 'tls': True}), flush=True)

        archive = work / 'production.dir.tar.gz'
        with urllib.request.urlopen(config['archiveUrl'], timeout=40) as response:
            payload = response.read(1980854)
        assert len(payload) == 1980853 and digest(payload) == HASH, 'Archive bytes do not match the already approved source'
        archive.write_bytes(payload); archive.chmod(0o600)
        unpacked = work / 'archive'; unpacked.mkdir(mode=0o700)
        with tarfile.open(archive, 'r:gz') as source:
            members = source.getmembers()
            assert sum(m.size for m in members) < 64 * 1024 * 1024
            for member in members:
                path = unpacked / member.name
                assert path.resolve().is_relative_to(unpacked.resolve()), 'Unsafe archive path'
                if member.isdir():
                    path.mkdir(parents=True, exist_ok=True, mode=0o700)
                else:
                    assert member.isfile(), 'Nonregular archive member'
                    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                    with source.extractfile(member) as reader, path.open('xb') as writer:
                        shutil.copyfileobj(reader, writer)
                    path.chmod(0o600)
        toc = list(unpacked.rglob('toc.dat')); assert len(toc) == 1
        dump = toc[0].parent
        toc_text = run([tools['pg_restore'], '--list', str(dump)]).decode()
        assert not re.search(r'\b(?:BLOB|BLOBS|LARGE OBJECT)\b', toc_text), 'Large objects need a separately reviewed byte verifier'
        data = run([tools['pg_restore'], '--data-only', '--no-owner', '--no-privileges', '--file=-', str(dump)])
        blocks = re.findall(rb'^(COPY (?:"public"|public)\.[^\r\n]* FROM stdin;)\r?\n(.*?)^\\\.\r?\n', data, re.M | re.S)
        assert len(blocks) == 126 and all(b'\n' not in header for header, _ in blocks), 'Unexpected archive COPY layout'
        expected = [(header.replace(b' FROM stdin;', b' TO STDOUT;').decode(), digest(content)) for header, content in blocks]
        print(json.dumps({'stage': 'archive_verified', 'copyTables': len(expected)}), flush=True)

        migration_files = {p.parent.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (cwd / 'prisma/migrations').glob('*/migration.sql')}
        prisma = next((p / 'node_modules/prisma/build/index.js' for p in [cwd, *cwd.parents] if (p / 'node_modules/prisma/build/index.js').is_file()), None)
        assert prisma, 'Installed Prisma CLI is required'
        baseline = None
        for database in names:
            sql(ORIGINAL, 'CREATE DATABASE ' + identifier(database) + ' TEMPLATE template0;')
            assert not rows(database, "SELECT tablename FROM pg_tables WHERE schemaname='public'")
            run([tools['pg_restore'], '--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', '--dbname=' + database, str(dump)], database)
            for query, expected_hash in expected:
                assert digest(sql(database, query)) == expected_hash, 'A restored COPY stream differs from the production archive'
            before = snapshot(database)
            assert len(before['contents']) == 126
            applied = [r for r in before['history'] if r['finished_at'] and not r['rolled_back_at']]
            assert len(before['history']) == 116 and len(applied) == 90
            assert len(applied) == len(migration_files) and {r['migration_name']: r['checksum'] for r in applied} == migration_files, 'Current migrations differ from the real applied ledger'
            dsn = urlunsplit(('postgresql', quote(unquote(target.username), safe='') + ':' + quote(unquote(target.password), safe='') + '@' + RECOVERY + ':5432', '/' + database, urlencode({'sslmode': 'require', 'connection_limit': '1'}), ''))
            app_env = {'PATH': base_env['PATH'], 'DATABASE_URL': dsn, 'NODE_ENV': 'test', 'RENDER_GIT_COMMIT': report['applicationCommit'] or 'unknown'}
            output = run([tools['node'], str(prisma), 'migrate', 'deploy', '--schema', str(cwd / 'prisma/schema.prisma')], database, extra=app_env)
            assert b'No pending migrations to apply.' in output
            assert snapshot(database) == before, 'Migration rerun changed restored records or catalog'
            orm = """require('reflect-metadata'); const assert=require('node:assert/strict'); const path=require('node:path');
const {DatabaseService}=require(path.resolve('dist/database/database.service.js'));
const {HealthController}=require(path.resolve('dist/health/health.controller.js'));
(async()=>{const db=new DatabaseService();try{await db.$connect();
const account=await db.account.findFirst({include:{person:true,roleAssignments:true}});assert(account?.person?.id);
const booking=await db.booking.findFirst({where:{payments:{some:{}}},include:{trip:true,account:{include:{person:true}},payments:{include:{invoice:true}}}});assert(booking?.account?.person?.id);assert(booking.payments.length>0);for(const p of booking.payments)assert.equal(p.bookingId,booking.id);
const employment=await db.employment.findFirst({include:{account:true,organization:true,orgUnit:true}});if(employment)assert.equal(employment.organization.id,employment.orgUnit.organizationId);
const ready=await new HealthController(db).getReadiness();assert.equal(ready.database,'ok');
console.log(JSON.stringify({accountRelationships:true,bookingPaymentInvoiceRelationships:true,employmentRelationships:true,readiness:'ready'}));
}finally{await db.$disconnect()}})().catch(()=>{console.error('ISOLATED_ORM_READ_FAILED');process.exitCode=1});"""
            app = json.loads(run([tools['node'], '-e', orm], database, extra=app_env))
            for label, statement, code in [
                ('account_unique', 'INSERT INTO public."Account" SELECT * FROM public."Account" LIMIT 1', b'23505'),
                ('account_foreign_key', 'UPDATE public."RoleAssignment" SET "accountId"=\'00000000-0000-0000-0000-000000000000\' WHERE id=(SELECT id FROM public."RoleAssignment" LIMIT 1)', b'23503'),
            ]:
                result = subprocess.run([tools['psql'], '-X', '-q', '-w', '--set=ON_ERROR_STOP=1', '--set=VERBOSITY=sqlstate', '-c', 'BEGIN;' + statement + ';ROLLBACK;'], env={**base_env, 'PGDATABASE': database}, capture_output=True)
                assert result.returncode != 0 and code in result.stderr, label + ' was not enforced'
            assert snapshot(database) == before, 'Constraint probes changed recovered records'
            if baseline is None:
                baseline = before
            else:
                assert before == baseline, 'Independent native restorations disagree'
            report['targets'].append({'database': database, 'archiveCopyRoundTrips': len(expected), 'tableCount': 126, 'historyRecords': len(before['history']), 'appliedMigrations': len(applied), 'migrationRerunNoop': True, 'application': app, 'constraints': ['23505', '23503'], 'snapshotSha256': digest(before), 'catalogSha256': digest(before['catalog']), 'catalogCounts': {k: len(v) for k,v in before['catalog'].items()}})
            print(json.dumps({'stage': 'target_verified', 'database': database, 'copyRoundTrips': len(expected), 'migrationRerunNoop': True, 'readiness': app['readiness']}), flush=True)

        negative_queries = ["SELECT " + literal(r['table_name']) + " AS table_name,count(*)::bigint AS row_count,md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),'')) AS data_hash FROM public." + identifier(r['table_name']) + ' r' for r in baseline['contents']]
        negative = sql(names[0], "BEGIN; INSERT INTO public.\"OperationalSetting\" (key,value,\"updatedAt\") VALUES ('NATIVE_RECOVERY_NEGATIVE_CONTROL','{\"synthetic\":true}'::jsonb,clock_timestamp()); SELECT json_agg(q) FROM (" + ' UNION ALL '.join(negative_queries) + ') q; ROLLBACK;')
        assert sorted(json.loads(negative), key=stable) != baseline['contents'], 'Corruption negative control was not detected'
        assert snapshot(names[0]) == baseline and snapshot(names[1]) == baseline
        assert snapshot(ORIGINAL) == original, 'The existing recovery database changed'
        report['negativeControlDetected'] = True; report['negativeControlCleaned'] = True
        report['originalRecoveryDatabaseUnchanged'] = True
        report['elapsedSeconds'] = round(time.monotonic() - started, 3)
        report['nativeLogicalRestoreVerified'] = True
        destination = Path('/tmp/hydroland-native-recovery-report-20261024.json')
        destination.write_text(json.dumps(report, indent=2) + '\n'); destination.chmod(0o600)
        print('NATIVE_RECOVERY_RESULT=' + json.dumps(report, separators=(',', ':')), flush=True)
        shutil.rmtree(work)
    except Exception:
        print('NATIVE_RECOVERY_PRIVATE_WORK=' + str(work), flush=True)
        raise

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never print private configuration, archive rows or client error details.
        print(json.dumps({'nativeRecoveryVerified': False, 'errorType': type(error).__name__, 'reason': str(error) if isinstance(error, (AssertionError, ValueError, RuntimeError)) else 'Operator job failed'}), flush=True)
        sys.exit(1)
