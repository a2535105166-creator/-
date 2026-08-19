(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './agent-studio.css';
  document.head.appendChild(link);

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
      text: text.slice(0,12000),
      selectedText: savedSelectionText.slice(0,4000),
      template: ed?.dataset.wxTemplate || 'business-blue',
      wordCount: text.replace(/\s/g,'').length,
      hasArticle: !!text && !ed?.querySelector('.editor-placeholder')
    };
  }

  function parseModelText(result){
    const c=result?.message?.content;
    if(typeof c==='string') return c;
    if(Array.isArray(c)) return c.map(x=>typeof x==='string'?x:(x?.text||'')).join('');
    return typeof result==='string'?result:String(c||'');
  }

  async function planWithAI(message){
    if(!window.puter?.ai?.chat) throw new Error('真实大模型组件还未加载，请刷新页面后再试');
    const ctx=currentContext();
    const system=`你是“极刻云内容智能体”，是公众号总编+排版设计师+AI工具调度器。你不是聊天陪伴助手，你的任务是理解用户一句话，然后调用编辑器工具真正完成任务。

当前编辑器上下文会提供：标题、正文、用户选中文字、当前模板、字数。

你可以使用这些动作：
1. create_article：从需求生成一篇完整文章。参数 prompt/style/length/brand。
2. layout：只改变排版，不重写内容。参数 template，允许：business-blue, school-book, black-gold, campus-blue, admission-red, gov-navy, tech-purple, fresh-green, parent-orange, minimal-gray, china-red, festival-red。
3. optimize：优化已有文章。参数 mode，只允许 polish/rewrite/humanize/concise。
4. generate_image：生成并插入配图。参数 prompt，可一次返回多个 generate_image 动作。
5. insert_block：插入排版组件。参数 block，只允许 title/quote/highlight/notice/steps/cards/divider/ending。
6. replace_selection：只有上下文 selectedText 非空时可用，参数 text，替换用户刚才选中的文字。
7. set_title：修改文章标题。参数 text。
8. preview：打开手机预览。
9. copy：复制公众号富文本。
10. detect：执行AIGC检测。
11. answer：只回答问题，不操作编辑器。

重要规则：
- 用户说“只排版/不要改文字”时绝不能 create_article 或 optimize，只能 layout/insert_block。
- 用户要求写文章时优先 create_article，然后可追加 layout 和 generate_image。
- 用户说“自动配图/配3张图”时返回对应数量的 generate_image 动作，每张图提示词都要贴合不同章节。
- 用户要求降AI痕迹，用 optimize humanize。
- 用户要求精简，用 optimize concise。
- 用户要求高端/高级/杂志感，优先 black-gold；教育用 school-book；招生转化用 admission-red；政务用 gov-navy；AI科技用 tech-purple。
- 不编造用户没有提供的事实、政策、资质、数据。
- 你必须只输出严格JSON，不要Markdown：
{"reply":"一句简短说明","actions":[{"type":"..."}],"suggestions":["可继续点击的建议1","建议2","建议3"]}`;
    const user=`用户指令：${message}\n\n编辑器上下文：${JSON.stringify(ctx)}`;
    const result=await window.puter.ai.chat([{role:'system',content:system},{role:'user',content:user}],{model:'openai/gpt-5.4-mini'});
    let raw=parseModelText(result).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    let plan;
    try{ plan=JSON.parse(raw); }
    catch{
      const a=raw.indexOf('{'),b=raw.lastIndexOf('}');
      if(a>=0&&b>a) plan=JSON.parse(raw.slice(a,b+1));
      else throw new Error('智能体没有返回可执行计划，请再说一次');
    }
    plan.actions=Array.isArray(plan.actions)?plan.actions:[];
    plan.suggestions=Array.isArray(plan.suggestions)?plan.suggestions:[];
    return plan;
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
    for(let i=0;i<120;i++){
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
    ed.innerHTML=`<div class="doc-kicker">JIKE AI · 智能成稿</div>${a.subtitle?`<div class="subtitle">${esc(a.subtitle)}</div>`:''}${a.summary?`<div class="summary">${esc(a.summary)}</div>`:''}${sections}${a.closing?`<p class="closing"><b>${esc(a.closing)}</b></p>`:''}${a.cta?`<div class="cta">${esc(a.cta)}</div>`:''}`;
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
      if(action.style && $('#style')) $('#style').value=[...$('#style').options].some(o=>o.value===action.style)?action.style:$('#style').value;
      if(action.length && $('#length')){
        const opt=[...$('#length').options].find(o=>o.textContent.includes(action.length)||o.value===action.length);
        if(opt) $('#length').value=opt.value;
      }
      if(action.brand && $('#brand')) $('#brand').value=action.brand;
      $('#generate').click();
      const ok=await waitGenerate();
      if(!ok) throw new Error('文章生成超时，请再试一次');
      return '文章已经生成';
    }
    if(type==='layout'){
      const id=chooseTemplate(action.template||action.style||'business-blue');
      window.JikeWechatStudio?.applyTemplate?.(id,false,true);
      const btn=$(`[data-main-style="${id}"]`); btn?.click();
      return `已经切换为 ${id} 排版`;
    }
    if(type==='optimize'){
      const article=articleFromDom();
      if(!article.sections.length) throw new Error('请先生成或粘贴正文');
      const mode=['polish','rewrite','humanize','concise'].includes(action.mode)?action.mode:'polish';
      const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,article})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||'优化失败');
      renderStructuredArticle(d.article);
      return '文章已经完成AI优化';
    }
    if(type==='generate_image'){
      const prompt=String(action.prompt||'').trim(); if(!prompt) throw new Error('缺少图片描述');
      const r=await fetch('/api/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||'生图失败');
      const ed=$('#articleEditor');
      ed.insertAdjacentHTML('beforeend',`<figure class="agent-generated-image" contenteditable="false"><img src="${d.image}" alt="AI配图"><figcaption>${esc(action.caption||'AI智能配图')}</figcaption></figure><p><br></p>`);
      return '图片已生成并插入文章';
    }
    if(type==='insert_block'){
      window.JikeWechatStudio?.insertBlock?.(action.block||'highlight');
      return '排版组件已插入';
    }
    if(type==='replace_selection'){
      if(!savedRange || !savedSelectionText) throw new Error('请先在正文中选中要修改的文字，再告诉我怎么改');
      const range=savedRange.cloneRange(); range.deleteContents();
      range.insertNode(document.createTextNode(String(action.text||'')));
      savedRange=null; savedSelectionText='';
      return '已替换选中的文字';
    }
    if(type==='set_title'){
      $('#docTitle').value=String(action.text||'').trim()||$('#docTitle').value;
      return '标题已更新';
    }
    if(type==='preview'){ $('#previewBtn')?.click(); return '预览已打开'; }
    if(type==='copy'){ $('#copyWechat')?.click(); return '已执行复制'; }
    if(type==='detect'){ $('#detectBtn')?.click(); return 'AIGC检测已执行'; }
    return '';
  }

  function renderSuggestions(items=[]){
    const box=$('#jikeAgentSuggestions'); if(!box) return;
    box.innerHTML=items.slice(0,4).map(x=>`<button>${esc(x)}</button>`).join('');
  }

  async function sendAgent(message){
    message=String(message||'').trim(); if(!message||busy) return;
    busy=true;
    addMessage('user',esc(message));
    const input=$('#jikeAgentInput'); if(input) input.value='';
    renderSuggestions([]);
    const thinking=addProgress('正在理解你的要求并规划操作…');
    try{
      const plan=await planWithAI(message);
      thinking?.remove();
      addMessage('assistant',`<b>极刻智能体</b><p>${esc(plan.reply||'我来直接处理。')}</p>`);
      for(const action of plan.actions){
        const p=addProgress(`正在执行：${esc(action.type||'AI操作')}`);
        try{ const result=await execute(action); p.innerHTML=`<span class="agent-done">✓</span>${esc(result||'已完成')}`; }
        catch(e){ p.innerHTML=`<span class="agent-error">!</span>${esc(e.message||'执行失败')}`; }
      }
      renderSuggestions(plan.suggestions);
    }catch(e){
      thinking?.remove();
      addMessage('assistant',`<b>极刻智能体</b><p>这次没有执行成功：${esc(e.message||'模型调用失败')}</p><small>如果浏览器弹出云模型授权窗口，完成一次授权后再试即可。</small>`);
    }finally{busy=false;}
  }

  function buildUI(){
    const right=$('.right-main'); if(!right||$('#jikeAgentPanel')) return;
    const existing=document.createElement('div'); existing.id='jikeImageWorkspace';
    while(right.firstChild) existing.appendChild(right.firstChild);

    const modes=document.createElement('div'); modes.className='jike-agent-modes';
    modes.innerHTML='<button class="active" data-agent-mode="agent">✦ AI智能体</button><button data-agent-mode="image">▧ AI生图</button><button data-agent-mode="library">⌕ 图片库</button>';

    const panel=document.createElement('section'); panel.id='jikeAgentPanel'; panel.className='jike-agent-panel';
    panel.innerHTML=`
      <div class="jike-agent-head"><div><span class="agent-orb">✦</span><div><b>极刻内容智能体</b><small>理解需求 · 调用工具 · 直接改稿</small></div></div><span class="agent-model">GPT-5.4 mini</span></div>
      <div class="jike-agent-capabilities"><button data-agent-prompt="帮我从零写一篇公众号文章，并自动选择合适排版">AI写文章</button><button data-agent-prompt="只帮我把当前文章重新排版，不要修改任何文字">只做排版</button><button data-agent-prompt="把当前文章优化得更自然，降低AI机械感">降AI痕迹</button><button data-agent-prompt="根据当前文章自动生成3张不同章节的配图并插入正文">自动配3图</button></div>
      <div class="jike-agent-chat" id="jikeAgentChat"><div class="jike-agent-msg assistant"><b>极刻智能体</b><p>你直接告诉我结果，例如：</p><ul><li>写一篇学校招生文章，自动配3张图，用高级杂志风</li><li>这篇不要改文字，只重新排版</li><li>把我选中的这一段写得更自然</li><li>降AI痕迹，然后预览</li></ul></div></div>
      <div class="jike-agent-suggestions" id="jikeAgentSuggestions"></div>
      <div class="jike-agent-compose"><textarea id="jikeAgentInput" placeholder="直接告诉智能体你要它做什么…"></textarea><div><span id="jikeSelectionHint">未选择正文</span><button id="jikeAgentSend">发送执行</button></div></div>`;

    right.appendChild(modes); right.appendChild(panel); right.appendChild(existing);
    existing.classList.add('hidden');

    modes.addEventListener('click',e=>{
      const b=e.target.closest('[data-agent-mode]'); if(!b) return;
      $$('[data-agent-mode]').forEach(x=>x.classList.toggle('active',x===b));
      const mode=b.dataset.agentMode;
      panel.classList.toggle('hidden',mode!=='agent');
      existing.classList.toggle('hidden',mode==='agent');
      if(mode==='library'){
        existing.classList.remove('hidden');
        const stock=existing.querySelector('[data-imgtab="unsplash"]'); stock?.click();
      }
    });

    $('#jikeAgentSend').addEventListener('click',()=>sendAgent($('#jikeAgentInput').value));
    $('#jikeAgentInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAgent(e.currentTarget.value)}});
    $('#jikeAgentPanel').addEventListener('click',e=>{
      const b=e.target.closest('[data-agent-prompt]'); if(b) sendAgent(b.dataset.agentPrompt);
    });
    $('#jikeAgentSuggestions').addEventListener('click',e=>{const b=e.target.closest('button');if(b)sendAgent(b.textContent)});

    const toolbar=$('.editor-toolbar');
    if(toolbar&&!$('#openAgentBtn')){
      const b=document.createElement('button'); b.id='openAgentBtn'; b.className='tool-btn agent'; b.textContent='✦ 智能体';
      toolbar.insertBefore(b,toolbar.firstChild);
      b.addEventListener('click',()=>{$('[data-agent-mode="agent"]')?.click();$('#jikeAgentInput')?.focus()});
    }

    document.addEventListener('selectionchange',()=>{
      const hint=$('#jikeSelectionHint'); if(hint) hint.textContent=savedSelectionText?`已选中 ${savedSelectionText.length} 字，可让AI直接修改`:'未选择正文';
    });

    document.addEventListener('click',e=>{
      const agentNav=e.target.closest('[data-topnav="agent"]');
      if(agentNav){
        e.preventDefault(); e.stopImmediatePropagation();
        $('[data-agent-mode="agent"]')?.click(); $('#jikeAgentInput')?.focus();
      }
    },true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',buildUI); else buildUI();
  window.JikeContentAgent={send:sendAgent,context:currentContext};
})();