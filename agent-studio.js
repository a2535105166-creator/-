(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const API_BASE = String(window.JIKE_API_BASE || '').replace(/\/$/, '');
  const apiUrl = p => `${API_BASE}${p}`;

  let savedRange = null;
  let savedSelectionText = '';
  let busy = false;

  const templateMap = {
    '极简商务':'business-blue','商务':'business-blue','蓝色':'business-blue',
    '书香教育':'school-book','教育':'school-book','学校':'school-book',
    '高级杂志':'black-gold','杂志':'black-gold','黑金':'black-gold','高端':'black-gold',
    '清新活力':'campus-blue','校园':'campus-blue','活力':'campus-blue',
    '爆款招生':'admission-red','招生':'admission-red','红色':'admission-red',
    '政务深蓝':'gov-navy','政务':'gov-navy',
    '科技紫':'tech-purple','科技':'tech-purple','AI':'tech-purple',
    '清新绿':'fresh-green','绿色':'fresh-green','健康':'fresh-green',
    '亲子暖橙':'parent-orange','亲子':'parent-orange',
    '极简灰':'minimal-gray','极简':'minimal-gray',
    '国风朱砂':'china-red','国风':'china-red',
    '节日喜庆':'festival-red','节日':'festival-red'
  };

  function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function toast(msg){
    const el=$('#toast'); if(!el) return;
    el.textContent=msg; el.classList.add('show');
    clearTimeout(window.__agentToast); window.__agentToast=setTimeout(()=>el.classList.remove('show'),2300);
  }
  async function api(path, options={}){
    const opts={cache:'no-store',...options};
    if(opts.body) opts.headers={'Content-Type':'application/json',...(opts.headers||{})};
    const r=await fetch(apiUrl(path),opts);
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'豆包接口请求失败');
    return d;
  }

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if(!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const ed = $('#articleEditor');
    if(ed && !sel.isCollapsed && ed.contains(range.commonAncestorContainer)){
      savedRange = range.cloneRange();
      savedSelectionText = sel.toString().trim();
    }
  });

  function currentContext(){
    const ed=$('#articleEditor');
    const text=(ed?.innerText||'').replace(/\n{3,}/g,'\n\n').trim();
    return {
      title: $('#docTitle')?.value || '',
      text: text.slice(0,16000),
      selectedText: savedSelectionText.slice(0,5000),
      template: ed?.dataset.wxTemplate || 'business-blue',
      wordCount: text.replace(/\s/g,'').length,
      hasArticle: !!text && !ed?.querySelector('.editor-placeholder')
    };
  }

  async function planWithDoubao(message){
    const d=await api('/api/agent',{
      method:'POST',
      body:JSON.stringify({message,context:currentContext()})
    });
    if(!d.plan || !Array.isArray(d.plan.actions)) throw new Error('豆包没有返回可执行智能体计划');
    return d.plan;
  }

  function addMessage(role, html){
    const box=$('#jikeAgentChat'); if(!box) return;
    const d=document.createElement('div');
    d.className=`jike-agent-msg ${role}`;
    d.innerHTML=html;
    box.appendChild(d); box.scrollTop=box.scrollHeight;
    return d;
  }
  function addProgress(text){ return addMessage('status',`<span class="agent-spinner"></span>${esc(text)}`); }

  async function waitGenerate(){
    const btn=$('#generate');
    for(let i=0;i<160;i++){
      if(btn && !btn.disabled && !$('#articleEditor')?.querySelector('.editor-placeholder')) return true;
      await sleep(250);
    }
    return false;
  }

  function articleFromDom(){
    const ed=$('#articleEditor');
    const sections=[...ed.querySelectorAll('.doc-section')].map(s=>({
      heading:s.querySelector('h2,h3')?.innerText?.trim()||'',
      body:[...s.querySelectorAll(':scope > p')].map(p=>p.innerText.trim()).filter(Boolean).join('\n'),
      emphasis:s.querySelector('.emphasis')?.innerText?.trim()||'',
      imagePrompt:s.querySelector('.image-plan span')?.innerText?.trim()||'',
      imageCaption:(s.querySelector('.image-plan')?.innerText||'').split('\n')[1]||''
    })).filter(s=>s.heading||s.body);
    return {
      title:$('#docTitle')?.value||'未命名文章',
      subtitle:ed.querySelector('.subtitle')?.innerText?.trim()||'',
      summary:ed.querySelector('.summary')?.innerText?.trim()||'',
      coverCopy:$('#docTitle')?.value||'',
      keywords:[],seoDescription:'',aigcRisk:35,aigcAdvice:'',
      sections,
      closing:ed.querySelector('.closing')?.innerText?.trim()||'',
      cta:ed.querySelector('.cta')?.innerText?.trim()||''
    };
  }

  function renderStructuredArticle(a){
    const ed=$('#articleEditor'); if(!ed) return;
    const sections=(a.sections||[]).map((s,i)=>`<section class="doc-section" data-index="${i}"><h2>${esc(s.heading||'')}</h2><p>${esc(s.body||'').replace(/\n/g,'<br>')}</p>${s.emphasis?`<div class="emphasis">${esc(s.emphasis)}</div>`:''}${s.imagePrompt?`<div class="image-plan" contenteditable="false" data-image-index="${i}"><b>AI 配图建议 ${String(i+1).padStart(2,'0')}</b><br>${esc(s.imageCaption||'文章配图')}<br><span>${esc(s.imagePrompt)}</span></div>`:''}</section>`).join('');
    $('#docTitle').value=a.title||$('#docTitle').value;
    ed.innerHTML=`<div class="doc-kicker">JIKE AI · 豆包智能成稿</div>${a.subtitle?`<div class="subtitle">${esc(a.subtitle)}</div>`:''}${a.summary?`<div class="summary">${esc(a.summary)}</div>`:''}${sections}${a.closing?`<p class="closing"><b>${esc(a.closing)}</b></p>`:''}${a.cta?`<div class="cta">${esc(a.cta)}</div>`:''}`;
    window.dispatchEvent(new CustomEvent('jike:article-rendered',{detail:{article:a,prompt:'',platform:'微信公众号',style:'高级',brand:''}}));
    $('#wordCount').textContent=`${(ed.innerText||'').replace(/\s/g,'').length} 字`;
  }

  function chooseTemplate(name){
    if(!name) return 'business-blue';
    if(Object.values(templateMap).includes(name)) return name;
    for(const [k,v] of Object.entries(templateMap)) if(String(name).includes(k)) return v;
    return 'business-blue';
  }

  async function execute(action){
    const type=action?.type;
    if(type==='create_article'){
      const p=String(action.prompt||'').trim();
      if(!p) throw new Error('缺少文章需求');
      $('#prompt').value=p;
      if(action.style && $('#style')){
        const opt=[...$('#style').options].find(o=>o.textContent.includes(action.style)||o.value===action.style);
        if(opt) $('#style').value=opt.value;
      }
      if(action.length && $('#length')){
        const opt=[...$('#length').options].find(o=>o.textContent.includes(action.length)||o.value===action.length);
        if(opt) $('#length').value=opt.value;
      }
      if(action.brand && $('#brand')) $('#brand').value=action.brand;
      $('#generate').click();
      if(!await waitGenerate()) throw new Error('豆包文章生成超时');
      return '豆包已经生成完整文章';
    }
    if(type==='layout'){
      const id=chooseTemplate(action.template||action.style||'business-blue');
      window.JikeWechatStudio?.applyTemplate?.(id,false,true);
      $(`[data-main-style="${id}"]`)?.click();
      return '全文排版已切换';
    }
    if(type==='optimize'){
      const article=articleFromDom();
      if(!article.sections.length) throw new Error('请先生成或粘贴正文');
      const mode=['polish','rewrite','humanize','concise'].includes(action.mode)?action.mode:'polish';
      const d=await api('/api/action',{method:'POST',body:JSON.stringify({action:mode,article})});
      renderStructuredArticle(d.article);
      return '豆包已经完成AI优化';
    }
    if(type==='generate_image'){
      const prompt=String(action.prompt||'').trim();
      if(!prompt) throw new Error('缺少图片描述');
      const d=await api('/api/image',{method:'POST',body:JSON.stringify({prompt})});
      const ed=$('#articleEditor');
      ed.insertAdjacentHTML('beforeend',`<figure class="agent-generated-image" contenteditable="false"><img src="${d.image}" alt="豆包AI配图"><figcaption>${esc(action.caption||'豆包 Seedream 智能配图')}</figcaption></figure><p><br></p>`);
      return 'Seedream图片已生成并插入正文';
    }
    if(type==='insert_block'){
      window.JikeWechatStudio?.insertBlock?.(action.block||'highlight');
      return '排版组件已插入';
    }
    if(type==='replace_selection'){
      if(!savedRange || !savedSelectionText) throw new Error('请先在正文中选中要修改的文字');
      const range=savedRange.cloneRange();
      range.deleteContents();
      range.insertNode(document.createTextNode(String(action.text||'')));
      savedRange=null; savedSelectionText='';
      return '豆包已替换选中文字';
    }
    if(type==='set_title'){
      $('#docTitle').value=String(action.text||'').trim()||$('#docTitle').value;
      return '标题已更新';
    }
    if(type==='preview'){ $('#previewBtn')?.click(); return '预览已打开'; }
    if(type==='copy'){ $('#copyWechat')?.click(); return '公众号富文本已复制'; }
    if(type==='detect'){ $('#detectBtn')?.click(); return 'AIGC检测已执行'; }
    return '';
  }

  function renderSuggestions(items=[]){
    const box=$('#jikeAgentSuggestions'); if(!box) return;
    box.innerHTML=items.slice(0,4).map(x=>`<button>${esc(x)}</button>`).join('');
  }

  async function sendAgent(message){
    message=String(message||'').trim();
    if(!message||busy) return;
    busy=true;
    addMessage('user',esc(message));
    const input=$('#jikeAgentInput'); if(input) input.value='';
    renderSuggestions([]);
    const thinking=addProgress('豆包正在理解你的要求并规划操作…');
    try{
      const plan=await planWithDoubao(message);
      thinking?.remove();
      addMessage('assistant',`<b>极刻豆包智能体</b><p>${esc(plan.reply||'我来直接处理。')}</p>`);
      for(const action of plan.actions){
        const p=addProgress(`正在执行：${esc(action.type||'AI操作')}`);
        try{
          const result=await execute(action);
          p.innerHTML=`<span class="agent-done">✓</span>${esc(result||'已完成')}`;
        }catch(e){
          p.innerHTML=`<span class="agent-error">!</span>${esc(e.message||'执行失败')}`;
        }
      }
      renderSuggestions(plan.suggestions);
    }catch(e){
      thinking?.remove();
      addMessage('assistant',`<b>极刻豆包智能体</b><p>豆包调用失败：${esc(e.message||'接口不可达')}</p><small>当前智能体只调用你自己的豆包后端，不再使用任何第三方备用模型。</small>`);
    }finally{busy=false;}
  }

  function buildUI(){
    const right=$('.right-main'); if(!right||$('#jikeAgentPanel')) return;

    const imageWorkspace=document.createElement('div');
    imageWorkspace.id='jikeImageWorkspace';
    while(right.firstChild) imageWorkspace.appendChild(right.firstChild);

    const modes=document.createElement('div');
    modes.className='jike-agent-modes';
    modes.innerHTML='<button class="active" data-agent-mode="agent">✦ 豆包智能体</button><button data-agent-mode="image">▧ Seedream生图</button><button data-agent-mode="library">⌕ 图片库</button>';

    const panel=document.createElement('section');
    panel.id='jikeAgentPanel';
    panel.className='jike-agent-panel';
    panel.innerHTML=`
      <div class="jike-agent-head"><div><span class="agent-orb">✦</span><div><b>极刻豆包内容智能体</b><small>理解需求 · 调用工具 · 直接改稿</small></div></div><span class="agent-model">Doubao Seed 2.1 Pro</span></div>
      <div class="jike-agent-capabilities"><button data-agent-prompt="帮我从零写一篇公众号文章，并自动选择合适排版">豆包写文章</button><button data-agent-prompt="只帮我把当前文章重新排版，不要修改任何文字">只做排版</button><button data-agent-prompt="把当前文章优化得更自然，降低AI机械感">降AI痕迹</button><button data-agent-prompt="根据当前文章自动生成3张不同章节的配图并插入正文">自动配3图</button></div>
      <div class="jike-agent-chat" id="jikeAgentChat"><div class="jike-agent-msg assistant"><b>极刻豆包智能体</b><p>你只需要说结果，我会调用豆包执行：</p><ul><li>写一篇学校招生文章，自动配3张图，用高级杂志风</li><li>这篇不要改文字，只重新排版</li><li>把我选中的这一段改得更自然</li><li>降AI痕迹，然后打开预览</li></ul></div></div>
      <div class="jike-agent-suggestions" id="jikeAgentSuggestions"></div>
      <div class="jike-agent-compose"><textarea id="jikeAgentInput" placeholder="直接告诉豆包智能体你要它做什么…"></textarea><div><span id="jikeSelectionHint">未选择正文</span><button id="jikeAgentSend">发送执行</button></div></div>`;

    right.appendChild(modes);
    right.appendChild(panel);
    right.appendChild(imageWorkspace);
    imageWorkspace.classList.add('hidden');

    modes.addEventListener('click',e=>{
      const b=e.target.closest('[data-agent-mode]'); if(!b) return;
      $$('[data-agent-mode]').forEach(x=>x.classList.toggle('active',x===b));
      const mode=b.dataset.agentMode;
      panel.classList.toggle('hidden',mode!=='agent');
      imageWorkspace.classList.toggle('hidden',mode==='agent');
      if(mode==='library') imageWorkspace.querySelector('[data-imgtab="unsplash"]')?.click();
      if(mode==='image') imageWorkspace.querySelector('[data-imgtab="ai"]')?.click();
    });

    $('#jikeAgentSend').addEventListener('click',()=>sendAgent($('#jikeAgentInput').value));
    $('#jikeAgentInput').addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAgent(e.currentTarget.value)}
    });
    panel.addEventListener('click',e=>{
      const b=e.target.closest('[data-agent-prompt]'); if(b) sendAgent(b.dataset.agentPrompt);
    });
    $('#jikeAgentSuggestions').addEventListener('click',e=>{
      const b=e.target.closest('button'); if(b) sendAgent(b.textContent);
    });

    const toolbar=$('.editor-toolbar');
    if(toolbar&&!$('#openAgentBtn')){
      const b=document.createElement('button');
      b.id='openAgentBtn'; b.className='tool-btn agent'; b.textContent='✦ 豆包智能体';
      toolbar.insertBefore(b,toolbar.firstChild);
      b.addEventListener('click',()=>{$('[data-agent-mode="agent"]')?.click();$('#jikeAgentInput')?.focus()});
    }

    document.addEventListener('selectionchange',()=>{
      const hint=$('#jikeSelectionHint');
      if(hint) hint.textContent=savedSelectionText?`已选中 ${savedSelectionText.length} 字，可让豆包直接修改`:'未选择正文';
    });

    document.addEventListener('click',e=>{
      const agentNav=e.target.closest('[data-topnav="agent"]');
      if(agentNav){
        e.preventDefault();
        e.stopImmediatePropagation();
        $('[data-agent-mode="agent"]')?.click();
        $('#jikeAgentInput')?.focus();
      }
    },true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',buildUI); else buildUI();
  window.JikeContentAgent={send:sendAgent,context:currentContext};
})();
