const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = { article: null, tab: 'article', theme: 'blue', status: null };
const themeColors = { blue:'#2457ff', red:'#e03a3e', green:'#1c9a6b', black:'#222222' };

function toast(message){
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(window.__toast); window.__toast = setTimeout(()=>el.classList.remove('show'), 2200);
}

function demoArticle(input = {}){
  const topic = String(input.prompt || '让内容更快、更好看、更容易发布').trim();
  const platform = input.platform || '微信公众号';
  const brand = String(input.brand || '').trim();
  const who = brand ? `围绕“${brand}”` : '围绕你的主题';
  return {
    title: `${topic.slice(0, 22)}｜一篇可以直接发布的内容`,
    subtitle: `面向${platform}的智能写作与参数化排版示例`,
    summary: `${who}，从选题、结构、正文到配图建议和发布动作，统一在一个内容工作台里完成。`,
    coverCopy: brand ? `${brand} · 内容成品` : '把一句需求，变成一篇成品',
    keywords: [brand || 'AI写作', '公众号排版', '内容生产', '智能体', '自动配图'].filter(Boolean),
    seoDescription: `${brand ? brand + '｜' : ''}AI写作、自动排版、智能配图、标题优化和SEO处理的一体化内容成品示例。`,
    aigcRisk: 38,
    aigcAdvice: '当前是网页演示模式。正式AI版接入服务端模型后，会依据文章内容给出更细的可读性与机械感优化建议。',
    sections: [
      { heading: '01｜先理解你真正要表达什么', body: `你只需要输入一句话，例如“${topic}”。系统会先拆解目标受众、发布平台、语气与核心信息，再组织成清晰的阅读结构。`, emphasis: '先理解，再创作，而不是直接堆文字。', imagePrompt: 'modern Chinese editorial workspace, AI content planning dashboard, premium clean design, editorial photography, no text', imageCaption: '内容策略与结构规划' },
      { heading: '02｜正文与版式一次成型', body: '传统流程往往要在写作、找模板、调格式之间来回切换。极刻云将内容结构与参数化排版合并，让标题、摘要、正文层级、重点信息和手机预览在同一个页面完成。', emphasis: '内容结构由智能体规划，视觉落地由模板系统稳定呈现。', imagePrompt: 'premium mobile article layout, Chinese social media editor interface, white and blue palette, minimal editorial design, no text', imageCaption: '参数化排版稳定复用' },
      { heading: '03｜把配图、SEO和发布合成一条链路', body: '文章生成后，系统同步整理封面文案、关键词、SEO描述和配图提示。你还可以继续润色、改写、自然化、精简，最后复制公众号内容或导出HTML。', emphasis: '最终交付的是可继续编辑、可预览、可导出的内容成品。', imagePrompt: 'content production pipeline, article images SEO publish workflow, futuristic minimal SaaS dashboard, clean premium UI, no text', imageCaption: '从创作到发布的一体化工作流' }
    ],
    closing: '真正高效的内容智能体，不是增加更多按钮，而是把整条内容生产链路缩短。',
    cta: '现在输入你的主题，生成第一篇内容。'
  };
}

function demoRevise(article, action){
  const out = JSON.parse(JSON.stringify(article));
  const labels = { polish:'已润色', rewrite:'已改写', humanize:'已自然化', concise:'已精简', seo:'已SEO优化' };
  out.title = out.title.replace(/（已[^）]+）/g,'') + `（${labels[action] || '已优化'}）`;
  out.aigcRisk = Math.max(15, Number(out.aigcRisk || 38) - 7);
  out.aigcAdvice = '演示优化已应用。正式AI版会基于全文重新生成，而不是只调整标签。';
  if(action==='concise') out.sections = out.sections.map(s=>({...s,body:s.body.replace(/。[^。]{24,}。/,'。')}));
  return out;
}

async function fetchJson(url, options={}){
  const body = options.body ? JSON.parse(options.body) : {};
  await new Promise(r=>setTimeout(r, url.includes('generate') ? 550 : 260));
  if(url.includes('/api/status') || url.includes('/api/health')) return {ok:true, mode:'demo', textModel:'网页版演示', imageEnabled:false};
  if(url.includes('/api/generate')){
    if(!body.prompt || String(body.prompt).trim().length < 2) throw new Error('请输入至少2个字的创作要求。');
    return {mode:'demo', article:demoArticle(body)};
  }
  if(url.includes('/api/action')) return {mode:'demo', article:demoRevise(body.article, body.action)};
  if(url.includes('/api/image')) throw new Error('网页版演示暂不生成真实图片；正式版接入服务端AI后启用。');
  throw new Error('演示接口不存在');
}

async function loadStatus(){
  try{
    const s = await fetchJson('/api/status'); state.status = s;
    const badge = $('#statusBadge');
    badge.classList.add('live');
    badge.innerHTML = `<i></i> ${s.mode === 'live' ? 'AI已连接' : '演示模式'}`;
    $('#sideStatus').textContent = s.mode === 'live' ? `模型：${s.textModel}` : '演示模式 · 配Key后启用AI';
  }catch(e){ $('#statusBadge').innerHTML='<i></i> 服务异常'; }
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
