"""Validate all lessons and build dependency-free study and review pages."""
import argparse
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class LessonInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.topics = []
        self.quizzes = []
        self.exits = []
        self.phases = []
        self.figures = 0
        self.forbidden = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if 'data-topic' in attrs:
            self.topics.append((attrs.get('id'), attrs['data-topic'], attrs.get('data-sources', '').split(',')))
        if 'data-quiz' in attrs:
            self.quizzes.append(attrs['data-quiz'])
        if tag == 'input' and attrs.get('type') == 'checkbox' and 'data-save' in attrs:
            self.exits.append(attrs['data-save'])
        if 'data-phase' in attrs:
            self.phases.append(attrs['data-phase'])
        if tag == 'figure':
            self.figures += 1
        if tag in ('script', 'iframe'):
            self.forbidden.append(tag)


def validate(course):
    assert len(course['days']) == 12
    mapped = [qid for day in course['days'] for qid in day['ids']]
    assert len(mapped) == len(set(mapped)) == 105
    assert set(mapped) == set(map(str, range(1, 105))) | {'S1'}
    lesson_sources = []
    all_topics = []
    for day in course['days']:
        n = day['day']
        path = ROOT / 'lessons' / f'lesson-{n:02}.html'
        html = path.read_text()
        parser = LessonInspector()
        parser.feed(html)
        assert not parser.forbidden, (path, 'executable lesson content')
        assert not [key for key, count in Counter(parser.ids).items() if count > 1], (path, 'duplicate id')
        assert len(parser.topics) >= 3 and len(parser.quizzes) == 5 and len(parser.exits) == 3, path
        assert parser.phases == ['recall', 'main', 'quiz', 'close'], (path, parser.phases)
        assert parser.figures >= 2, (path, 'missing mechanism diagrams')
        sources = [qid.strip() for _, _, ids in parser.topics for qid in ids]
        assert len(sources) == len(set(sources)) and set(sources) == set(day['ids']), (path, sources)
        assert len(re.findall(r'[\u4e00-\u9fff]', re.sub(r'<[^>]*>', '', html))) >= 1800, (path, 'insufficient lesson content')
        assert 'data-day-sources' in html and html.count('data-topic-sources') == len(parser.topics), path
        for topic, _, _ in parser.topics:
            assert topic.startswith(f'd{n}-'), topic
            all_topics.append(topic)
        assert all(q.startswith(f'd{n}-q') for q in parser.quizzes), path
        assert all('#' in course['questions'][qid]['url'] for qid in day['ids']), (path, 'source anchor missing')
        assert sum(day['budget']) == 90
        lesson_sources.append(f'<template id="lesson-{n:02}" data-day="{n}">\n{html}\n</template>')
    assert len(all_topics) == len(set(all_topics))
    return '\n'.join(lesson_sources)


def assemble(course, lessons, mode):
    html = (ROOT / 'template.html').read_text()
    for block in ('REDIRECT', 'NOTICE'):
        start, end = f'<!-- SOURCE_ONLY_{block}_START -->', f'<!-- SOURCE_ONLY_{block}_END -->'
        assert html.count(start) == html.count(end) == 1
        before, _, remaining = html.partition(start)
        _, _, after = remaining.partition(end)
        html = before.rstrip(' \t') + after
    assert 'http-equiv="refresh"' not in html
    replacements = {
        '/* MODE */': mode,
        '/* STYLES */': (ROOT / 'style.css').read_text(),
        '/* COURSE_DATA */': json.dumps(course, ensure_ascii=False).replace('<', '\\u003c'),
        '<!-- LESSON_TEMPLATES -->': lessons,
        '/* STATE */': (ROOT / 'state.js').read_text(),
        '/* APP */': (ROOT / 'app.js').read_text(),
    }
    for marker, text in replacements.items():
        assert html.count(marker) == 1, marker
        html = html.replace(marker, text)
    return html


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--check', action='store_true', help='Fail if generated pages are stale')
    options = args.parse_args()
    course = json.loads((ROOT / 'curriculum.json').read_text())
    lessons = validate(course)
    for filename, mode in [('index.html', 'study'), ('review.html', 'review')]:
        html = assemble(course, lessons, mode)
        path = ROOT / filename
        if options.check:
            assert path.exists() and path.read_text() == html, f'{filename} needs rebuilding'
        else:
            path.write_text(html)
        print(f'{filename}: 12 lessons, 105 source entries, {len(html.encode()):,} bytes')


if __name__ == '__main__':
    main()
