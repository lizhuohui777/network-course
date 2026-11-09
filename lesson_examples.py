"""Validate authored examples and attach their shared controls to stable topics."""
from html import escape
import re

KINDS = {'network', 'blocks', 'chart'}
STATUS = {'received', 'acked', 'missing', 'buffered', 'duplicate'}


def validate_examples(examples, topic_ids):
    assert set(examples) == set(topic_ids) - {'d2-hop'}, 'Every topic needs an example; d2-hop keeps its dedicated ARP diagram'
    for topic_id, example in examples.items():
        assert all(example.get(k) for k in ('title', 'intro', 'terms', 'limit', 'references')), topic_id
        assert all(url.startswith('https://') for url in example['references']), topic_id
        assert len(example['cases']) >= 2, (topic_id, 'need a meaningful comparison')
        for case in example['cases']:
            config = case.get('diagram', example['diagram'])
            kind = config['kind']
            assert kind in KINDS and case['assumption'] and case['label'], topic_id
            assert 3 <= len(case['steps']) <= 8, (topic_id, case['label'])
            nodes = {n['id'] for n in config.get('nodes', [])}
            if kind == 'network':
                assert 2 <= len(nodes) == len(config['nodes']) <= 5, topic_id
                assert all(n['label'] and n['kind'] for n in config['nodes']), topic_id
            for step in case['steps']:
                assert step['title'] and len(step['text']) >= 25, (topic_id, step['title'])
                if kind == 'network':
                    assert set(step['active']) <= nodes and set(step['states']) <= nodes, topic_id
                    for flow in step['flows']:
                        assert flow['from'] in nodes and flow['to'] in nodes and flow['from'] != flow['to'], topic_id
                        assert flow['label'] and flow['tone'] in ('normal', 'warning', 'blocked'), topic_id
                elif kind == 'blocks':
                    rows = step.get('rows', config['rows'])
                    cells = [c for row in rows for c in row['cells']]
                    ids = {c['id'] for c in cells}
                    assert len(ids) == len(cells) and all(c['text'] for c in cells), topic_id
                    assert set(step.get('statuses', {})) <= ids, topic_id
                    assert set(step.get('statuses', {}).values()) <= STATUS, topic_id
                    assert set(step['active']) <= ids, topic_id
                else:
                    assert config['xMax'] > 0 and config['yMax'] > 0, topic_id
                    points = step['points']
                    assert points and all(0 <= x <= config['xMax'] and 0 <= y <= config['yMax'] for x, y in points), topic_id
                    assert all(points[i][0] < points[i+1][0] for i in range(len(points)-1)), topic_id


def figure(topic_id, example):
    title = escape(example['title'])
    buttons = ''.join(f'<button type="button" data-example-case="{i}" aria-pressed="{str(i == 0).lower()}">{escape(c["label"])}</button>' for i, c in enumerate(example['cases']))
    refs = ''.join(f'<li><a href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{escape(url.removeprefix("https://"))}</a></li>' for url in example['references'])
    first = example['cases'][0]
    return f'''<figure class="guided-example" id="example-{topic_id}" data-example="{topic_id}">
<div class="ex-heading"><h4>{title}</h4><span class="ex-count">1 / {len(first['steps'])}</span></div>
<p class="ex-intro">{escape(example['intro'])}</p>
<div class="ex-case-controls" aria-label="选择示例情形">{buttons}</div>
<p class="ex-assumption">{escape(first['assumption'])}</p>
<div class="ex-controls"><button type="button" data-example-previous disabled>上一步</button><button type="button" class="primary" data-example-next>下一步 →</button><button type="button" data-example-reset>重新演示</button></div>
<div class="ex-canvas" tabindex="0" aria-label="机制示意图，可在窄窗口横向滚动"></div>
<div class="ex-explanation" aria-live="polite" aria-atomic="true"><strong class="ex-step-title">{escape(first['steps'][0]['title'])}</strong><p class="ex-step-text">{escape(first['steps'][0]['text'])}</p><div class="ex-values"></div></div>
<details class="ex-transcript"><summary>展开本例全部步骤</summary><ol class="ex-all-steps"></ol></details>
<figcaption><details><summary>图示条件与参考</summary><p>{escape(example['terms'])}</p><p>{escape(example['limit'])}</p><ul>{refs}</ul></details></figcaption>
</figure>'''


def enrich(html, examples):
    pattern = r'(<article\b[^>]*\bid="([^"]+)"[^>]*\bdata-topic="[^"]+"[^>]*>)(.*?)(</article>)'
    seen = set()
    def attach(match):
        topic_id = match[2]
        if topic_id not in examples:
            return match[0]
        seen.add(topic_id)
        body = match[3]
        marker = f'<!-- EXAMPLE:{topic_id} -->'
        assert body.count(marker) == 1, (topic_id, 'need one authored example position after prerequisites')
        body = body.replace(marker, figure(topic_id, examples[topic_id]))
        return match[1] + body + match[4]
    enriched = re.sub(pattern, attach, html, flags=re.S)
    expected = {key for key in examples if f'id="{key}"' in html}
    assert seen == expected, ('missing example attachment', expected-seen)
    assert '<!-- EXAMPLE:' not in enriched, 'Unresolved or misplaced example marker'
    return enriched
