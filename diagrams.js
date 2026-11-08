(() => {
  'use strict';
  const examples = JSON.parse(document.getElementById('diagram-data').textContent);
  const instances = new WeakMap();
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusNames = {received:'已收到', acked:'已确认', missing:'缺失', buffered:'已到但等待', duplicate:'重复'};
  const icons = {
    laptop:'<rect x="-28" y="-22" width="56" height="37" rx="4"/><path d="M-34 22H34L38 28H-38Z"/><path d="M-19-11H19M-19-3H8"/>',
    server:'<rect x="-22" y="-27" width="44" height="56" rx="5"/><path d="M-22-9H22M-22 10H22M-5-19H13M-5 1H13M-5 20H13"/><circle cx="-13" cy="-19" r="2"/><circle cx="-13" cy="1" r="2"/><circle cx="-13" cy="20" r="2"/>',
    database:'<ellipse cx="0" cy="-20" rx="29" ry="10"/><path d="M-29-20V21C-29 35 29 35 29 21V-20M-29 0C-29 14 29 14 29 0"/>',
    cache:'<path d="M-29-13H29V27H-29Z M-33-23H33V-12H-33Z M-10 2H10"/>',
    document:'<path d="M-22-28H11L25-14V29H-22Z M11-28V-14H25M-12-3H14M-12 7H14M-12 17H6"/>',
    router:'<rect x="-32" y="-4" width="64" height="29" rx="6"/><path d="M-22-5L-27-28M22-5L27-28M-9-18Q0-26 9-18M-5-11Q0-15 5-11"/><circle cx="-20" cy="10" r="2"/><path d="M10 10H22"/>',
    key:'<circle cx="-12" cy="-8" r="16"/><path d="M0 3L27 30M15 17L23 9M22 24L30 16"/>',
    lock:'<rect x="-24" y="-3" width="48" height="33" rx="5"/><path d="M-16-3V-15C-16-36 16-36 16-15V-3M0 10V19"/>',
    observer:'<path d="M-34 0Q0-32 34 0Q0 32-34 0Z"/><circle cx="0" cy="0" r="10"/>'
  };
  function lines(text, count = 17) {
    const result = []; let line = '', width = 0;
    for (const c of String(text)) { const w = /[^\x00-\xff]/.test(c) ? 1 : .55; if (width + w > count) {result.push(line);line='';width=0;} line += c;width+=w; }
    if (line) result.push(line);
    return result;
  }
  function svgText(text, x, y, cls = '', width = 16) {
    return `<text x="${x}" y="${y}" class="${cls}">${lines(text,width).map((line,i)=>`<tspan x="${x}" dy="${i ? 18 : 0}">${esc(line)}</tspan>`).join('')}</text>`;
  }
  function network(example, config, step) {
    const nodes = config.nodes.map((n,i) => ({...n,x:n.x ?? (config.nodes.length===1 ? 400 : 90+i*620/(config.nodes.length-1)),y:n.y ?? (config.nodes.length===3 ? (i===1 ? 65 : 200) : 145)}));
    const byId = Object.fromEntries(nodes.map(n=>[n.id,n]));
    const route = (a,b) => {const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);return {x1:a.x+dx/d*49,y1:a.y+dy/d*49,x2:b.x-dx/d*49,y2:b.y-dy/d*49};};
    const pairs = new Map();
    for(const c of example.cases) for(const s of c.steps) for(const f of s.flows || []) if(byId[f.from] && byId[f.to]) pairs.set([f.from,f.to].sort().join(':'),f);
    const base = [...pairs.values()].map(f=>{const p=route(byId[f.from],byId[f.to]);return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" class="ex-base-line"/>`;}).join('');
    const flows = (step.flows || []).map(f=>{
      const p=route(byId[f.from],byId[f.to]),dx=p.x2-p.x1,dy=p.y2-p.y1,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
      const color=f.tone==='blocked' ? '#ad4141' : f.tone==='warning' ? '#ad7527' : '#337461';
      const end=f.tone==='blocked' ? .55 : 1;
      const x=p.x1+dx*end,y=p.y1+dy*end;
      return `<g class="ex-current-flow"><line x1="${p.x1}" y1="${p.y1}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="4"/>${f.tone==='blocked' ? `<path d="M${x-7} ${y-7}L${x+7} ${y+7}M${x+7} ${y-7}L${x-7} ${y+7}" stroke="${color}" stroke-width="3"/>` : `<path d="M-12-6L0 0L-12 6" fill="none" stroke="${color}" stroke-width="3" transform="translate(${x} ${y}) rotate(${angle})"/>`}<circle r="5" fill="${color}" class="ex-moving"><animateMotion dur=".65s" fill="freeze" path="M${p.x1} ${p.y1}L${x} ${y}"/></circle>${svgText(f.label,(p.x1+x)/2+(Math.abs(dx)<80 ? 60 : 0),(p.y1+y)/2-16,'ex-flow-label',19)}</g>`;
    }).join('');
    const actors = nodes.map(n=>`<g class="ex-actor ${(step.active||[]).includes(n.id)?'is-active':''}" transform="translate(${n.x} ${n.y})"><rect x="-45" y="-38" width="90" height="78" rx="13"/><g class="ex-icon">${icons[n.kind] || icons.server}</g>${svgText(n.label,0,61,'ex-node-label',12)}${step.states?.[n.id] ? svgText(step.states[n.id],0,86,'ex-node-state',14):''}</g>`).join('');
    return `<svg viewBox="0 0 800 365" role="img" aria-label="${esc(step.title+'。'+(step.flows||[]).map(f=>byId[f.from].label+'向'+byId[f.to].label+'：'+f.label).join('；'))}">${base}${flows}${actors}</svg>`;
  }
  function blocks(config, step) {
    return `<div class="ex-rows">${(step.rows||config.rows).map(row=>`<div class="ex-data-row"><strong>${esc(row.label)}</strong><div class="ex-cells">${row.cells.map(cell=>{const status=step.statuses?.[cell.id];return `<div class="ex-cell ${(step.active||[]).includes(cell.id)?'is-active':''} ${status||''}"><span>${esc(cell.text)}</span>${status ? `<small>${esc(statusNames[status])}</small>`:''}</div>`;}).join('')}</div></div>`).join('')}</div>${config.scaleNote ? `<p class="ex-scale-note">${esc(config.scaleNote)}</p>` : ''}`;
  }
  function chart(config, step) {
    const x=v=>85+v/config.xMax*620,y=v=>270-v/config.yMax*210;
    const points=step.points;
    const grid = Array.from({length:6},(_,i)=>{const value=i*config.yMax/5;return `<line x1="85" y1="${y(value)}" x2="705" y2="${y(value)}" class="ex-grid"/>${svgText(Number(value.toFixed(1)),60,y(value)+5,'ex-axis',5)}`;}).join('');
    const ticks=Array.from({length:config.xMax+1},(_,i)=>svgText(i,x(i),295,'ex-axis',5)).join('');
    const path=points.map((p,i)=>`${i?'L':'M'}${x(p[0])} ${y(p[1])}`).join(' ');
    return `<svg viewBox="0 0 800 355" role="img" aria-label="${esc(config.yLabel+'随'+config.xLabel+'变化：'+points.map(p=>'横坐标'+p[0]+'，值'+p[1]).join('；'))}">${grid}<path d="M85 45V270H720" class="ex-chart-axis"/>${ticks}${svgText(config.xLabel,405,332,'ex-axis-label',30)}${svgText(config.yLabel,155,25,'ex-axis-label',25)}<path d="${path}" class="ex-chart-line"/>${points.map(p=>`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="6" class="ex-chart-dot"/>${svgText(p[1],x(p[0]),y(p[1])-13,'ex-axis',8)}`).join('')}</svg>`;
  }
  const painters = {network,blocks:(_,c,s)=>blocks(c,s),chart:(_,c,s)=>chart(c,s)};
  function render(el) {
    const instance=instances.get(el),example=examples[el.dataset.example],current=example.cases[instance.case],step=current.steps[instance.step],config=current.diagram||example.diagram;
    el.querySelectorAll('[data-example-case]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.exampleCase)===instance.case)));
    el.querySelector('[data-example-previous]').disabled=instance.step===0;
    el.querySelector('[data-example-next]').disabled=instance.step===current.steps.length-1;
    el.querySelector('.ex-count').textContent=`${instance.step+1} / ${current.steps.length}`;
    el.querySelector('.ex-assumption').textContent=current.assumption;
    el.querySelector('.ex-canvas').innerHTML=painters[config.kind](example,config,step);
    el.querySelector('.ex-step-title').textContent=step.title;
    el.querySelector('.ex-step-text').textContent=step.text;
    el.querySelector('.ex-values').innerHTML=(step.values||[]).map(v=>`<div><span>${esc(v.label)}</span><strong>${esc(v.value)}</strong></div>`).join('');
    el.querySelector('.ex-all-steps').innerHTML=current.steps.map(s=>`<li><strong>${esc(s.title)}</strong><p>${esc(s.text)}</p></li>`).join('');
  }
  function mount(container) {
    container.querySelectorAll('[data-example]').forEach(el=>{instances.set(el,{case:0,step:0});render(el);});
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button[data-example-case],button[data-example-previous],button[data-example-next],button[data-example-reset]');
    if(!button)return;
    const el=button.closest('[data-example]'),state=instances.get(el);
    if(!state)return;
    const example=examples[el.dataset.example];
    if(button.hasAttribute('data-example-case')){state.case=Number(button.dataset.exampleCase);state.step=0;}
    if(button.hasAttribute('data-example-reset'))state.step=0;
    if(button.hasAttribute('data-example-previous'))state.step=Math.max(0,state.step-1);
    if(button.hasAttribute('data-example-next'))state.step=Math.min(example.cases[state.case].steps.length-1,state.step+1);
    render(el);
  });
  function diagramText(config, step) {
    if(config.kind==='network') {
      const names=Object.fromEntries(config.nodes.map(n=>[n.id,n.label]));
      return ['图中参与方：'+config.nodes.map(n=>n.label).join('、'),...(step.flows||[]).map(f=>`${names[f.from]} → ${names[f.to]}：${f.label}${f.tone==='blocked'?'（图中丢失或过滤，未到达接收方）':''}`),...Object.entries(step.states||{}).map(([id,state])=>`${names[id]}状态：${state}`)].join('；');
    }
    if(config.kind==='blocks') return (config.scaleNote ? config.scaleNote+'\n' : '')+'图中区块：'+(step.rows||config.rows).map(row=>row.label+'：'+row.cells.map(cell=>cell.text+(step.statuses?.[cell.id]?'（'+statusNames[step.statuses[cell.id]]+'）':'')).join(' | ')).join('；');
    return `图中横轴：${config.xLabel}；纵轴：${config.yLabel}；坐标：${step.points.map(p=>'('+p.join(', ')+')').join('、')}`;
  }
  function textFor(id) {
    const e=examples[id];
    return e ? [e.title,e.intro,e.terms,...e.cases.flatMap(c=>[`情形：${c.label}；条件：${c.assumption}`,...c.steps.map(s=>`${s.title}：${s.text}${(s.values||[]).map(v=>`；${v.label}：${v.value}`).join('')}\n${diagramText(c.diagram||e.diagram,s)}`)]),`图示条件：${e.limit}`,...e.references].join('\n') : '';
  }
  window.CourseDiagrams=Object.freeze({mount,textFor});
})();
