(function (root) {
  'use strict';
  const PHASES = ['recall', 'main', 'quiz', 'close'];
  const TOTAL_DAYS = 12;
  const emptyTiming = () => Object.fromEntries(PHASES.map(phase => [phase, 0]));
  function create(courseId, mode = 'study') {
    return { schema: 2, courseId, mode, day: 1, completed: [], fields: {}, ratings: {}, timing: Object.fromEntries(Array.from({ length: TOTAL_DAYS }, (_, i) => [String(i + 1), emptyTiming()])), ui: { phase: 'recall', studyMode: false, noteTopic: '' } };
  }
  function unlocked(state) { return state.mode === 'review' ? TOTAL_DAYS : Math.min(TOTAL_DAYS, state.completed.length + 1); }
  function canOpen(day, state) { return Number.isInteger(day) && day >= 1 && day <= unlocked(state); }
  function complete(day, state) {
    if (state.mode !== 'study' || !canOpen(day, state)) return false;
    if (!state.completed.includes(day)) {
      if (day !== state.completed.length + 1) return false;
      state.completed.push(day);
    }
    return true;
  }
  function normalize(raw, catalog, mode) {
    if (!raw || raw.schema !== 2 || raw.courseId !== catalog.courseId) throw Error('请选择本版本导出的学习记录。');
    if (raw.mode !== mode) throw Error(mode === 'study' ? '检查记录不能作为正式学习进度导入。' : '请在正式学习页面导入这份学习记录。');
    const next = create(catalog.courseId, mode);
    if (!Array.isArray(raw.completed) || raw.completed.some((day, i) => day !== i + 1) || raw.completed.length > TOTAL_DAYS) throw Error('学习进度不连续，无法导入。');
    next.completed = mode === 'study' ? [...raw.completed] : [];
    for (const [key, value] of Object.entries(raw.fields || {})) {
      if (catalog.fieldKeys.has(key) && typeof value === catalog.fieldTypes.get(key) && (typeof value === 'boolean' || value.length <= 20000)) next.fields[key] = value;
    }
    for (const [key, value] of Object.entries(raw.ratings || {})) if (catalog.ratingKeys.has(key) && ['understood', 'partial', 'review'].includes(value)) next.ratings[key] = value;
    for (let day = 1; day <= TOTAL_DAYS; day++) for (const phase of PHASES) {
      const value = raw.timing?.[day]?.[phase];
      if (Number.isFinite(value) && value >= 0 && value < 31536000000) next.timing[day][phase] = value;
    }
    if (PHASES.includes(raw.ui?.phase)) next.ui.phase = raw.ui.phase;
    next.ui.studyMode = raw.ui?.studyMode === true;
    if (catalog.topicIds.has(raw.ui?.noteTopic)) next.ui.noteTopic = raw.ui.noteTopic;
    if (canOpen(raw.day, next)) next.day = raw.day;
    else next.day = unlocked(next);
    return next;
  }
  const api = Object.freeze({ create, normalize, unlocked, canOpen, complete, PHASES, TOTAL_DAYS });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CourseState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
