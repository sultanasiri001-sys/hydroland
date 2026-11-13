"""Pure mocked unit checks. No subprocesses, sockets, database or actual restores."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import acceptance as a

class AcceptanceTests(unittest.TestCase):
    def test_version18(self): self.assertTrue(a.version18('pg_dump (PostgreSQL) 18.2'))
    def test_reject17(self): self.assertFalse(a.version18('pg_dump (PostgreSQL) 17.9'))
    def test_reject180(self): self.assertFalse(a.version18('pg_dump (PostgreSQL) 180.2'))
    def test_no_claim_default(self): self.assertEqual(a.receipt()['actualSyntheticRestore'],'NOT_RUN')
    def test_real_uat_always_not_run(self): self.assertEqual(a.receipt()['realUatAcceptance'],'NOT_RUN')
    def test_environment_strips_credentials(self):
        with patch.dict('os.environ',{'DATABASE_URL':'postgres://private','PGPASSWORD':'private','RESEND_API_KEY':'private'}):
            env=a.safe_env(Path('/tmp/a04'))
        self.assertNotIn('DATABASE_URL',env); self.assertNotIn('PGPASSWORD',env); self.assertNotIn('RESEND_API_KEY',env)
    def test_no_tcp(self):
        args=a.plan(Path('/tmp/a04'),{'pg_ctl':'/bin/pg_ctl'})
        self.assertIn("listen_addresses=''",args[args.index('-o')+1])
    def test_missing_tools_fail(self):
        with patch('shutil.which',return_value=None),self.assertRaisesRegex(RuntimeError,'TOOLS_REQUIRED'): a.resolve_tools()
    def test_no_execute_without_flag(self):
        with patch('sys.argv',['acceptance.py']),patch('builtins.print'),patch.object(a,'resolve_tools') as resolver:
            self.assertEqual(a.main(),2); resolver.assert_not_called()
    def exercise(self,fail=None,changed=False):
        with tempfile.TemporaryDirectory() as tmp:
            work=Path(tmp); calls=[]
            def fake(args,**kwargs):
                calls.append(args); out=b''
                if args[0]=='pg_dump':
                    if fail=='dump': return SimpleNamespace(returncode=1,stdout=b'')
                    (work/'synthetic.dump').write_bytes(b'PGDMP_SYNTHETIC_UNIT_MOCK')
                if args[0]=='pg_restore' and '--list' not in args and fail=='restore': return SimpleNamespace(returncode=1,stdout=b'')
                if args[0]=='pg_ctl' and args[-1]=='start' and fail=='start': return SimpleNamespace(returncode=1,stdout=b'')
                if args[0]=='pg_ctl' and args[-1]=='stop' and fail=='stop': return SimpleNamespace(returncode=1,stdout=b'')
                if args[0]=='psql':
                    q=args[-1]
                    if "'version'" in q: out=json.dumps({'version':'180001','data':str(work/'cluster'),'listen':'' if fail!='identity' else '*','database':'postgres'}).encode()
                    elif 'count(*) FROM pg_class' in q: out=b'1' if fail=='occupied' else b'0'
                    elif q.startswith('BEGIN;'): out=b'{"fixture":"changed"}'
                    elif q==a.SNAPSHOT: out=b'{"fixture":"different"}' if changed and kwargs['env']['PGDATABASE']==a.DBS[1] else b'{"fixture":"expected"}'
                return SimpleNamespace(returncode=0,stdout=out)
            with patch('subprocess.run',side_effect=fake): report=a.execute(work,{k:k for k in a.TOOLS})
            artifact=(work/'synthetic.dump').read_bytes() if (work/'synthetic.dump').exists() else None
            return report,calls,artifact
    def test_mock_success_is_never_real_uat(self):
        r,c,_=self.exercise(); self.assertEqual(r['actualSyntheticRestore'],'PASS'); self.assertEqual(r['realUatAcceptance'],'NOT_RUN'); self.assertTrue(r['clusterStopped'])
    def test_restore_failure_preserves_archive(self):
        r,_,archive=self.exercise(fail='restore'); self.assertEqual(r['actualSyntheticRestore'],'FAIL'); self.assertIsNotNone(archive)
    def test_dump_failure_no_success(self): self.assertEqual(self.exercise(fail='dump')[0]['actualSyntheticRestore'],'FAIL')
    def test_mismatch_no_success(self): self.assertEqual(self.exercise(changed=True)[0]['actualSyntheticRestore'],'FAIL')
    def test_occupied_refuses_dump(self):
        r,c,_=self.exercise(fail='occupied'); self.assertEqual(r['actualSyntheticRestore'],'FAIL'); self.assertFalse(any(x[0]=='pg_dump' for x in c))
    def test_wrong_identity_refuses_create(self):
        r,c,_=self.exercise(fail='identity'); self.assertEqual(r['actualSyntheticRestore'],'FAIL'); self.assertFalse(any(x[-1].startswith('CREATE DATABASE') for x in c))
    def test_start_failure_attempts_stop(self):
        r,c,_=self.exercise(fail='start'); self.assertEqual(r['actualSyntheticRestore'],'FAIL'); self.assertTrue(any(x[0]=='pg_ctl' and x[-1]=='stop' for x in c))
    def test_stop_failure_no_success(self): self.assertEqual(self.exercise(fail='stop')[0]['actualSyntheticRestore'],'FAIL')
    def test_no_destructive_restore_flags(self):
        _,c,_=self.exercise(); self.assertFalse(any('--clean' in x or '--create' in x for x in c))
    def test_canonical_order(self): self.assertEqual(a.canonical(b'{"b":2,"a":1}'),a.canonical(b'{"a":1,"b":2}'))

if __name__=='__main__': unittest.main()
