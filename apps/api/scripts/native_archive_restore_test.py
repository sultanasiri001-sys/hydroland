import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import native_archive_restore as operator


class OperatorGuards(unittest.TestCase):
    def setUp(self):
        self.config = {
            'recoveryUrl': 'postgresql://fixture:NOT_A_LIVE_CREDENTIAL@' + operator.RECOVERY + '/' + operator.ORIGINAL,
            'archiveUrl': 'https://backups.render.com/db/' + operator.SOURCE + '/2026-10-24T15:26Z.dir.tar.gz?auth=fixture-only',
            'archiveSha256': operator.HASH,
        }

    def test_exact_existing_recovery_scope(self):
        self.assertEqual(operator.validate(self.config).hostname, operator.RECOVERY)

    def test_production_target_refused(self):
        self.config['recoveryUrl'] = self.config['recoveryUrl'].replace(operator.RECOVERY, operator.SOURCE)
        with self.assertRaises(ValueError): operator.validate(self.config)

    def test_existing_database_name_is_fixed(self):
        self.config['recoveryUrl'] = self.config['recoveryUrl'].replace(operator.ORIGINAL, 'hydroland')
        with self.assertRaises(ValueError): operator.validate(self.config)

    def test_missing_authentication_refused(self):
        self.config['recoveryUrl'] = 'postgresql://fixture@' + operator.RECOVERY + '/' + operator.ORIGINAL
        with self.assertRaises(ValueError): operator.validate(self.config)

    def test_unexpected_port_refused(self):
        self.config['recoveryUrl'] = self.config['recoveryUrl'].replace('/' + operator.ORIGINAL, ':10000/' + operator.ORIGINAL)
        with self.assertRaises(ValueError): operator.validate(self.config)

    def test_untrusted_archive_destination_refused(self):
        self.config['archiveUrl'] = self.config['archiveUrl'].replace('backups.render.com', 'example.invalid')
        with self.assertRaises(ValueError): operator.validate(self.config)

    def test_other_archive_or_hash_refused(self):
        for field, value in [('archiveUrl', self.config['archiveUrl'].replace(operator.SOURCE, operator.RECOVERY)), ('archiveSha256', '0' * 64)]:
            config = copy.deepcopy(self.config); config[field] = value
            with self.assertRaises(ValueError): operator.validate(config)

    def test_extra_execution_options_refused(self):
        self.config['overwrite'] = True
        with self.assertRaises(ValueError): operator.validate(self.config)

    def test_confirmation_and_service_checked_before_private_input(self):
        for argv, environment in [(['operator'], {'RENDER_SERVICE_ID': operator.SERVICE}), (['operator', '--confirmed-isolated'], {'RENDER_SERVICE_ID': 'other-service'})]:
            with patch.object(sys, 'argv', argv), patch.dict(operator.os.environ, environment, clear=True), patch.object(sys.stdin, 'readline', side_effect=AssertionError('Private input must not be read')):
                with self.assertRaises(ValueError): operator.main()

    def test_executed_operator_and_sanitized_evidence_remain_bound(self):
        root = Path(__file__).resolve().parents[3]
        proof = json.loads((root / 'docs/evidence/native-production-archive-restore-2026-10-24.json').read_text())
        self.assertEqual(proof['operatorScriptSha256'], hashlib.sha256(Path(operator.__file__).read_bytes()).hexdigest())
        self.assertTrue(proof['nativeLogicalRestoreVerified'])
        self.assertTrue(proof['originalRecoveryDatabaseUnchanged'])
        self.assertTrue(proof['negativeControlDetected'])
        self.assertEqual(len(proof['targets']), 2)
        self.assertEqual(proof['targets'][0]['snapshotSha256'], proof['targets'][1]['snapshotSha256'])
        self.assertFalse(proof['providerPitrVerified'])
        self.assertFalse(proof['cutoverPerformed'])


if __name__ == '__main__':
    unittest.main()
