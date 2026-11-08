"""Scan current project files and every reachable Git blob without printing matches."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
RULES = {
    'private-key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    'github-token': rb'\bgh[pousr]_[A-Za-z0-9]{30,}\b',
    'github-fine-grained-token': rb'\bgithub_pat_[A-Za-z0-9_]{60,}\b',
    'openai-key': rb'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}\b',
    'aws-access-key': rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    'credential-url': rb'https?://[^\s/:]+:[^\s/@]+@github\.com',
}
RULES = {name: re.compile(pattern) for name, pattern in RULES.items()}
findings = []


def scan(data, location):
    for name, pattern in RULES.items():
        if pattern.search(data):
            findings.append((location, name))


for path in ROOT.rglob('*'):
    rel = path.relative_to(ROOT)
    if any(part in {'.git', '.local', '__pycache__'} for part in rel.parts) or not path.is_file():
        continue
    scan(path.read_bytes(), str(rel))

objects = subprocess.check_output(['git', 'rev-list', '--objects', '--all'], cwd=ROOT).splitlines()
seen = set()
for line in objects:
    oid = line.split(b' ', 1)[0]
    if oid in seen:
        continue
    seen.add(oid)
    kind = subprocess.check_output(['git', 'cat-file', '-t', oid.decode()], cwd=ROOT).strip()
    if kind == b'blob':
        scan(subprocess.check_output(['git', 'cat-file', 'blob', oid.decode()], cwd=ROOT), 'git:' + oid.decode()[:12])

if findings:
    for location, rule in findings:
        print(f'Potential credential: {location} [{rule}]')
    sys.exit(1)
print(f'No supported credential patterns found in project files or {len(seen)} reachable Git objects.')
