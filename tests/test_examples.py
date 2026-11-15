import copy
import json
from pathlib import Path
import unittest

from lesson_examples import validate_examples


class NetworkGroupTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[1]
        examples = json.loads((root / 'interactive-examples.json').read_text(encoding='utf-8'))
        self.examples = {'d1-addresses': copy.deepcopy(examples['d1-addresses'])}
        self.topic_ids = ['d1-addresses', 'd2-hop']
        self.group = self.examples['d1-addresses']['diagram']['groups'][0]

    def test_authored_server_group_is_valid(self):
        validate_examples(self.examples, self.topic_ids)

    def test_missing_label_is_rejected(self):
        del self.group['label']
        with self.assertRaisesRegex(AssertionError, 'group label missing'):
            validate_examples(self.examples, self.topic_ids)

    def test_invalid_bounds_are_rejected(self):
        for field, value in [('x', -1), ('y', -1), ('width', 0), ('height', 0), ('width', 801), ('height', 366)]:
            with self.subTest(field=field, value=value):
                original = self.group[field]
                self.group[field] = value
                with self.assertRaisesRegex(AssertionError, 'group outside canvas'):
                    validate_examples(self.examples, self.topic_ids)
                self.group[field] = original


if __name__ == '__main__':
    unittest.main()
