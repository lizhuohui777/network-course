"""Assemble the authoritative shared template, lesson, styles and course data."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'curriculum.json').read_text())
ids = [q for day in data['days'] for q in day['ids']]
expected = set(map(str, range(1, 105))) | {'S1'}
assert len(ids) == len(set(ids)) == 105 and set(ids) == expected
assert len(data['days']) == 12
assert all(sum(day['budget']) == 90 for day in data['days'])
html = (ROOT / 'template.html').read_text()
replacements = {
    '/* STYLES */': (ROOT / 'style.css').read_text(),
    '/* COURSE_DATA */': json.dumps(data, ensure_ascii=False).replace('<', '\\u003c'),
    '/* LESSON_01 */': (ROOT / 'lesson-01.html').read_text(),
    '/* APP */': (ROOT / 'app.js').read_text(),
}
for marker, content in replacements.items():
    assert html.count(marker) == 1, marker
    html = html.replace(marker, content)
(ROOT / 'index.html').write_text(html)
print(f'Built index.html ({len(html.encode()):,} bytes); 12 days; 105 unique entries; version {data["version"]}')
