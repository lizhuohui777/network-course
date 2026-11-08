const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../state.js');
const catalog = { courseId: 'network-foundations-12', fieldKeys: new Set(['d1-q1-answer', 'd1-exit-note', 'd1-topic-note', 'd1-exit-check']), fieldTypes: new Map([['d1-q1-answer', 'string'], ['d1-exit-note', 'string'], ['d1-topic-note', 'string'], ['d1-exit-check', 'boolean']]), ratingKeys: new Set(['d1-q1']), topicIds: new Set(['d1-topic']) };
test('formal unlocks exactly the next day and review does not mark completion', () => {
  const formal = state.create(catalog.courseId);
  assert.equal(state.canOpen(2, formal), false);
  assert.equal(state.complete(2, formal), false);
  for (let day = 1; day <= 12; day++) {
    assert.equal(state.unlocked(formal), day);
    assert.equal(state.complete(day, formal), true);
  }
  assert.deepEqual(formal.completed, Array.from({ length: 12 }, (_, i) => i + 1));
  const review = state.create(catalog.courseId, 'review');
  assert.equal(state.canOpen(12, review), true);
  assert.equal(state.complete(1, review), false);
  assert.deepEqual(review.completed, []);
});
test('record round trip preserves notes, quiz answers and per-day timing', () => {
  const original = state.create(catalog.courseId);
  original.completed = [1]; original.day = 2;
  original.fields = { 'd1-q1-answer': '解释与例子', 'd1-topic-note': '第一段\n\n<b>纯文本</b>', 'd1-exit-check': true };
  original.ratings['d1-q1'] = 'partial';
  original.timing[1].main = 12345; original.timing[2].quiz = 6789;
  original.ui = { phase: 'quiz', studyMode: true, noteTopic: 'd1-topic' };
  assert.deepEqual(state.normalize(JSON.parse(JSON.stringify(original)), catalog, 'study'), original);
});
test('rejects development records, corrupt progress and wrong course', () => {
  const current = state.create(catalog.courseId);
  assert.throws(() => state.normalize({ ...current, schema: 1 }, catalog, 'study'));
  assert.throws(() => state.normalize({ ...current, mode: 'review' }, catalog, 'study'));
  assert.throws(() => state.normalize({ ...current, completed: [1, 3] }, catalog, 'study'));
  assert.throws(() => state.normalize({ ...current, courseId: 'other' }, catalog, 'study'));
});
test('import cannot unlock a hidden chapter through current day or invalid fields', () => {
  const original = state.create(catalog.courseId); original.day = 12;
  original.fields = { 'd1-q1-answer': true, 'd1-exit-check': 'true', unknown: 'ignore', 'd1-topic-note': '保留' };
  const clean = state.normalize(original, catalog, 'study');
  assert.equal(clean.day, 1); assert.deepEqual(clean.fields, { 'd1-topic-note': '保留' });
  assert.equal(state.canOpen(NaN, clean), false); assert.equal(state.canOpen(13, clean), false);
});
