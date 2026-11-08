(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const course = JSON.parse($('course-data').textContent);
  const mode = document.body.dataset.courseMode;
  const review = mode === 'review';
  const model = window.CourseState;
  const templates = new Map([...document.querySelectorAll('template[data-day]')].map(template => [Number(template.dataset.day), template]));
  const topicCatalog = [...templates].flatMap(([day, template]) => [...template.content.querySelectorAll('.topic')].map(topic => ({ day, id: topic.id, title: topic.dataset.topic, sources: topic.dataset.sources.split(',').filter(Boolean) })));
  const noteKey = id => `${id}-note`;
  const catalog = { courseId: course.id, fieldKeys: new Set(['feedback-draft']), ratingKeys: new Set(), topicIds: new Set(topicCatalog.map(topic => topic.id)), fieldTypes: new Map([['feedback-draft', 'string']]) };
  for (const template of templates.values()) {
    template.content.querySelectorAll('[data-save]').forEach(el => { catalog.fieldKeys.add(el.dataset.save); catalog.fieldTypes.set(el.dataset.save, el.type === 'checkbox' ? 'boolean' : 'string'); });
    template.content.querySelectorAll('[data-quiz]').forEach(el => { catalog.fieldKeys.add(`${el.dataset.quiz}-answer`); catalog.fieldTypes.set(`${el.dataset.quiz}-answer`, 'string'); catalog.ratingKeys.add(el.dataset.quiz); });
    template.content.querySelectorAll('[data-topic-rating]').forEach(el => catalog.ratingKeys.add(el.dataset.topicRating));
  }
  topicCatalog.forEach(topic => { catalog.fieldKeys.add(noteKey(topic.id)); catalog.fieldTypes.set(noteKey(topic.id), 'string'); catalog.ratingKeys.add(topic.id); });
  const KEY = `network-foundations-12:${mode}:v2`;
  const phases = { recall: '回忆', main: '主线', quiz: '自测', close: '收尾' };
  let persistent = true, state = model.create(course.id, mode);
  try {
    localStorage.removeItem('network-foundations-12:learner:v1');
    const saved = localStorage.getItem(KEY);
    if (saved) state = model.normalize(JSON.parse(saved), catalog, mode);
  } catch { persistent = false; }
  let day = state.day, view = 'lesson', running = false, startedAt = 0, phase = state.ui.phase;
  let notesOpen = false, selectedTopic = state.ui.noteTopic, lastNotesTrigger = null, feedbackTopic = '', encap = 0, toastTimeout;
  let hopTarget = 'remote', hopStep = 0, hopAddresses = false;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = ms => { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
  const dayInfo = () => course.days.find(item => item.day === day);
  const topics = () => topicCatalog.filter(topic => topic.day === day);
  const elapsed = () => Object.values(state.timing[day]).reduce((a, b) => a + b, 0);
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; } catch { persistent = false; }
    $('storage-warning').hidden = persistent;
  }
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 4300); }
  function sourceItems(ids, compact = false) {
    return ids.map(id => { const item = course.questions[id]; return `<a class="source-chip" href="${esc(item.url)}" title="${esc(item.source_heading || item.label)}" target="_blank" rel="noopener noreferrer">${id === 'S1' ? '补充题' : '#' + id}${compact ? '' : ' ' + esc(item.label)}</a>`; }).join('');
  }
  function nav() {
    const unlocked = model.unlocked(state);
    $('day-nav').innerHTML = course.days.filter(item => review || item.day <= unlocked).map(item => `${item.day === 1 || item.day === 7 ? `<div class="week-label">第${item.week}周</div>` : ''}<button class="day-button ${day === item.day && view === 'lesson' ? 'active' : ''}" data-day="${item.day}" ${day === item.day && view === 'lesson' ? 'aria-current="page"' : ''}><span class="day-number">${state.completed.includes(item.day) ? '✓' : String(item.day).padStart(2, '0')}</span><span class="day-copy">${esc(item.title)}</span></button>${item.day === 6 || item.day === 12 ? '<div class="rest-label">休息日</div>' : ''}`).join('');
    $('progress-label').textContent = `${state.completed.length} / 12`;
    $('course-progress').value = state.completed.length;
    $('unlock-status').textContent = !review && unlocked < 12 ? `完成第${unlocked}天后，开放下一天` : '';
  }
  function planCard(item) {
    if (!model.canOpen(item.day, state)) return `<article class="card locked-day"><h2>第${item.day}天</h2><span>尚未解锁</span></article>`;
    return `<article class="card plan-card"><div class="plan-top"><small class="eyebrow">第${item.day}天</small><h2>${esc(item.title)}</h2></div><ul>${item.goals.map(goal => `<li>${esc(goal)}</li>`).join('')}</ul><details><summary>关联网站知识点</summary><div class="source-items">${sourceItems(item.ids)}</div></details><button data-day="${item.day}">打开课件 →</button></article>`;
  }
  function roadmap() { $('roadmap-view').innerHTML = `<div class="roadmap-intro"><h1>12天路线</h1></div>${course.days.map(item => `${item.day === 1 || item.day === 7 ? `<h2 class="week-banner">第${item.week}周</h2>` : ''}${planCard(item)}${item.day === 6 || item.day === 12 ? '<p class="week-banner">休息日</p>' : ''}`).join('')}`; }
  function guide() {
    const progressGuide = review ? '当前为编写检查，12天全部开放；检查完成后再启用逐日解锁。' : '正式学习按天解锁：完成5道自测并自评、勾选3项收尾检查后，可以标记本日完成并进入下一天。';
    $('guide-view').innerHTML = `<div class="roadmap-intro"><h1>使用说明</h1></div><section class="card"><h2>每天怎样学习</h2><p>回顾10分钟，图文主线55分钟，自测20分钟，收尾5分钟。每周六个学习日，留一天休息。</p><p>计时归类需手动选择；它只记录用时，不会判断掌握程度。切到后台会暂停。</p><p>${progressGuide}</p></section><section class="card"><h2>学习模式与笔记</h2><p>学习模式收起两侧栏。每个知识点的“笔记”打开独立记录，支持复制粘贴，输入后自动保存。按Esc先收起笔记，再退出学习模式。</p></section><section class="card"><h2>换电脑继续</h2><ol><li>把项目从GitHub拉到另一台电脑，打开index.html。</li><li>在当前电脑“导出学习记录”，把JSON文件带过去，再“导入学习记录”。</li><li>在另一台电脑继续同一聊天，或将拉下来的项目文件夹关联到新的本地项目。</li></ol><p>课件代码、浏览器学习记录和GPT聊天历史是三件不同的事，不会因同一个账户自动合并。没有文件访问权限时，用“导出本课交接”把当前内容与笔记提供给GPT。</p><p>编写检查记录与正式学习记录分开。</p></section>`;
  }
  function ratingButtons(id, quiz = false) {
    const labels = quiz ? ['能独立解释', '只答对部分', '需要重学'] : ['已理解', '有点模糊', '需要补充'];
    return ['understood', 'partial', 'review'].map((value, i) => `<button data-rate="${id}" data-value="${value}" aria-pressed="${state.ratings[id] === value}">${labels[i]}</button>`).join('');
  }
  function hydrate() {
    document.querySelectorAll('[data-topic-rating]').forEach(el => el.innerHTML = ratingButtons(el.dataset.topicRating));
    document.querySelectorAll('[data-quiz]').forEach(el => {
      const id = el.dataset.quiz;
      el.querySelector('.quiz-input').innerHTML = `<label class="inline-label" for="${id}-answer">我的回答</label><textarea id="${id}-answer" data-save="${id}-answer" maxlength="20000" rows="3" placeholder="写下你的理解"></textarea>`;
      el.querySelector('.quiz-rating').innerHTML = `<div class="rating-group">${ratingButtons(id, true)}</div>`;
    });
    document.querySelectorAll('#day-content [data-save]').forEach(el => { const value = state.fields[el.dataset.save]; if (el.type === 'checkbox') el.checked = value === true; else el.value = typeof value === 'string' ? value : ''; });
    document.querySelectorAll('[data-day-sources]').forEach(el => el.innerHTML = `<span>本课关联网站知识点</span><div class="source-row">${sourceItems(dayInfo().ids, true)}</div>`);
    document.querySelectorAll('#day-content .topic').forEach(topic => {
      topic.querySelector('[data-topic-sources]').innerHTML = `<span>对应网站知识点</span><div class="source-row">${sourceItems(topic.dataset.sources.split(','))}</div>`;
    });
    document.querySelectorAll('[data-day-references]').forEach(el => el.innerHTML = `<div class="source-items">${sourceItems(dayInfo().ids)}</div>`);
    document.querySelectorAll('#section-nav a').forEach((link, i) => link.href = `#d${day}-${['warmup', 'main', 'quiz', 'close'][i]}`);
    encap = 0; hopTarget = 'remote'; hopStep = 0; hopAddresses = false; renderHopDemo(); summary(); completion();
  }
  function showView(nextView) {
    if (nextView !== 'lesson') { pause(); setStudyMode(false); }
    view = nextView;
    ['lesson', 'roadmap', 'guide'].forEach(name => $(`${name}-view`).hidden = name !== view);
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    document.querySelector('.study-tools').hidden = view !== 'lesson';
    nav(); studyUI();
  }
  function openDay(nextDay, scroll = true) {
    if (!model.canOpen(nextDay, state)) { toast(`请先完成第${model.unlocked(state)}天。`); return; }
    pause();
    if (nextDay !== day) { phase = 'recall'; state.ui.phase = phase; notesOpen = false; }
    day = nextDay; state.day = day;
    showView('lesson');
    $('day-label').textContent = `第${day}天`;
    $('lesson-title').textContent = dayInfo().title;
    $('day-content').innerHTML = templates.get(day).innerHTML;
    hydrate(); notes(); studyUI(); renderTimer(); save();
    if (scroll) { window.scrollTo(0, 0); $('workspace').focus({ preventScroll: true }); }
  }
  function summary() {
    const scores = [...document.querySelectorAll('[data-quiz]')].map(el => state.ratings[el.dataset.quiz]);
    $('quiz-summary').hidden = !scores.some(Boolean);
    $('quiz-summary').textContent = `自评：${scores.filter(v => v === 'understood').length}题能独立解释，${scores.filter(v => v === 'partial').length}题部分理解，${scores.filter(v => v === 'review').length}题需重学。`;
  }
  function completion() {
    const done = state.completed.includes(day);
    $('mark-complete').disabled = review || done;
    $('mark-complete').textContent = review ? '检查模式' : done ? '本日已完成' : '标记本日完成';
    $('completion-note').textContent = day === 12 && done ? '12天课程已完成，可以按笔记和自测结果复习。' : '';
    $('next-lesson').innerHTML = (review || done) && day < 12 ? `<button class="primary" data-day="${day + 1}">进入第${day + 1}天 →</button>` : '';
  }
  function markComplete() {
    if (review || state.completed.includes(day)) return;
    const questions = [...document.querySelectorAll('[data-quiz]')];
    const answersReady = questions.every(el => state.fields[`${el.dataset.quiz}-answer`]?.trim() && state.ratings[el.dataset.quiz]);
    const checksReady = [...document.querySelectorAll('#day-content input[type="checkbox"][data-save]')].every(el => el.checked);
    if (!answersReady || !checksReady) { toast('请先完成5题作答与自评，并勾选3项收尾检查。'); return; }
    if (!model.complete(day, state)) return;
    pause(); save(); completion(); nav(); roadmap();
    toast(day === 12 ? '12天课程已完成。' : `已完成第${day}天，第${day + 1}天已解锁。`);
  }
  function tick() { if (running) { const now = Date.now(); state.timing[day][phase] += Math.max(0, now - startedAt); startedAt = now; } }
  function pause() { tick(); running = false; save(); renderTimer(); }
  function toggleTimer() { if (running) pause(); else { running = true; startedAt = Date.now(); renderTimer(); } }
  function changePhase(value) { if (!model.PHASES.includes(value)) return; tick(); phase = value; state.ui.phase = value; save(); renderTimer(); }
  function renderTimer() {
    $('timer-display').textContent = $('study-timer-display').textContent = clock(elapsed());
    $('timer-toggle').textContent = running ? '暂停计时' : elapsed() ? '继续计时' : '开始计时';
    $('study-timer-toggle').textContent = running ? '暂停' : elapsed() ? '继续' : '开始';
    for (const id of ['phase-select', 'study-phase-select']) if ($(id).value !== phase) $(id).value = phase;
    $('phase-times').innerHTML = Object.entries(phases).map(([key, label]) => `<span>${label} ${clock(state.timing[day][key])}</span>`).join('');
  }
  function readingAnchor() {
    const el = [...document.querySelectorAll('.hero, #day-content section[data-phase]:not(.lesson-main), .lesson-main .topic')].find(node => node.getBoundingClientRect().bottom > 110);
    return el ? { el, top: el.getBoundingClientRect().top } : null;
  }
  function restoreAnchor(anchor) { if (anchor) requestAnimationFrame(() => { if (anchor.el.isConnected) window.scrollBy(0, anchor.el.getBoundingClientRect().top - anchor.top); }); }
  function studyUI() {
    const lesson = view === 'lesson';
    document.body.classList.toggle('study-mode', lesson && state.ui.studyMode);
    document.body.classList.toggle('notes-open', lesson && notesOpen);
    $('study-toolbar').hidden = !(lesson && state.ui.studyMode);
    $('topic-notes').hidden = !(lesson && notesOpen);
    $('notes-backdrop').hidden = !(lesson && notesOpen);
    $('study-mode-toggle').disabled = !lesson;
    $('study-mode-toggle').setAttribute('aria-pressed', String(state.ui.studyMode));
    $('notes-toggle').setAttribute('aria-expanded', String(notesOpen));
    $('study-day-label').textContent = `第${day}天`;
    document.querySelectorAll('[data-note]').forEach(button => button.setAttribute('aria-expanded', String(notesOpen && button.dataset.note === selectedTopic)));
  }
  function setStudyMode(enabled) { const anchor = readingAnchor(); state.ui.studyMode = enabled; if (!enabled) notesOpen = false; save(); studyUI(); restoreAnchor(anchor); }
  function visibleTopic() { return [...document.querySelectorAll('.lesson-main .topic')].find(el => { const r = el.getBoundingClientRect(); return r.bottom > 120 && r.top < innerHeight; })?.id || selectedTopic || topics()[0].id; }
  function notes() {
    if (!topics().some(topic => topic.id === selectedTopic)) selectedTopic = topics()[0].id;
    $('notes-topic-select').innerHTML = topics().map((topic, i) => `<option value="${topic.id}">${String(i + 1).padStart(2, '0')} · ${esc(topic.title)}</option>`).join('');
    $('notes-topic-select').value = selectedTopic;
    $('topic-note-editor').value = state.fields[noteKey(selectedTopic)] || '';
    $('topic-note-status').textContent = persistent ? state.fields[noteKey(selectedTopic)] ? '已保存到此浏览器' : '输入后自动保存' : '保存失败，请复制备份';
    state.ui.noteTopic = selectedTopic;
  }
  function openNotes(id, trigger) { const anchor = readingAnchor(); selectedTopic = topics().some(topic => topic.id === id) ? id : visibleTopic(); lastNotesTrigger = trigger; notesOpen = true; notes(); save(); studyUI(); restoreAnchor(anchor); $('topic-note-editor').focus({ preventScroll: true }); }
  function closeNotes() { const anchor = readingAnchor(); notesOpen = false; studyUI(); restoreAnchor(anchor); if (lastNotesTrigger?.isConnected) lastNotesTrigger.focus({ preventScroll: true }); }
  async function copyNote() {
    const text = $('topic-note-editor').value;
    if (!text.trim()) { $('topic-note-status').textContent = '先写下这条笔记'; return; }
    try { await navigator.clipboard.writeText(`第${day}天 · ${topics().find(t => t.id === selectedTopic).title}\n\n${text}`); $('topic-note-status').textContent = '笔记已复制'; }
    catch { $('topic-note-editor').focus(); $('topic-note-editor').select(); $('topic-note-status').textContent = '已选中文字，请手动复制'; }
  }
  function topicText(id) {
    const el = document.getElementById(id)?.cloneNode(true);
    if (!el) return '';
    el.querySelectorAll('button,.rating-group,.topic-source-links,input,textarea,select').forEach(node => node.remove());
    return el.textContent.replace(/\s+/g, ' ').trim();
  }
  function feedbackText() {
    const topic = topics().find(item => item.id === feedbackTopic);
    const ids = topic ? topic.sources : dayInfo().ids;
    const sections = topic ? [topic] : topics();
    return [`课程：${course.title} v${course.version}`, `位置：第${day}天 · ${topic?.title || dayInfo().title}`, `我的问题：${$('feedback-note').value.trim()}`, '关联网站知识点：', ...ids.map(id => `#${id} ${course.questions[id].label} ${course.questions[id].url}`), ...sections.flatMap(section => [`知识点：${section.title}\n${topicText(section.id)}`, `我的笔记：${state.fields[noteKey(section.id)] || '（未写）'}`]), '请先用适合初学者的解释和例子讲清，再用一道小问题检查我的理解；需要修改课件时，先提出具体建议。'].join('\n\n');
  }
  function openFeedback(id) {
    feedbackTopic = id;
    const topic = topics().find(item => item.id === id);
    $('feedback-context').textContent = `第${day}天 · ${topic?.title || dayInfo().title}`;
    $('feedback-note').value = state.fields['feedback-draft'] || '';
    $('feedback-error').hidden = true; $('feedback-status').textContent = ''; $('feedback-preview').open = false;
    $('feedback-output').value = feedbackText(); $('feedback-dialog').showModal(); $('feedback-note').focus();
  }
  async function copyFeedback() {
    if (!$('feedback-note').value.trim()) { $('feedback-error').hidden = false; $('feedback-note').focus(); return; }
    $('feedback-output').value = feedbackText();
    try { await navigator.clipboard.writeText($('feedback-output').value); $('feedback-status').textContent = '已复制，粘贴到聊天中发送即可。'; }
    catch { $('feedback-preview').open = true; $('feedback-output').focus(); $('feedback-output').select(); $('feedback-status').textContent = '已选中文字，请手动复制到聊天中。'; }
  }
  function download(text, filename, type) { const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function exportRecord() { tick(); save(); download(JSON.stringify({ ...state, courseVersion: course.version, exportedAt: new Date().toISOString() }, null, 2), `network-course-${mode}.json`, 'application/json'); }
  function exportHandoff() {
    const lines = [`# ${course.title}：第${day}天`, `版本 ${course.version}；${dayInfo().title}`, '请作为零基础计算机网络导师，基于下面的课件继续答疑。先解释疑问，再提出是否更新课件。不要因我阅读过内容就认定已掌握。', '## 网站知识点', ...dayInfo().ids.map(id => `- #${id} ${course.questions[id].label}：${course.questions[id].url}`), '## 本课知识'];
    for (const topic of topics()) lines.push(`### ${topic.title}`, topicText(topic.id), `我的笔记：${state.fields[noteKey(topic.id)] || '（未写）'}`);
    lines.push('## 我的作答');
    document.querySelectorAll('[data-quiz]').forEach(el => {
      const prompt = el.cloneNode(true);
      prompt.querySelectorAll('details,.quiz-input,.quiz-rating').forEach(node => node.remove());
      lines.push(prompt.textContent.replace(/\s+/g, ' ').trim(), state.fields[`${el.dataset.quiz}-answer`] || '（未作答）');
    });
    download(lines.join('\n\n'), `network-course-day-${day}-handoff.md`, 'text/markdown;charset=utf-8');
  }
  const layerInfo = {
    application: ['应用层：约定交流内容。', 'HTTP表达请求与响应；DNS查询域名对应的记录。'], transport: ['传输层：应用端点之间的运输。', 'TCP提供可靠有序的字节流；UDP提供数据报传输。端口属于这一层。'], network: ['网络层：跨网络寻址与转发。', 'IP地址参与寻址，路由器决定下一跳。'], link: ['链路层：当前链路的交付。', '例如以太网和Wi-Fi的链路机制。'], physical: ['物理层：用信号承载比特。', '例如电信号、光信号与无线电信号。']
  };
  function changeLayer(key) { const info = layerInfo[key]; if (!info) return; document.querySelectorAll('[data-layer]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.layer === key))); document.querySelectorAll('[data-stack]').forEach(el => el.classList.toggle('active', el.dataset.stack === key)); $('layer-explanation').innerHTML = `<strong>${info[0]}</strong><p>${info[1]}</p>`; }
  function envelope() {
    const labels = ['应用请求数据', 'TCP首部 · 端口等信息', 'IP首部 · 源与目标地址', '链路控制信息 · 当前链路'];
    let html = `<div class="packet" data-level="0">${labels[0]}</div>`;
    for (let i = 1; i <= encap; i++) html = `<div class="packet"><span class="packet-label">${labels[i]}</span>${html}</div>`;
    $('encap-visual').innerHTML = html; $('encap-step').textContent = `${encap} / 3`; $('encap-next').disabled = encap === 3;
    $('encap-description').textContent = ['应用组织好请求数据。', 'TCP加入端口等传输控制信息。', 'IP加入源与目标地址等网络控制信息。', '链路层形成帧，接着用物理信号传送。'][encap];
  }
  function renderHopDemo() {
    const demo = $('d2-hop-demo');
    if (!demo) return;
    const remote = hopTarget === 'remote';
    const next = remote ? 'gateway' : 'home';
    const nextName = remote ? '家里的路由器' : '家中设备';
    const nextIP = remote ? '192.168.1.1' : '192.168.1.20';
    const finalIP = remote ? '198.51.100.20' : nextIP;
    const mac = remote ? 'G' : 'H';
    const steps = [
      [remote ? '先看位置：网站在家门以外' : '先看位置：目标也在家中网络', remote ? '笔记本和路由器在家中，网站在远方。接下来，看看笔记本怎样把数据送出去。' : '这次要联系上方的家中设备。它和笔记本在本例的同一个网络里。'],
      [remote ? '先选接力点：交给家里的路由器' : '目标在同一网络：直接交给它', remote ? '网站不在本机直连网段，本例使用默认路线。笔记本选家里的路由器作为“下一跳”，也就是眼前先接手数据的一方。' : '系统判断目标在直连网段，可以直接交付。这次“下一跳”就是家中设备，不用先让路由器跨网络转发。'],
      ['发出ARP询问：我还不知道它的MAC', `笔记本在家中网络广播：“谁是${nextIP}？请告诉我你的MAC。”MAC是当前链路交付使用的接口地址；这次询问不会被路由器转到远方网站。`],
      [`${nextName}回答：我的MAC是${mac}`, `${nextName}确认询问的是自己的IP，向笔记本回复MAC ${mac}。笔记本把“${nextIP}对应${mac}”暂时记下来，这份本地记录就是ARP缓存。`],
      ['写好外层帧，再发给下一跳', remote ? '外层帧写“先交给路由器MAC G”，里面的IP包仍写“最终去网站”。看信封沿家中连线移动：它先到路由器，还没有直接跳到网站。' : '外层帧写“交给家中设备MAC H”，里面IP包的目的地也是这台家中设备。看信封沿家中连线直接送过去。'],
      [remote ? '路由器接力，继续送向网站' : '数据到达家中设备', remote ? '路由器收到后查看IP目的地址，选择后续路线继续转发。远方还会逐跳接力；图中把这些中间动作合并画出，最终目的地始终是网站。' : '本次交付在家中网络内完成。互联网连线一直没有亮起：同网段通信不需要为了经过路由器而绕到远方。']
    ];
    const [title, description] = steps[hopStep];
    demo.classList.toggle('show-addresses', hopAddresses);
    demo.querySelectorAll('[data-hop-target]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.hopTarget === hopTarget)));
    const addressToggle = demo.querySelector('[data-hop-action="addresses"]');
    addressToggle.setAttribute('aria-pressed', String(hopAddresses));
    addressToggle.textContent = hopAddresses ? '收起IP与MAC' : '显示IP与MAC';
    demo.querySelectorAll('[data-hop-node]').forEach(el => el.classList.toggle('is-active', el.dataset.hopNode === 'laptop' || (hopStep >= 1 && el.dataset.hopNode === next) || (hopStep === 5 && el.dataset.hopNode === hopTarget)));
    demo.querySelectorAll('[data-hop-goal]').forEach(el => el.classList.toggle('is-visible', el.dataset.hopGoal === hopTarget && (remote || hopStep === 0)));
    demo.querySelectorAll('[data-hop-next]').forEach(el => el.classList.toggle('is-visible', hopStep >= 1 && el.dataset.hopNext === next));
    demo.querySelectorAll('[data-hop-line]').forEach(el => {
      const line = el.dataset.hopLine;
      el.classList.toggle('is-active', hopStep === 2 ? line !== 'outside' : hopStep >= 4 && (line === next || (line === 'outside' && remote && hopStep === 5)));
      el.classList.toggle('is-broadcast', hopStep === 2);
    });
    demo.querySelector('[data-hop-scene="ask"]').classList.toggle('is-visible', hopStep === 2);
    demo.querySelectorAll('[data-hop-reply],[data-hop-reply-tag]').forEach(el => el.classList.toggle('is-visible', hopStep === 3 && (el.dataset.hopReply || el.dataset.hopReplyTag) === next));
    const packet = $('hop-moving-data');
    packet.setAttribute('class', `hop-envelope hop-send-${hopTarget}-${hopStep}`);
    packet.classList.toggle('is-visible', hopStep >= 4);
    $('hop-step-count').textContent = `${hopStep + 1} / ${steps.length}`;
    $('hop-step-title').textContent = title;
    $('hop-step-text').textContent = description;
    $('hop-map-description').textContent = `目标：${remote ? '远方网站' : '家中设备'}。第${hopStep + 1}步：${title}。${description}`;
    $('hop-address-card').hidden = !(hopAddresses && hopStep >= 1);
    $('hop-home-address').textContent = `192.168.1.20 · MAC ${hopStep >= 3 && !remote ? 'H' : '?'}`;
    $('hop-gateway-address').textContent = `192.168.1.1 · MAC ${hopStep >= 3 && remote ? 'G' : '?'}`;
    $('hop-final-address').textContent = finalIP;
    $('hop-next-address').textContent = hopStep >= 3 ? `${nextName} · ${mac}` : `${nextName} · MAC还没查到`;
    demo.querySelector('[data-hop-action="previous"]').disabled = hopStep === 0;
    demo.querySelector('[data-hop-action="next"]').disabled = hopStep === steps.length - 1;
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button,a[data-view]'); if (!target) return;
    if (target.dataset.view) { event.preventDefault(); showView(target.dataset.view); window.scrollTo(0, 0); }
    if (target.dataset.day) openDay(Number(target.dataset.day));
    if (target.dataset.note) openNotes(target.dataset.note, target);
    if (target.dataset.feedback) openFeedback(target.dataset.feedback);
    if (target.dataset.rate) { state.ratings[target.dataset.rate] = target.dataset.value; document.querySelectorAll(`[data-rate="${target.dataset.rate}"]`).forEach(el => el.setAttribute('aria-pressed', String(el.dataset.value === target.dataset.value))); save(); summary(); }
    if (target.dataset.layer) changeLayer(target.dataset.layer);
    if (target.dataset.hopTarget) { hopTarget = target.dataset.hopTarget; hopStep = 0; renderHopDemo(); }
    if (target.dataset.hopAction) {
      if (target.dataset.hopAction === 'next') hopStep = Math.min(5, hopStep + 1);
      if (target.dataset.hopAction === 'previous') hopStep = Math.max(0, hopStep - 1);
      if (target.dataset.hopAction === 'reset') hopStep = 0;
      if (target.dataset.hopAction === 'addresses') hopAddresses = !hopAddresses;
      renderHopDemo();
    }
    if (target.dataset.port) { document.querySelectorAll('[data-service]').forEach(el => el.classList.toggle('active', el.dataset.service === target.dataset.port)); $('port-explanation').textContent = `目标为TCP的198.51.100.20:${target.dataset.port}。IP没有变化，服务入口发生了变化。`; }
    const actions = { 'timer-toggle': toggleTimer, 'study-timer-toggle': toggleTimer, 'study-mode-toggle': () => setStudyMode(true), 'study-mode-exit': () => setStudyMode(false), 'notes-toggle': () => notesOpen ? closeNotes() : openNotes(visibleTopic(), target), 'notes-close': closeNotes, 'notes-backdrop': closeNotes, 'copy-topic-note': copyNote, 'feedback-open': () => openFeedback(visibleTopic()), 'copy-feedback': copyFeedback, 'mark-complete': markComplete, 'export-data': exportRecord, 'export-handoff': exportHandoff, 'print-page': () => window.print(), 'encap-next': () => { encap = Math.min(3, encap + 1); envelope(); }, 'encap-reset': () => { encap = 0; envelope(); } };
    actions[target.id]?.();
  });
  document.addEventListener('input', event => { const el = event.target; if (el.dataset.save) { state.fields[el.dataset.save] = el.type === 'checkbox' ? el.checked : el.value; save(); } });
  document.addEventListener('change', event => { const el = event.target; if (el.dataset.save) { state.fields[el.dataset.save] = el.type === 'checkbox' ? el.checked : el.value; save(); } });
  for (const id of ['phase-select', 'study-phase-select']) $(id).addEventListener('change', event => changePhase(event.target.value));
  $('notes-topic-select').addEventListener('change', event => { selectedTopic = event.target.value; notes(); save(); studyUI(); });
  $('topic-note-editor').addEventListener('input', () => { state.fields[noteKey(selectedTopic)] = $('topic-note-editor').value; save(); $('topic-note-status').textContent = persistent ? '已保存到此浏览器' : '保存失败，请复制备份'; });
  $('feedback-note').addEventListener('input', () => { state.fields['feedback-draft'] = $('feedback-note').value; save(); $('feedback-error').hidden = true; $('feedback-status').textContent = ''; $('feedback-output').value = feedbackText(); });
  document.addEventListener('keydown', event => { if (event.key !== 'Escape' || $('feedback-dialog').open) return; if (notesOpen) closeNotes(); else if (state.ui.studyMode) setStudyMode(false); });
  $('import-data').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 10485760) throw Error('记录超过10MB，无法导入。');
      const imported = model.normalize(JSON.parse(await file.text()), catalog, mode);
      if (!window.confirm('导入会替换此浏览器中的当前记录。继续吗？')) return;
      pause(); state = imported; phase = state.ui.phase; selectedTopic = state.ui.noteTopic; notesOpen = false; save(); roadmap(); openDay(state.day); toast('记录已恢复，计时保持暂停。');
    } catch (error) { toast(`未导入：${error.message}`); }
    finally { event.target.value = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) pause(); });
  window.addEventListener('pagehide', pause);
  let ticks = 0; setInterval(() => { if (running) { tick(); renderTimer(); if (++ticks % 10 === 0) save(); } }, 1000);
  document.body.classList.toggle('review-mode', review);
  $('review-banner').hidden = !review; $('review-return').hidden = !review || course.default_mode === 'review';
  $('version').textContent = course.version;
  roadmap(); guide(); openDay(day, false);
})();
