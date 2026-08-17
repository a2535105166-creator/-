const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = { article: null, tab: 'article', theme: 'blue', status: null };
const themeColors = { blue:'#2457ff', red:'#e03a3e', green:'#1c9a6b', black:'#222222' };
const API_BASE = String(window.JIKE_API_BASE || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE}${path}`;

function toast(message){
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(window.__toast); window.__toast = setTimeout(()=>el.classList.remove('show'), 2200);
}

async function fetchJson(url, options={}){
  const r = await fetch(apiUrl(url), { headers:{'Content-Type':'application/json'}, ...options });
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || '请求失败');
  return data;
}

async function loadStatus(){
  try{
    const s = await fetchJson('/api/status'); state.status = s;
    const badge = $('#statusBadge');
    badge.classList.add('live');
    badge.innerHTML = `<i></i> ${s.mode === 'live' ? 'AI已连接' : '演示模式'}`;
    $('#sideStatus').textContent = s.mode === 'live' ? `模型：${s.textModel}` : '演示模式 · 配Key后启用AI';
  }catch(e){
    $('#statusBadge').classList.remove('live');
    $('#statusBadge').innerHTML='<i></i> AI后端待连接';
    $('#sideStatus').textContent='真实版前端已上线 · 等待后端地址';
  }
}

function escapeHtml(s=''){
  return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}
function nl(s=''){ return escapeHtml(s).replace(/\n/g,'<br>'); }

function articleHtml(a){
  const sections = a.sections.map((s,i)=>`<section class="doc-section" data-index="${i}">
    <h2>${escapeHtml(s.heading)}</h2>
    <p>${nl(s.body)}</p>
    ${s.emphasis ? `<div class="emphasis">${escapeHtml(s.emphasis)}</div>`:''}
    <div class="image-plan" contenteditable="false" data-image-index="${i}">
      <b>AI 配图计划 ${String(i+1).padStart(2,'0')}</b><br>${escapeHtml(s.imageCaption || '文章配图')}<br><span>${escapeHtml(s.imagePrompt)}</span>
    </div>
  </section>`).join('');
  return `<span class="doc-kicker">JIKE AI · 智能成稿</span><h1>${escapeHtml(a.title)}</h1><div class="subtitle">${escapeHtml(a.subtitle)}</div><div class="summary">${escapeHtml(a.summary)}</div>${sections}<p class="closing">${nl(a.closing)}</p><span class="cta">${escapeHtml(a.cta)}</span>`;
}

function previewHtml(a){
  const sections = a.sections.map((s,i)=>`<h2>${escapeHtml(s.heading)}</h2><p>${nl(s.body)}</p>${s.emphasis?`<div class="em">${escapeHtml(s.emphasis)}</div>`:''}<div class="pic" data-preview-image="${i}">AI配图 · ${escapeHtml(s.imageCaption || '')}</div>`).join('');
  return `<article class="phone-article"><div class="cover"><b>${escapeHtml(a.coverCopy || a.title)}</b><span>JIKE AI · CONTENT STUDIO</span></div><h1>${escapeHtml(a.title)}</h1><div class="sub">${escapeHtml(a.subtitle)}</div><div class="sum">${escapeHtml(a.summary)}</div>${sections}<p><b>${escapeHtml(a.closing)}</b></p></article>`;
}

function structureHtml(a){
  return `<div class="row"><label>标题</label><strong>${escapeHtml(a.title)}</strong></div>` + a.sections.map((s,i)=>`<div class="row"><label>第 ${i+1} 节</label><strong>${escapeHtml(s.heading)}</strong><p>${escapeHtml(s.imageCaption || '')}</p></div>`).join('') + `<div class="row"><label>结尾 CTA</label><p>${escapeHtml(a.cta)}</p></div>`;
}
function seoHtml(a){
  return `<div class="row"><label>SEO Description</label><p>${escapeHtml(a.seoDescription)}</p></div><div class="row"><label>关键词</label>${a.keywords.map(k=>`<span class="tag">${escapeHtml(k)}</span>`).join('')}</div><div class="row"><label>封面文案</label><strong>${escapeHtml(a.coverCopy)}</strong></div><div class="row"><label>语言机械感评估</label><strong>${a.aigcRisk}/100</strong><p>${escapeHtml(a.aigcAdvice)}</p></div>`;
}

function render(){
  const a = state.article;
  if(!a) return;
  $('#emptyState').classList.add('hidden');
  $('#articleEditor').innerHTML = articleHtml(a);
  $('#phonePreview').innerHTML = previewHtml(a);
  $('#structurePanel').innerHTML = structureHtml(a);
  $('#seoPanel').innerHTML = seoHtml(a);
  const risk = Number(a.aigcRisk || 0);
  $('#aigcScore').textContent = risk;
  $('#readability').textContent = Math.max(78, 96 - Math.round(risk/5));
  $('#seoScore').textContent = Math.min(96, 72 + Math.min(22, (a.keywords?.length || 0)*3));
  $('#riskTag').textContent = risk <= 35 ? '较自然' : risk <= 60 ? '可优化' : '风险偏高';
  $('#scoreAdvice').textContent = a.aigcAdvice || '建议人工终审。';
  switchTab(state.tab);
}

function switchTab(tab){
  state.tab = tab;
  $$('.segmented button').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  $('#articleEditor').classList.toggle('hidden',tab!=='article');
  $('#structurePanel').classList.toggle('hidden',tab!=='structure');
  $('#seoPanel').classList.toggle('hidden',tab!=='seo');
}

async function generate(){
  const prompt = $('#prompt').value.trim();
  if(!prompt) return toast('先输入你的创作要求');
  const btn = $('#generate'); btn.disabled=true; btn.innerHTML='<span>✦</span> AI 正在生成…';
  try{
    const data = await fetchJson('/api/generate',{method:'POST',body:JSON.stringify({
      prompt, platform:$('#platform').value, style:$('#style').value, length:$('#length').value, brand:$('#brand').value, autoImage:$('#autoImage').classList.contains('on')
    })});
    state.article=data.article; render(); toast(data.mode==='demo'?'演示成品已生成':'AI 成品已生成');
  }catch(e){ toast(e.message); }
  finally{ btn.disabled=false; btn.innerHTML='<span>✦</span> 一键生成成品'; }
}

async function revise(action){
  if(!state.article) return toast('请先生成文章');
  toast('正在优化文章…');
  try{
    const data = await fetchJson('/api/action',{method:'POST',body:JSON.stringify({action,article:state.article})});
    state.article=data.article; render(); toast('优化完成');
  }catch(e){toast(e.message)}
}

function syncEditorBack(){}

async function copyWechat(){
  if(!state.article) return toast('请先生成文章');
  syncEditorBack();
  const html = $('#articleEditor').innerHTML;
  const plain = $('#articleEditor').innerText;
  try{
    if(window.ClipboardItem && navigator.clipboard?.write){
      const item = new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([plain],{type:'text/plain'})});
      await navigator.clipboard.write([item]);
    }else await navigator.clipboard.writeText(plain);
    toast('已复制，可粘贴到公众号编辑器');
  }catch{ await navigator.clipboard.writeText(plain); toast('已复制纯文本'); }
}

function exportHtml(){
  if(!state.article) return toast('请先生成文章');
  const body = $('#articleEditor').innerHTML;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(state.article.title)}</title><style>body{max-width:720px;margin:40px auto;font-family:Arial,'Microsoft Yahei';line-height:1.9;color:#263142;padding:0 20px}h1{font-size:30px}h2{margin-top:30px}.summary,.emphasis{padding:14px;border-left:3px solid ${themeColors[state.theme]};background:#f6f8fd}.image-plan{padding:18px;background:#f7f8fb;border:1px dashed #ccd3df;border-radius:12px;margin:14px 0}.cta{display:inline-block;background:${themeColors[state.theme]};color:#fff;padding:8px 14px;border-radius:99px}</style></head><body>${body}</body></html>`;
  const blob = new Blob([html],{type:'text/html;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='极刻云AI文章.html'; a.click(); URL.revokeObjectURL(a.href); toast('HTML 已导出');
}

async function generateImage(index){
  if(!state.article) return;
  const s=state.article.sections[index]; if(!s) return;
  toast('正在生成配图…');
  try{
    const data=await fetchJson('/api/image',{method:'POST',body:JSON.stringify({prompt:s.imagePrompt})});
    const slot=$(`[data-preview-image="${index}"]`); if(slot) slot.innerHTML=`<img src="${data.image}" alt="AI配图">`;
    const plan=$(`[data-image-index="${index}"]`); if(plan) plan.innerHTML=`<img src="${data.image}" style="max-width:100%;border-radius:10px" alt="AI配图"><br><small>${escapeHtml(s.imageCaption||'')}</small>`;
    toast('配图已生成');
  }catch(e){toast(e.message)}
}

$$('.quick-prompts button').forEach(b=>b.addEventListener('click',()=>{
  const examples={
    '招生宣传':'帮我写一篇学校秋季招生公众号文章，面向家长，突出办学规范、教学管理、食宿环境和限额报名，风格高级可信。',
    '品牌推文':'为一个AI商业设计平台写一篇品牌介绍推文，突出效率、专业和企业级能力。',
    '活动预告':'写一篇校园开放日活动预告，信息清晰、有参与感，并给出报名CTA。',
    '产品发布':'写一篇新产品上线推文，包含用户痛点、核心功能、使用场景和行动引导。',
    '教育干货':'写一篇给小学生家长看的教育干货文章，主题是如何培养孩子的专注力，实用、克制、不制造焦虑。'
  }; $('#prompt').value=examples[b.textContent]||'';
}));

$('#generate').addEventListener('click',generate);
$('#prompt').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')generate()});
$('#autoImage').addEventListener('click',e=>e.currentTarget.classList.toggle('on'));
$$('.segmented button').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
$$('[data-revise]').forEach(b=>b.addEventListener('click',()=>revise(b.dataset.revise)));
$('#copyWechat').addEventListener('click',copyWechat);
$('#exportHtml').addEventListener('click',exportHtml);
$('#newTask').addEventListener('click',()=>{state.article=null;$('#prompt').value='';$('#emptyState').classList.remove('hidden');$('#articleEditor').classList.add('hidden');$('#structurePanel').classList.add('hidden');$('#seoPanel').classList.add('hidden');$('#phonePreview').innerHTML='<div class="phone-empty"><div class="mini-cover">JIKE AI</div><h4>等待生成内容</h4><p>完成创作后，这里会即时显示手机端排版效果。</p></div>';toast('已新建创作');});

$$('.theme-dots button').forEach(b=>b.addEventListener('click',()=>{
  state.theme=b.dataset.theme; document.documentElement.style.setProperty('--preview',themeColors[state.theme]);
  $$('.theme-dots button').forEach(x=>x.classList.toggle('active',x===b));
}));

$$('.nav-item').forEach(b=>b.addEventListener('click',()=>{
  $$('.nav-item').forEach(x=>x.classList.toggle('active',x===b));
  const a=b.dataset.action;
  if(a==='seo' && state.article){switchTab('seo'); return}
  if(a==='humanize' && state.article){revise('humanize');return}
  if(a==='image' && state.article){generateImage(0);return}
  if(a==='title' && state.article){switchTab('seo');toast('标题、封面文案已在SEO面板');return}
  if(a==='layout' && state.article){switchTab('article');toast('可在右侧切换主题色查看排版');return}
  $('#prompt').focus();
}));

$('#articleEditor').addEventListener('dblclick',e=>{
  const plan=e.target.closest('[data-image-index]'); if(plan) generateImage(Number(plan.dataset.imageIndex));
});

loadStatus();
