(() => {
  'use strict';
  const course = JSON.parse(document.getElementById('course-data').textContent);
  const lessonHTML = document.getElementById('lesson-01').innerHTML;
  const $ = id => document.getElementById(id);
  const KEY = 'network-foundations-12:learner:v1';
  const phases = { recall: '回忆', main: '主线', quiz: '自测', close: '收尾' };
  const fresh = () => ({ schema: 1, courseId: course.id, fields: {}, ratings: {}, completed: [], timing: { recall: 0, main: 0, quiz: 0, close: 0 } });
  const allowedFields = new Set([...document.getElementById('lesson-01').content.querySelectorAll('[data-save]')].map(el => el.dataset.save));
  for (let i = 1; i <= 5; i++) allowedFields.add(`d1-q${i}-answer`);
  allowedFields.add('feedback-draft');
  const allowedRatings = new Set(['d1-client-server', 'd1-layers', 'd1-addresses', ...Array.from({ length: 5 }, (_, i) => `d1-q${i + 1}`)]);
  function cleanState(raw) {
    if (!raw || raw.schema !== 1 || raw.courseId !== course.id) throw Error('这不是本课程的学习记录。');
    const next = fresh();
    for (const [k, v] of Object.entries(raw.fields || {})) if (allowedFields.has(k) && (typeof v === 'boolean' || typeof v === 'string' && v.length <= 20000)) next.fields[k] = v;
    for (const [k, v] of Object.entries(raw.ratings || {})) if (allowedRatings.has(k) && ['understood', 'partial', 'review'].includes(v)) next.ratings[k] = v;
    if (Array.isArray(raw.completed)) next.completed = [...new Set(raw.completed.filter(x => Number.isInteger(x) && x >= 1 && x <= 12))];
    for (const k of Object.keys(phases)) if (Number.isFinite(raw.timing?.[k]) && raw.timing[k] >= 0 && raw.timing[k] < 31536000000) next.timing[k] = raw.timing[k];
    return next;
  }
  let state = fresh(), persistent = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = cleanState(JSON.parse(raw)); } catch { persistent = false; }
  let currentDay = 1, currentView = 'lesson', running = false, startedAt = 0, phase = 'recall', encap = 0, feedbackTopic = '', toastTimeout;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatTime = ms => { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
  const totalTime = () => Object.values(state.timing).reduce((a, b) => a + b, 0);
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; } catch { persistent = false; }
    $('storage-warning').hidden = persistent;
  }
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 4200); }
  function renderNav() {
    $('day-nav').innerHTML = course.days.map(day => `${day.day === 1 || day.day === 7 ? `<div class="week-label">WEEK ${day.week} · 六个学习日</div>` : ''}<button class="day-button ${currentDay === day.day && currentView === 'lesson' ? 'active' : ''} ${state.completed.includes(day.day) ? 'done' : ''}" data-day="${day.day}" ${currentDay === day.day && currentView === 'lesson' ? 'aria-current="page"' : ''}><span class="day-number">${state.completed.includes(day.day) ? '✓' : String(day.day).padStart(2, '0')}</span><span class="day-copy">${esc(day.title)}<small>${day.status === 'sample' ? '样稿 · 可以试学' : '规划 · 正文待制作'}</small></span></button>${day.day === 6 || day.day === 12 ? '<div class="rest-label">休息日 / 不安排必做学习</div>' : ''}`).join('');
    $('progress-label').textContent = `${state.completed.length} / 12`;
    $('course-progress').value = state.completed.length;
  }
  function sourceItems(ids) {
    return ids.map(id => `<a href="${esc(course.questions[id].url)}" target="_blank" rel="noopener noreferrer"><span>${id === 'S1' ? '补充' : '#' + id}</span><span>${esc(course.questions[id].label)}</span></a>`).join('');
  }
  function planCard(day) {
    return `<article class="card plan-card"><div class="plan-top"><small class="eyebrow">DAY ${String(day.day).padStart(2, '0')}</small><h2>${esc(day.title)}</h2></div><p>${esc(day.why)}</p><h3>今天的主线</h3><ul>${day.goals.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="callout"><strong>能做到什么，才算达到本日目标</strong><p>${esc(day.exit)}</p></div><details><summary>${day.ids.length}个原题条目 · 查看编号与来源</summary><div class="source-items">${sourceItems(day.ids)}</div></details><button class="open-day" data-day="${day.day}">${day.day === 1 ? '打开第1天样稿' : '查看本日规划'} →</button></article>`;
  }
  function renderRoadmap() {
    $('roadmap-view').innerHTML = `<div class="roadmap-intro"><span class="eyebrow">12 STUDY DAYS / 2 WEEKS</span><h1>先搭地图，再走完全程。</h1><p class="muted">先理解依赖，再串联机制。每周第七天完整休息；学习日不绑定具体日期。</p><div class="route-stats"><div class="route-stat"><strong>12</strong><span>个学习日 · 共18小时预算</span></div><div class="route-stat"><strong>105</strong><span>个原题条目 · 已全部映射</span></div><div class="route-stat"><strong>01</strong><span>天正文已制作 · 等待试学</span></div></div><div class="callout warm"><strong>这是初版安排，不是进度承诺。</strong><p>复杂主题减少新题；重复题合并解释。第11天条目较多，是因为9道状态题合并为一条主线，安全内容先认识。第1天实测后可调整分配。</p></div></div>${course.days.map(d => `${d.day === 1 || d.day === 7 ? `<div class="week-banner">第${d.week}周 / ${d.week === 1 ? '把运输过程讲清楚' : '把应用与全链路串起来'}</div>` : ''}${planCard(d)}${d.day === 6 || d.day === 12 ? '<div class="week-banner">休息一天 · 不布置补课和必做练习</div>' : ''}`).join('')}<div class="card"><h2>覆盖核对</h2><p>${esc(course.source_note)}</p><p>编号1–104各出现一次，补充题S1安排在第6天；80题的跨页重复不重复计算。知识点重复通过映射保留，正文不重复堆叠。</p><p class="micro">标题为课程化概括；点击原题来源可核对原站内容。</p></div>`;
  }
  function renderGuide() {
    $('guide-view').innerHTML = `<div class="roadmap-intro"><span class="eyebrow">A COURSE THAT CAN IMPROVE</span><h1>让每一次“没懂”，都有去处。</h1><p class="muted">时间可校准，解释可改进。理解先于题数。</p></div><section class="card"><h2>90分钟怎样控制？</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>环节</th><th>预算</th><th>包含什么</th></tr></thead><tbody><tr><td>回忆 / 摸底</td><td>10分钟</td><td>先回想，再核对</td></tr><tr><td>图文主线</td><td>55分钟</td><td>阅读、看图、演示、例子和停顿思考</td></tr><tr><td>理解自测</td><td>20分钟</td><td>独立作答、查看解释、自评</td></tr><tr><td>收尾记录</td><td>5分钟</td><td>总结与具体卡点</td></tr></tbody></table></div><p style="margin-top:18px">初版数字是设计预算，还没有你的实测依据。计时只在你点击开始后运行，切到后台暂停；计时不能证明理解，阅读速度也不能代替自测。</p><p>第1天后根据实际分段耗时和你的回答调整。超时先停、记录卡点，下次先补救并减少新内容。若仍无法兼顾两周和目标深度，明确讨论取舍，不把剩余任务塞进休息日。</p></section><section class="card"><h2>图文充分，结构简洁。</h2><p>每个核心概念都解释“为什么需要 → 如何运作 → 一个具体例子 → 常见误解 → 小检查”。图表达方向、层次和步骤；类比说明边界。必要的基础在第一次遇到时解释，不让你靠猜术语。</p><p>一个概念只保留一个主要讲解位置。后面回顾时换问题、用短提示和链接；有价值的补充写回相应位置，避免另加一大段重复FAQ。</p><p>原题全部映射；核心知识要求理解并用于简单情境，低频细节先认识。版本敏感或原文有误的说法，用RFC、IANA或官方文档核实。</p></section><section class="card"><h2>从会话答疑，到课件更新</h2><ol class="step-list"><li><strong>说出卡点。</strong>点击课件中的“这里还没懂”，补充自己的理解，复制文字回会话。</li><li><strong>先把疑问讲清。</strong>用不同解释、具体例子或图，再用一个变式问题检查。</li><li><strong>我主动提议具体改动。</strong>例如“在IP与端口处增加双向定位图，并修改一道自测，是否写回课件？”</li><li><strong>你同意后再更新。</strong>修改主要讲解位置、记录版本、保留进度；需要时联动次日回顾。</li></ol><div class="callout warm"><strong>记录持久保存，但不自动互通。</strong><p>网页的记录在当前浏览器；课程规则和维护记录在项目目录。静态网页不会发消息，也不会自动读取会话。复制反馈或导出记录后，才能在会话中据此更新。</p></div><p>新会话接续时可说：</p><p><code>继续项目中的 network-course 课程，先读 AGENTS.md、learner-state.json 和课程维护约定.md。</code></p></section><section class="card"><h2>第1天学完，反馈这三项就够了。</h2><ul><li>实际用了多久，主要在哪个环节超时？</li><li>哪一个位置没懂？你的理解是什么？</li><li>五道自测中，哪些能不看答案说出理由？</li></ul><p class="micro">不需要一次说得很完整，一句具体疑问就能开始答疑。</p></section>`;
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
    $('day-references').innerHTML = `<p class="micro">本课重新组织讲解；技术边界核验于${course.checked_at}。</p><ul>${course.references.slice(1).map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a></li>`).join('')}<li><a href="https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml" target="_blank" rel="noopener noreferrer">IANA：TCP/UDP端口0的保留状态</a></li><li><a href="https://www.rfc-editor.org/rfc/rfc9114.html#section-2" target="_blank" rel="noopener noreferrer">RFC 9114：HTTP/3与QUIC</a></li></ul>`;
    encap = 0;
    updateQuizSummary(); updateCompletion();
  }
  function showView(view) {
    if (view !== 'lesson') pauseTimer();
    currentView = view;
    ['lesson', 'roadmap', 'guide'].forEach(v => { $(`${v}-view`).hidden = v !== view; });
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    document.querySelector('.study-tools').hidden = view !== 'lesson';
    renderNav();
  }
  function openDay(number, scroll = true) {
    pauseTimer(); currentDay = number;
    const day = course.days.find(x => x.day === number);
    showView('lesson');
    $('day-label').textContent = `DAY ${String(number).padStart(2, '0')} / WEEK ${day.week}`;
    $('lesson-title').textContent = day.title;
    $('lesson-description').textContent = day.why;
    $('lesson-meta').innerHTML = `<span class="chip">90分钟设计预算</span><span class="chip">${day.ids.length}个原题条目</span><span class="chip ${number === 1 ? 'warm' : ''}">${number === 1 ? '第1天样稿 · 待实测校准' : '仅规划 · 正文尚未制作'}</span>`;
    if (number === 1) { $('day-content').innerHTML = lessonHTML; hydrateLesson(); }
    else $('day-content').innerHTML = `<div class="notice"><strong>这一天目前只有规划。</strong><p>先试学第1天，根据真实耗时与卡点校准后再展开正文。下面是内容位置，不是已经完成的课件。</p></div>${planCard(day)}<div class="card"><h2>课前回顾安排</h2><p>${number === 2 ? '先不看答案解释IP与端口、分层的价值，再把DNS放进应用层地图。' : `回顾第${number - 1}天核心目标，并穿插较早的易错点。具体题目将在前序课件完成和答疑后制作。`}</p><button data-day="1">返回第1天样稿</button></div>`;
    $('timer-toggle').disabled = number !== 1;
    $('phase-select').disabled = number !== 1;
    $('section-nav').hidden = number !== 1;
    renderTimer();
    if (scroll) { window.scrollTo(0, 0); $('workspace').focus({ preventScroll: true }); }
  }
  function updateQuizSummary() {
    const el = $('quiz-summary'); if (!el) return;
    const scores = Array.from({ length: 5 }, (_, i) => state.ratings[`d1-q${i + 1}`]);
    el.textContent = `你的自评：${scores.filter(x => x === 'understood').length}题能独立解释，${scores.filter(x => x === 'partial').length}题部分理解，${scores.filter(x => x === 'review').length}题需重学，${scores.filter(x => !x).length}题尚未自评。此处不是自动评分。`;
  }
  function updateCompletion() {
    const done = state.completed.includes(1);
    if ($('mark-complete')) $('mark-complete').textContent = done ? '撤销本日完成标记' : '标记本日完成';
    if ($('completion-note')) $('completion-note').textContent = done ? '已按你的选择标记完成；这不会自动判断掌握程度。' : '完成标记由你决定。未懂点和部分理解会继续保留。';
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
    $('timer-hint').textContent = currentDay !== 1 ? '正文尚未制作，暂不计时' : totalTime() >= 5400000 ? '已到90分钟预算 · 可以暂停并记录卡点' : '主动学习用时 / 预算90分钟';
    $('phase-times').innerHTML = currentDay === 1 ? Object.entries(phases).map(([k, v]) => `<span>${v} ${formatTime(state.timing[k])}</span>`).join('') : '';
  }
  const layerInfo = {
    application: ['应用层：先约定“说的是什么”。', '浏览器表达“我要这份资源”，服务器表达“这是结果”。它们需要能理解彼此的消息，而不是只收到一串没有含义的比特。'],
    transport: ['传输层：为应用端点提供运输服务。', '不同运输规则提供不同能力。TCP面向可靠、有序的字节流；UDP提供数据报传输，本身不保证可靠到达。今天先记住端口在这一层，具体机制第3天再学。'],
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
      '起点：应用已经组织好要交流的内容。接下来每层只添加自己需要的信息。',
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
    $('feedback-context').textContent = `第${currentDay}天 · ${element?.dataset.topic || (topic === 'd1-close' ? '收尾与整体反馈' : '本日整体')} · v${course.version}`;
    $('feedback-note').value = state.fields['feedback-draft'] || '';
    makeFeedback();
    $('feedback-dialog').showModal();
    $('feedback-note').focus();
  }
  function makeFeedback() {
    const ratings = Array.from({ length: 5 }, (_, i) => `Q${i + 1}=${{ understood: '能独立解释', partial: '部分理解', review: '需要重学' }[state.ratings[`d1-q${i + 1}`]] || '未自评'}`).join('，');
    $('feedback-output').value = `课程：${course.title}\n位置：第${currentDay}天 / ${feedbackTopic} / v${course.version}\n我的疑问或当前理解：${$('feedback-note').value.trim() || '（请补充哪一步没懂）'}\n${currentDay === 1 ? `第1天主动计时：${formatTime(totalTime())}；${Object.entries(phases).map(([k,v]) => `${v}${formatTime(state.timing[k])}`).join('，')}\n自测自评：${ratings}\n` : ''}请先用适合新手的解释和例子讲清，再用一道小问题检查我的理解；如适合补进课件，请主动提出具体修改建议并询问是否更新HTML。`;
  }
  async function copyFeedback() {
    try { await navigator.clipboard.writeText($('feedback-output').value); toast('已复制。请粘贴到本项目会话中。'); }
    catch { $('feedback-output').focus(); $('feedback-output').select(); toast('浏览器未允许自动复制，请复制已选中的文字。'); }
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
    if (target.dataset.rate) {
      state.ratings[target.dataset.rate] = target.dataset.value;
      document.querySelectorAll('[data-rate]').forEach(el => { if (el.dataset.rate === target.dataset.rate) el.setAttribute('aria-pressed', String(el.dataset.value === target.dataset.value)); });
      save(); updateQuizSummary();
    }
    if (target.id === 'encap-next') { encap = Math.min(3, encap + 1); renderEnvelope(); }
    if (target.id === 'encap-reset') { encap = 0; renderEnvelope(); }
    if (target.id === 'feedback-open') openFeedback('本日整体');
    if (target.id === 'copy-feedback') copyFeedback();
    if (target.id === 'timer-toggle') {
      if (running) pauseTimer();
      else { running = true; startedAt = Date.now(); renderTimer(); }
    }
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
  $('phase-select').addEventListener('change', event => { tick(); phase = event.target.value; save(); renderTimer(); });
  $('feedback-note').addEventListener('input', () => { state.fields['feedback-draft'] = $('feedback-note').value; save(); makeFeedback(); });
  $('import-data').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 1000000) throw Error('记录文件过大，请选择本课件导出的JSON。');
      const imported = cleanState(JSON.parse(await file.text()));
      if (!window.confirm('导入将替换当前浏览器的本课程记录。建议先导出备份。继续吗？')) return;
      pauseTimer(); state = imported; save(); openDay(currentDay, false); toast('学习记录已恢复。计时保持暂停。');
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
