(() => {
  const templates = [
    {id:'business-blue',name:'商务蓝',desc:'品牌·企业·通用',accent:'#2457ff',soft:'#eef3ff'},
    {id:'school-book',name:'书香教育',desc:'学校·教育·成长',accent:'#2f6b5a',soft:'#f1f7f3'},
    {id:'admission-red',name:'招生红',desc:'招生·活动·转化',accent:'#d93a36',soft:'#fff2f0'},
    {id:'gov-navy',name:'政务深蓝',desc:'通知·简报·政策',accent:'#174b83',soft:'#eef5fb'},
    {id:'black-gold',name:'黑金杂志',desc:'高端·人物·品牌',accent:'#9b7a39',soft:'#f7f3e9'},
    {id:'fresh-green',name:'清新绿',desc:'健康·生活·自然',accent:'#26946a',soft:'#eef9f4'},
    {id:'parent-orange',name:'亲子暖橙',desc:'家长·亲子·陪伴',accent:'#e77b32',soft:'#fff5eb'},
    {id:'tech-purple',name:'科技紫',desc:'AI·科技·产品',accent:'#6d55db',soft:'#f3f0ff'},
    {id:'minimal-gray',name:'极简灰',desc:'观点·深度·长文',accent:'#5e6673',soft:'#f3f4f6'},
    {id:'china-red',name:'国风朱砂',desc:'文化·节气·传统',accent:'#b82c2c',soft:'#fbf0ea'},
    {id:'campus-blue',name:'校园活力',desc:'校园·社团·活动',accent:'#1689c9',soft:'#ecf8ff'},
    {id:'festival-red',name:'节日喜庆',desc:'节庆·福利·热点',accent:'#e13d32',soft:'#fff1e8'}
  ];

  const blocks = {
    title: '<div class="wx-block wx-block-title" contenteditable="true">在这里输入小标题</div>',
    quote: '<div class="wx-block wx-quote" contenteditable="true">把一句值得被记住的话放在这里。好的金句，会成为整篇文章的记忆点。</div>',
    highlight: '<div class="wx-block wx-highlight" contenteditable="true"><b>重点内容</b><br>把最重要的信息、政策、福利或核心优势放在这里。</div>',
    notice: '<div class="wx-block wx-notice" contenteditable="true"><b>温馨提示：</b>这里适合放报名须知、活动提醒、注意事项或关键时间节点。</div>',
    steps: '<div class="wx-block"><div class="wx-step"><span class="wx-step-num">01</span><div class="wx-step-body" contenteditable="true"><b>第一步</b><br>填写步骤说明</div></div><div class="wx-step"><span class="wx-step-num">02</span><div class="wx-step-body" contenteditable="true"><b>第二步</b><br>填写步骤说明</div></div><div class="wx-step"><span class="wx-step-num">03</span><div class="wx-step-body" contenteditable="true"><b>第三步</b><br>填写步骤说明</div></div></div>',
    cards: '<div class="wx-block wx-two-col"><div class="wx-mini-card" contenteditable="true"><b>01</b><strong>亮点一</strong><br>填写核心优势</div><div class="wx-mini-card" contenteditable="true"><b>02</b><strong>亮点二</strong><br>填写核心优势</div></div>',
    divider: '<div class="wx-divider" contenteditable="false"></div>',
    ending: '<div class="wx-block wx-ending" contenteditable="true"><b>行动起来</b><span>在这里填写报名、咨询、预约、关注或转发引导</span></div>'
  };

  let fontSize = Number(localStorage.getItem('jike-wx-font') || 13);
  let lineHeight = Number(localStorage.getItem('jike-wx-line') || 1.9);
  let currentTemplate = localStorage.getItem('jike-wx-template') || 'business-blue';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function toast(msg){
    const el=$('#toast'); if(!el) return;
    el.textContent=msg; el.classList.add('show');
    clearTimeout(window.__wxToast); window.__wxToast=setTimeout(()=>el.classList.remove('show'),2200);
  }

  function renderTemplates(){
    const wrap=$('#wxTemplateStrip'); if(!wrap) return;
    wrap.innerHTML=templates.map(t=>`<button class="wx-template ${t.id===currentTemplate?'active':''}" data-wx-template="${t.id}" title="${t.desc}"><div class="wx-thumb" style="--wx-accent:${t.accent};--wx-soft:${t.soft}"></div><strong>${t.name}</strong><span>${t.desc}</span></button>`).join('');
  }

  function applyTypography(){
    const editor=$('#articleEditor'); if(!editor) return;
    editor.style.setProperty('--wx-line',String(lineHeight));
    editor.style.lineHeight=String(lineHeight);
    editor.querySelectorAll('p').forEach(p=>{p.style.fontSize=fontSize+'px';p.style.lineHeight=String(lineHeight)});
    editor.querySelectorAll('.summary,.emphasis,.wx-highlight,.wx-notice,.wx-quote,.wx-step-body,.wx-mini-card').forEach(x=>x.style.lineHeight=String(lineHeight));
  }

  function applyTemplate(id, silent=false){
    currentTemplate=id;
    localStorage.setItem('jike-wx-template',id);
    const editor=$('#articleEditor');
    const phone=$('#phonePreview');
    if(editor){editor.classList.add('wx-pro');editor.dataset.wxTemplate=id;}
    if(phone){phone.classList.add('wx-pro');phone.dataset.wxTemplate=id;}
    $$('.wx-template').forEach(b=>b.classList.toggle('active',b.dataset.wxTemplate===id));
    applyTypography();
    if(!silent){const t=templates.find(x=>x.id===id);toast(`已套用：${t?.name||'公众号模板'}`)}
  }

  function insertBlock(type){
    const editor=$('#articleEditor');
    if(!editor || editor.classList.contains('hidden') || !editor.innerText.trim()) return toast('请先生成或输入文章内容');
    const html=blocks[type]; if(!html) return;
    editor.insertAdjacentHTML('beforeend',html);
    applyTypography();
    editor.scrollIntoView({behavior:'smooth',block:'center'});
    toast('版式组件已插入，可直接修改文字');
  }

  const inlineProps=['font-family','font-size','font-weight','font-style','line-height','letter-spacing','color','background-color','text-align','text-decoration','border','border-top','border-right','border-bottom','border-left','border-radius','padding','padding-top','padding-right','padding-bottom','padding-left','margin','margin-top','margin-right','margin-bottom','margin-left','display','width','max-width','box-sizing','white-space'];

  function buildWechatHtml(){
    const src=$('#articleEditor');
    const clone=src.cloneNode(true);
    const srcNodes=[src,...src.querySelectorAll('*')];
    const cloneNodes=[clone,...clone.querySelectorAll('*')];
    srcNodes.forEach((node,i)=>{
      const target=cloneNodes[i]; if(!target || node.nodeType!==1) return;
      const cs=getComputedStyle(node);
      const styles=[];
      inlineProps.forEach(prop=>{const v=cs.getPropertyValue(prop);if(v && v!=='normal' && v!=='none' && v!=='0px')styles.push(`${prop}:${v}`)});
      if(node.classList.contains('wx-divider')) styles.push(`height:1px;background-color:${cs.color||'#2457ff'}`);
      target.setAttribute('style',styles.join(';'));
      target.removeAttribute('contenteditable');
      [...target.attributes].forEach(a=>{if(a.name.startsWith('data-')) target.removeAttribute(a.name)});
    });
    clone.removeAttribute('contenteditable');
    clone.removeAttribute('class');
    clone.removeAttribute('id');
    return clone.innerHTML;
  }

  async function richCopy(){
    const editor=$('#articleEditor');
    if(!editor || editor.classList.contains('hidden') || !editor.innerText.trim()) return toast('请先生成文章');
    applyTypography();
    const html=buildWechatHtml();
    const plain=editor.innerText;
    try{
      if(window.ClipboardItem && navigator.clipboard?.write){
        await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([plain],{type:'text/plain'})})]);
        toast('已复制公众号富文本，粘贴即可保留样式');
      }else{
        await navigator.clipboard.writeText(plain);toast('浏览器不支持富文本剪贴板，已复制文字');
      }
    }catch(e){
      try{await navigator.clipboard.writeText(plain);toast('已复制文字内容')}catch{toast('复制失败，请允许剪贴板权限')}
    }
  }

  function init(){
    renderTemplates();
    applyTemplate(currentTemplate,true);
    const fs=$('#wxFontSize'), lh=$('#wxLineHeight');
    if(fs) fs.value=String(fontSize);
    if(lh) lh.value=String(lineHeight);
    $('#wxTemplateStrip')?.addEventListener('click',e=>{const b=e.target.closest('[data-wx-template]');if(b)applyTemplate(b.dataset.wxTemplate)});
    $('#wxTools')?.addEventListener('click',e=>{const b=e.target.closest('[data-wx-block]');if(b)insertBlock(b.dataset.wxBlock)});
    $('#wxRichCopy')?.addEventListener('click',richCopy);
    fs?.addEventListener('change',()=>{fontSize=Number(fs.value);localStorage.setItem('jike-wx-font',String(fontSize));applyTypography();toast('正文字号已调整')});
    lh?.addEventListener('change',()=>{lineHeight=Number(lh.value);localStorage.setItem('jike-wx-line',String(lineHeight));applyTypography();toast('正文行距已调整')});
    const editor=$('#articleEditor');
    if(editor){
      const observer=new MutationObserver(()=>{applyTemplate(currentTemplate,true)});
      observer.observe(editor,{childList:true,subtree:false});
    }
    const phone=$('#phonePreview');
    if(phone){
      const observer2=new MutationObserver(()=>{phone.classList.add('wx-pro');phone.dataset.wxTemplate=currentTemplate});
      observer2.observe(phone,{childList:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();