(() => {
  'use strict';
  const course = JSON.parse(document.getElementById('course-data').textContent);
  const lessonHTML = document.getElementById('lesson-01').innerHTML;
  const $ = id => document.getElementById(id);
  const KEY = 'network-foundations-12:learner:v1';
  const phases = { recall: '回忆', main: '主线', quiz: '自测', close: '收尾' };
  const topicCatalog = [...document.querySelectorAll('template[id^="lesson-"]')].flatMap(template => [...template.content.querySelectorAll('.topic[id][data-topic]')].map(topic => ({ id: topic.id, title: topic.dataset.topic })));
  const noteKey = id => `${id}-note`;
  const fresh = () => ({ schema: 1, courseId: course.id, fields: {}, ratings: {}, completed: [], timing: { recall: 0, main: 0, quiz: 0, close: 0 }, ui: { phase: 'recall', studyMode: false, noteTopic: topicCatalog[0]?.id || '' } });
  const allowedFields = new Set([...document.getElementById('lesson-01').content.querySelectorAll('[data-save]')].map(el => el.dataset.save));
  for (let i = 1; i <= 5; i++) allowedFields.add(`d1-q${i}-answer`);
  allowedFields.add('feedback-draft');
  topicCatalog.forEach(topic => allowedFields.add(noteKey(topic.id)));
  const allowedRatings = new Set(['d1-client-server', 'd1-layers', 'd1-addresses', ...Array.from({ length: 5 }, (_, i) => `d1-q${i + 1}`)]);
  function cleanState(raw) {
    if (!raw || raw.schema !== 1 || raw.courseId !== course.id) throw Error('这不是本课程的学习记录。');
    const next = fresh();
    for (const [k, v] of Object.entries(raw.fields || {})) if (allowedFields.has(k) && (typeof v === 'boolean' || typeof v === 'string' && v.length <= 20000)) next.fields[k] = v;
    for (const [k, v] of Object.entries(raw.ratings || {})) if (allowedRatings.has(k) && ['understood', 'partial', 'review'].includes(v)) next.ratings[k] = v;
    if (Array.isArray(raw.completed)) next.completed = [...new Set(raw.completed.filter(x => Number.isInteger(x) && x >= 1 && x <= 12))];
    for (const k of Object.keys(phases)) if (Number.isFinite(raw.timing?.[k]) && raw.timing[k] >= 0 && raw.timing[k] < 31536000000) next.timing[k] = raw.timing[k];
    if (Object.hasOwn(phases, raw.ui?.phase)) next.ui.phase = raw.ui.phase;
    if (typeof raw.ui?.studyMode === 'boolean') next.ui.studyMode = raw.ui.studyMode;
    if (topicCatalog.some(topic => topic.id === raw.ui?.noteTopic)) next.ui.noteTopic = raw.ui.noteTopic;
    return next;
  }
  let state = fresh(), persistent = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = cleanState(JSON.parse(raw)); } catch { persistent = false; }
  let currentDay = 1, currentView = 'lesson', running = false, startedAt = 0, phase = state.ui.phase, encap = 0, feedbackTopic = '', feedbackTopicLabel = '', toastTimeout;
  let studyMode = state.ui.studyMode, notesOpen = false, selectedNoteTopic = state.ui.noteTopic, lastNotesTrigger = null;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatTime = ms => { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
  const totalTime = () => Object.values(state.timing).reduce((a, b) => a + b, 0);
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; } catch { persistent = false; }
    $('storage-warning').hidden = persistent;
  }
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 4200); }
  function currentTopics() {
    return [...document.querySelectorAll('#day-content .topic[id][data-topic]')].map(topic => ({ id: topic.id, title: topic.dataset.topic }));
  }
  function readingAnchor() {
    const nodes = [...document.querySelectorAll('.hero, #d1-warmup, #d1-main > .section-heading, #d1-main .topic, #d1-quiz, #d1-close')];
    const element = nodes.find(node => node.getBoundingClientRect().bottom > 110);
    return element ? { element, top: element.getBoundingClientRect().top } : null;
  }
  function restoreReadingAnchor(anchor) {
    if (anchor) requestAnimationFrame(() => { if (anchor.element.isConnected) window.scrollBy(0, anchor.element.getBoundingClientRect().top - anchor.top); });
  }
  function renderStudyUI() {
    const available = currentView === 'lesson' && currentDay === 1;
    document.body.classList.toggle('study-mode', studyMode && available);
    document.body.classList.toggle('notes-open', notesOpen && available);
    $('study-toolbar').hidden = !(studyMode && available);
    $('topic-notes').hidden = !(notesOpen && available);
    $('notes-backdrop').hidden = !(notesOpen && available);
    $('study-mode-toggle').disabled = !available;
    $('study-mode-toggle').setAttribute('aria-pressed', String(studyMode && available));
    $('notes-toggle').setAttribute('aria-expanded', String(notesOpen && available));
    $('study-day-label').textContent = `第${currentDay}天`;
    document.querySelectorAll('[data-note]').forEach(button => button.setAttribute('aria-expanded', String(notesOpen && button.dataset.note === selectedNoteTopic)));
  }
  function setStudyMode(enabled) {
    if (enabled && (currentView !== 'lesson' || currentDay !== 1)) return;
    const anchor = readingAnchor();
    studyMode = enabled;
    if (!enabled) notesOpen = false;
    state.ui.studyMode = enabled;
    save(); renderStudyUI(); restoreReadingAnchor(anchor);
  }
  function visibleTopicId() {
    const topics = [...document.querySelectorAll('#day-content .topic')];
    const visible = topics.find(topic => { const rect = topic.getBoundingClientRect(); return rect.bottom > 120 && rect.top < window.innerHeight; });
    return visible?.id || selectedNoteTopic || topics[0]?.id;
  }
  function renderNotes() {
    const topics = currentTopics();
    if (!topics.some(topic => topic.id === selectedNoteTopic)) selectedNoteTopic = topics[0]?.id || '';
    $('notes-topic-select').innerHTML = topics.map((topic, i) => `<option value="${esc(topic.id)}">${String(i + 1).padStart(2, '0')} · ${esc(topic.title)}</option>`).join('');
    $('notes-topic-select').value = selectedNoteTopic;
    const note = state.fields[noteKey(selectedNoteTopic)];
    $('topic-note-editor').value = typeof note === 'string' ? note : '';
    $('topic-note-status').textContent = persistent ? note ? '已保存到此浏览器' : '输入后自动保存' : '保存失败，请复制备份';
    state.ui.noteTopic = selectedNoteTopic;
  }
  function openNotes(topicId, trigger) {
    if (!currentTopics().length) return;
    const anchor = readingAnchor();
    selectedNoteTopic = currentTopics().some(topic => topic.id === topicId) ? topicId : visibleTopicId();
    lastNotesTrigger = trigger || document.activeElement;
    notesOpen = true;
    renderNotes(); save(); renderStudyUI(); restoreReadingAnchor(anchor);
    $('topic-note-editor').focus({ preventScroll: true });
  }
  function closeNotes() {
    const anchor = readingAnchor();
    notesOpen = false; renderStudyUI(); restoreReadingAnchor(anchor);
    if (lastNotesTrigger?.isConnected) lastNotesTrigger.focus({ preventScroll: true });
  }
  function changePhase(nextPhase) {
    if (!Object.hasOwn(phases, nextPhase)) return;
    tick(); phase = nextPhase; state.ui.phase = nextPhase;
    save(); renderTimer();
  }
  function toggleTimer() {
    if (currentDay !== 1) return;
    if (running) pauseTimer();
    else { running = true; startedAt = Date.now(); renderTimer(); }
  }
  async function copyTopicNote() {
    const text = $('topic-note-editor').value;
    if (!text.trim()) { $('topic-note-status').textContent = '先写下这条笔记'; return; }
    const topic = currentTopics().find(item => item.id === selectedNoteTopic);
    try {
      await navigator.clipboard.writeText(`第${currentDay}天 · ${topic?.title || '学习笔记'}\n\n${text}`);
      $('topic-note-status').textContent = '笔记已复制';
    } catch {
      $('topic-note-editor').focus(); $('topic-note-editor').select();
      $('topic-note-status').textContent = '已选中文字，请手动复制';
    }
  }
  function renderNav() {
    $('day-nav').innerHTML = course.days.map(day => `${day.day === 1 || day.day === 7 ? `<div class="week-label">第${day.week}周</div>` : ''}<button class="day-button ${currentDay === day.day && currentView === 'lesson' ? 'active' : ''} ${state.completed.includes(day.day) ? 'done' : ''}" data-day="${day.day}" ${currentDay === day.day && currentView === 'lesson' ? 'aria-current="page"' : ''}><span class="day-number">${state.completed.includes(day.day) ? '✓' : String(day.day).padStart(2, '0')}</span><span class="day-copy">${esc(day.title)}</span></button>${day.day === 6 || day.day === 12 ? '<div class="rest-label">休息日</div>' : ''}`).join('');
    $('progress-label').textContent = `${state.completed.length} / 12`;
    $('course-progress').value = state.completed.length;
  }
  function sourceItems(ids) {
    return ids.map(id => `<a href="${esc(course.questions[id].url)}" target="_blank" rel="noopener noreferrer"><span>${id === 'S1' ? '补充' : '#' + id}</span><span>${esc(course.questions[id].label)}</span></a>`).join('');
  }
  function planCard(day, linked = true) {
    return `<article class="card plan-card">${linked ? `<div class="plan-top"><small class="eyebrow">第${day.day}天</small><h2>${esc(day.title)}</h2></div>` : ''}<ul>${day.goals.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${linked ? '' : `<h3>练习</h3><p>${esc(day.exit)}</p>`}<details><summary>原题与参考资料</summary><div class="source-items">${sourceItems(day.ids)}</div></details>${linked ? `<button class="open-day" data-day="${day.day}">${day.day === 1 ? '开始学习' : '查看安排'} →</button>` : ''}</article>`;
  }
  function renderRoadmap() {
    $('roadmap-view').innerHTML = `<div class="roadmap-intro"><h1>12天路线</h1></div>${course.days.map(d => `${d.day === 1 || d.day === 7 ? `<h2 class="week-banner">第${d.week}周</h2>` : ''}${planCard(d)}${d.day === 6 || d.day === 12 ? '<div class="week-banner">休息日</div>' : ''}`).join('')}`;
  }
  function renderGuide() {
    $('guide-view').innerHTML = `<div class="roadmap-intro"><h1>使用说明</h1></div><section class="card"><h2>学习安排</h2><p>两周共12个学习日，每周学习6天、休息1天。目前开放第1天。</p><div class="table-wrap"><table class="data-table"><thead><tr><th>环节</th><th>建议用时</th></tr></thead><tbody><tr><td>回忆检查</td><td>10分钟</td></tr><tr><td>今日主线</td><td>55分钟</td></tr><tr><td>理解自测</td><td>20分钟</td></tr><tr><td>收尾记录</td><td>5分钟</td></tr></tbody></table></div><p style="margin-top:18px">计时归类需手动选择。开始后，用时计入所选类别；切换时先结算上一段。它不会识别阅读位置或自动切换课程。切到后台会暂停，回来后手动继续。</p></section><section class="card"><h2>学习模式与笔记</h2><p>点击“学习模式”收起两侧栏；顶部保留计时、笔记和退出按钮。每个知识点标题旁的“笔记”可打开对应记录，也能在笔记栏切换知识点。</p><p>笔记支持复制粘贴文本，输入后自动保存在当前浏览器，并包含在导出的学习记录中。按Esc先收起笔记，再次按Esc退出学习模式。</p></section><section class="card"><h2>遇到没懂的地方</h2><ol><li>点击“这里还没懂”，写下你的疑问。</li><li>点击复制，把问题粘贴到我们的聊天中发送。</li><li>先答疑；需要补进课件时，我会提出修改建议，等你同意后更新。</li></ol><p>也可以直接在聊天中提问。</p></section><section class="card"><h2>保存与备份</h2><p>回答、笔记和自评保存在当前浏览器。换浏览器或清理数据前，使用页尾的“导出学习记录”备份；之后可以导入恢复。</p><p>网页里的记录需要复制或导出后，才能在聊天中提供给我。</p></section>`;
  }
  function ratingsMarkup(id, quiz = false) {
    const labels = quiz ? ['能独立解释', '只答对部分', '需要重学'] : ['已理解', '有点模糊', '需要补充'];
    return ['understood', 'partial', 'review'].map((value, i) => `<button data-rate="${id}" data-value="${value}" aria-pressed="${state.ratings[id] === value}">${labels[i]}</button>`).join('');
  }
  function hydrateLesson() {
    document.querySelectorAll('[data-topic-rating]').forEach(el => { el.innerHTML = ratingsMarkup(el.dataset.topicRating); });
    document.querySelectorAll('[data-quiz]').forEach(el => {
      const id = el.dataset.quiz;
      el.querySelector('.quiz-input').innerHTML = `<label class="inline-label" for="${id}-answer">我的回答</label><textarea id="${id}-answer" data-save="${id}-answer" rows="3" placeholder="先写自己的理解，再展开解释。"></textarea>`;
      el.querySelector('.quiz-rating').innerHTML = `<div class="rating-group">${ratingsMarkup(id, true)}</div>`;
    });
    document.querySelectorAll('[data-save]').forEach(el => {
      const value = state.fields[el.dataset.save];
      if (el.type === 'checkbox') el.checked = Boolean(value); else el.value = value == null ? '' : String(value);
    });
    $('day-source-map').innerHTML = sourceItems(course.days[0].ids);
    $('day-references').innerHTML = `<ul>${course.references.slice(1).map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a></li>`).join('')}<li><a href="https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml" target="_blank" rel="noopener noreferrer">IANA：TCP/UDP端口0的保留状态</a></li><li><a href="https://www.rfc-editor.org/rfc/rfc9114.html#section-2" target="_blank" rel="noopener noreferrer">RFC 9114：HTTP/3与QUIC</a></li></ul>`;
    encap = 0;
    updateQuizSummary(); updateCompletion();
  }
  function showView(view) {
    if (view !== 'lesson') { pauseTimer(); setStudyMode(false); }
    currentView = view;
    ['lesson', 'roadmap', 'guide'].forEach(v => { $(`${v}-view`).hidden = v !== view; });
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    document.querySelector('.study-tools').hidden = view !== 'lesson';
    renderNav();
    renderStudyUI();
  }
  function openDay(number, scroll = true) {
    if (number !== 1) setStudyMode(false);
    pauseTimer(); currentDay = number;
    const day = course.days.find(x => x.day === number);
    showView('lesson');
    $('day-label').textContent = `第${number}天`;
    $('lesson-title').textContent = day.title;
    $('lesson-meta').hidden = number === 1;
    $('lesson-meta').innerHTML = number === 1 ? '' : '<span class="chip">未开放</span>';
    if (number === 1) { $('day-content').innerHTML = lessonHTML; hydrateLesson(); }
    else $('day-content').innerHTML = `${planCard(day, false)}<button data-day="1">返回第1天</button>`;
    $('timer-toggle').disabled = number !== 1;
    $('phase-select').disabled = number !== 1;
    $('section-nav').hidden = number !== 1;
    renderNotes(); renderStudyUI();
    renderTimer();
    if (scroll) { window.scrollTo(0, 0); $('workspace').focus({ preventScroll: true }); }
  }
  function updateQuizSummary() {
    const el = $('quiz-summary'); if (!el) return;
    const scores = Array.from({ length: 5 }, (_, i) => state.ratings[`d1-q${i + 1}`]);
    el.hidden = !scores.some(Boolean);
    el.textContent = `自评：${scores.filter(x => x === 'understood').length}题能独立解释，${scores.filter(x => x === 'partial').length}题部分理解，${scores.filter(x => x === 'review').length}题需重学。`;
  }
  function updateCompletion() {
    const done = state.completed.includes(1);
    if ($('mark-complete')) $('mark-complete').textContent = done ? '撤销本日完成标记' : '标记本日完成';
    if ($('completion-note')) $('completion-note').textContent = done ? '本日已完成' : '';
  }
  function tick() {
    if (running) {
      const now = Date.now();
      state.timing[phase] += Math.max(0, now - startedAt);
      startedAt = now;
    }
  }
  function pauseTimer() { tick(); running = false; save(); renderTimer(); }
  function renderTimer() {
    if (!$('timer-display')) return;
    $('timer-display').textContent = currentDay === 1 ? formatTime(totalTime()) : '—';
    $('timer-toggle').textContent = running ? '暂停计时' : totalTime() > 0 ? '继续计时' : '开始计时';
    $('study-timer-display').textContent = formatTime(totalTime());
    $('study-timer-toggle').textContent = running ? '暂停' : totalTime() > 0 ? '继续' : '开始';
    for (const id of ['phase-select', 'study-phase-select']) if ($(id).value !== phase) $(id).value = phase;
    $('timer-hint').textContent = currentDay !== 1 ? '正文尚未制作，暂不计时' : totalTime() >= 5400000 ? '已用时90分钟' : '本日用时 / 90分钟';
    $('phase-times').innerHTML = currentDay === 1 ? Object.entries(phases).map(([k, v]) => `<span>${v} ${formatTime(state.timing[k])}</span>`).join('') : '';
  }
  const layerInfo = {
    application: ['应用层：先约定“说的是什么”。', '浏览器表达“我要这份资源”，服务器表达“这是结果”。它们需要能理解彼此的消息，而不是只收到一串没有含义的比特。'],
    transport: ['传输层：为应用端点提供运输服务。', '不同运输规则提供不同能力。TCP面向可靠、有序的字节流；UDP提供数据报传输，本身不保证可靠到达。端口属于传输层。'],
    network: ['网络层：跨网络寻找并转发到目标。', '数据可能经过多个网络。IP地址参与寻址，路由器根据转发信息决定下一步交到哪里。此处还不负责理解“我要首页”这句话。'],
    link: ['链路层：处理当前这段链路上的交付。', '例如电脑与接入设备之间的以太网或Wi-Fi链路。先把它和“跨多个网络到达最终目标”区分；实际路径可包含多段不同链路。'],
    physical: ['物理层：让比特有信号载体。', '数据最终要用实际信号传输，例如网线中的电信号、光纤中的光信号或无线电信号。不是一张抽象网页直接在空气里飞。']
  };
  function changeLayer(key) {
    const info = layerInfo[key];
    document.querySelectorAll('[data-layer]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.layer === key)));
    document.querySelectorAll('[data-stack]').forEach(el => el.classList.toggle('active', el.dataset.stack === key));
    $('layer-explanation').innerHTML = `<strong>${info[0]}</strong><p>${info[1]}</p>`;
  }
  function renderEnvelope() {
    const labels = ['应用请求数据', 'TCP首部 · 端口等信息', 'IP首部 · 源与目标地址', '链路控制信息 · 当前链路'];
    let html = `<div class="packet" data-level="0">${labels[0]}</div>`;
    for (let i = 1; i <= encap; i++) html = `<div class="packet"><span class="packet-label">${labels[i]}</span>${html}</div>`;
    $('encap-visual').innerHTML = html;
    $('encap-visual').setAttribute('aria-label', ['只有应用数据', 'TCP控制信息包住应用数据', 'IP控制信息包住TCP段', '链路控制信息承载IP数据报，内部有TCP信息和应用数据'][encap]);
    $('encap-step').textContent = `${encap} / 3`;
    $('encap-description').textContent = [
      '起点：应用已经组织好要交流的内容。',
      '传输层：TCP加入端口等控制信息。在这个简化示例里，形成承载应用数据的TCP段。',
      '网络层：IP加入源与目标地址等信息，承载上层的TCP段。IP负责自己的寻址与转发问题。',
      '链路层：形成适合当前链路传送的帧。接下来用物理信号承载比特；接收时再逐层处理。'
    ][encap];
    $('encap-next').disabled = encap === 3;
  }
  function openFeedback(topic) {
    tick();
    feedbackTopic = topic || '本日整体';
    const element = $(topic);
    feedbackTopicLabel = element?.dataset.topic || (topic === 'd1-close' ? '收尾与整体反馈' : '本日整体');
    $('feedback-context').textContent = `自动附上位置：第${currentDay}天 · ${feedbackTopicLabel} · v${course.version}`;
    const examples = {
      'd1-client-server': '例如：同一台计算机可以同时是客户端和服务器吗？',
      'd1-layers': '例如：我知道分层是分工，但还不明白封装具体加了什么。',
      'd1-addresses': '例如：IP已经找到服务器了，为什么还需要端口？'
    };
    $('feedback-note').placeholder = examples[topic] || '例如：我理解的是……，但不明白为什么……';
    $('feedback-note').value = state.fields['feedback-draft'] || '';
    $('feedback-note').removeAttribute('aria-invalid');
    $('feedback-error').hidden = true;
    $('feedback-preview').open = false;
    $('feedback-status').textContent = '';
    makeFeedback();
    $('feedback-dialog').showModal();
    $('feedback-note').focus();
  }
  function makeFeedback() {
    const labels = { understood: '能独立解释', partial: '部分理解', review: '需要重学' };
    const ratings = Array.from({ length: 5 }, (_, i) => {
      const value = state.ratings[`d1-q${i + 1}`];
      return value ? `Q${i + 1}=${labels[value]}` : '';
    }).filter(Boolean);
    const lines = [
      `课程：${course.title}`,
      `位置：第${currentDay}天 · ${feedbackTopicLabel} · v${course.version}`,
      `我的问题：${$('feedback-note').value.trim() || '（在上方写下问题后，这里会自动更新）'}`
    ];
    if (currentDay === 1 && totalTime() >= 1000) lines.push(`主动学习计时：${formatTime(totalTime())}`);
    if (currentDay === 1 && ratings.length) lines.push(`已填写的自测自评：${ratings.join('，')}`);
    lines.push('请用适合初学者的解释、图解或例子讲清，再用一道小问题检查我的理解。如果适合补进课件，请提出具体修改建议并询问我是否更新。');
    $('feedback-output').value = lines.join('\n');
  }
  async function copyFeedback() {
    if (!$('feedback-note').value.trim()) {
      $('feedback-error').hidden = false;
      $('feedback-note').setAttribute('aria-invalid', 'true');
      $('feedback-note').focus();
      return;
    }
    tick(); makeFeedback();
    try {
      await navigator.clipboard.writeText($('feedback-output').value);
      $('feedback-status').textContent = '已复制。回到我们的聊天输入框，粘贴后发送即可。';
    } catch {
      $('feedback-preview').open = true;
      $('feedback-output').focus(); $('feedback-output').select();
      $('feedback-status').textContent = '浏览器未允许自动复制。已选中整理好的文字，请手动复制，再粘贴到聊天输入框。';
    }
  }
  function exportData() {
    tick(); save();
    const data = { ...state, exportedAt: new Date().toISOString(), courseVersion: course.version };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'network-learning-record.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已导出当前记录。导入可恢复；如需我查看，请在会话中提供记录。');
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button, a[data-view]'); if (!target) return;
    if (target.dataset.view) { event.preventDefault(); showView(target.dataset.view); window.scrollTo(0, 0); }
    if (target.dataset.day) openDay(Number(target.dataset.day));
    if (target.dataset.layer) changeLayer(target.dataset.layer);
    if (target.dataset.port) {
      const port = target.dataset.port;
      document.querySelectorAll('[data-service]').forEach(el => el.classList.toggle('active', el.dataset.service === port));
      document.querySelectorAll('[data-port]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.port === port)));
      $('port-explanation').textContent = `目标为TCP的 198.51.100.20:${port}。${port === '443' ? '现在选择课程首页。' : '现在选择另一项服务。'}IP没变，目标端口变了。`;
    }
    if (target.dataset.feedback) openFeedback(target.dataset.feedback);
    if (target.dataset.note) openNotes(target.dataset.note, target);
    if (target.dataset.rate) {
      state.ratings[target.dataset.rate] = target.dataset.value;
      document.querySelectorAll('[data-rate]').forEach(el => { if (el.dataset.rate === target.dataset.rate) el.setAttribute('aria-pressed', String(el.dataset.value === target.dataset.value)); });
      save(); updateQuizSummary();
    }
    if (target.id === 'encap-next') { encap = Math.min(3, encap + 1); renderEnvelope(); }
    if (target.id === 'encap-reset') { encap = 0; renderEnvelope(); }
    if (target.id === 'feedback-open') openFeedback('本日整体');
    if (target.id === 'copy-feedback') copyFeedback();
    if (target.id === 'timer-toggle' || target.id === 'study-timer-toggle') toggleTimer();
    if (target.id === 'study-mode-toggle') setStudyMode(true);
    if (target.id === 'study-mode-exit') setStudyMode(false);
    if (target.id === 'notes-toggle') { if (notesOpen) closeNotes(); else openNotes(visibleTopicId(), target); }
    if (target.id === 'notes-close' || target.id === 'notes-backdrop') closeNotes();
    if (target.id === 'copy-topic-note') copyTopicNote();
    if (target.id === 'mark-complete') {
      if (state.completed.includes(1)) state.completed = state.completed.filter(x => x !== 1);
      else {
        const rated = Array.from({ length: 5 }, (_, i) => state.ratings[`d1-q${i + 1}`]).filter(Boolean).length;
        if (rated < 5) { toast('请先完成5题自评，或把未完成处标为“需要重学”。'); return; }
        state.completed.push(1); pauseTimer();
      }
      save(); renderNav(); updateCompletion();
    }
    if (target.id === 'export-data') exportData();
    if (target.id === 'print-page') window.print();
  });
  function saveField(event) {
    const el = event.target;
    if (!el.dataset.save) return;
    state.fields[el.dataset.save] = el.type === 'checkbox' ? el.checked : el.value;
    save();
  }
  document.addEventListener('input', saveField);
  document.addEventListener('change', saveField);
  for (const id of ['phase-select', 'study-phase-select']) $(id).addEventListener('change', event => changePhase(event.target.value));
  $('notes-topic-select').addEventListener('change', event => {
    selectedNoteTopic = event.target.value;
    renderNotes(); save(); renderStudyUI();
  });
  $('topic-note-editor').addEventListener('input', () => {
    if (!selectedNoteTopic) return;
    state.fields[noteKey(selectedNoteTopic)] = $('topic-note-editor').value;
    save();
    const message = persistent ? '已保存到此浏览器' : '保存失败，请复制备份';
    if ($('topic-note-status').textContent !== message) $('topic-note-status').textContent = message;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || $('feedback-dialog').open) return;
    if (notesOpen) closeNotes(); else if (studyMode) setStudyMode(false);
  });
  $('feedback-note').addEventListener('input', () => {
    state.fields['feedback-draft'] = $('feedback-note').value;
    $('feedback-error').hidden = true;
    $('feedback-note').removeAttribute('aria-invalid');
    $('feedback-status').textContent = '';
    save(); makeFeedback();
  });
  $('import-data').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 1000000) throw Error('记录文件过大，请选择本课件导出的JSON。');
      const imported = cleanState(JSON.parse(await file.text()));
      if (!window.confirm('导入将替换当前浏览器的本课程记录。建议先导出备份。继续吗？')) return;
      pauseTimer(); state = imported; phase = state.ui.phase; studyMode = state.ui.studyMode; selectedNoteTopic = state.ui.noteTopic; notesOpen = false;
      save(); openDay(currentDay, false); toast('学习记录已恢复。计时保持暂停。');
    } catch (error) { toast(`未导入：${error.message}`); }
    finally { event.target.value = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) pauseTimer(); });
  window.addEventListener('pagehide', pauseTimer);
  let ticks = 0;
  setInterval(() => { if (running) { tick(); renderTimer(); if (++ticks % 10 === 0) save(); } }, 1000);
  $('version').textContent = course.version;
  $('storage-warning').hidden = persistent;
  renderRoadmap(); renderGuide(); openDay(1, false);
})();
