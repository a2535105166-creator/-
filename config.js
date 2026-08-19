// 极刻云 AI 智能路由：Doubao 后端优先，GPT-5.4 Mini 云端自动接管
(() => {
  const host = window.location.hostname;
  const sameOriginHosts = new Set(['115.190.56.127','jikeyun.cn','www.jikeyun.cn','api.jikeyun.cn','127.0.0.1','localhost']);
  window.JIKE_API_BASE = sameOriginHosts.has(host) ? '' : 'https://api.jikeyun.cn';
  window.JIKE_RUNTIME = {
    route: 'checking',
    primary: window.JIKE_API_BASE || location.origin,
    textModel: 'Doubao Seed 2.1 Pro',
    backupTextModel: 'GPT-5.4 Mini',
    imageModel: 'Doubao Seedream',
    backupImageModel: 'GPT Image 2'
  };

  const nativeFetch = window.fetch.bind(window);
  const jsonResponse = (data, status=200) => new Response(JSON.stringify(data), {
    status,
    headers:{'Content-Type':'application/json; charset=utf-8','X-Jike-AI-Route':String(data.route||'cloud')}
  });
  const apiPath = input => {
    try { return new URL(typeof input === 'string' ? input : input.url, location.href).pathname; }
    catch { return ''; }
  };
  const isJikeApi = input => apiPath(input).startsWith('/api/');
  const parseBody = init => { try { return init?.body ? JSON.parse(init.body) : {}; } catch { return {}; } };
  const escJsonFence = s => String(s||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();

  function markCloudUI(model='GPT-5.4 Mini'){
    window.JIKE_RUNTIME.route='cloud';
    window.JIKE_RUNTIME.textModel=model;
    setTimeout(()=>{
      const badge=document.getElementById('statusBadge');
      if(badge){badge.classList.add('live');badge.innerHTML='<i></i> 云端大模型已连接';}
      const agent=document.getElementById('agentStatus');
      if(agent) agent.textContent=`在线 · ${model}`;
    },120);
  }
  function markPrimaryUI(model='Doubao Seed 2.1 Pro'){
    window.JIKE_RUNTIME.route='primary';
    window.JIKE_RUNTIME.textModel=model;
    setTimeout(()=>{
      const badge=document.getElementById('statusBadge');
      if(badge){badge.classList.add('live');badge.innerHTML='<i></i> AI已连接';}
      const agent=document.getElementById('agentStatus');
      if(agent) agent.textContent=`在线 · ${model}`;
    },120);
  }

  function responseText(result){
    const c=result?.message?.content;
    if(typeof c==='string') return c;
    if(Array.isArray(c)) return c.map(x=>typeof x==='string'?x:(x?.text||'')).join('');
    if(typeof result==='string') return result;
    return String(c||result||'');
  }
  function parseArticle(raw){
    let text=escJsonFence(raw);
    let data;
    try{ data=JSON.parse(text); }
    catch{
      const a=text.indexOf('{'), b=text.lastIndexOf('}');
      if(a>=0 && b>a) data=JSON.parse(text.slice(a,b+1));
      else throw new Error('大模型返回格式异常，请再生成一次');
    }
    if(data.article && typeof data.article==='object') data=data.article;
    const sections=Array.isArray(data.sections)?data.sections:[];
    if(!data.title || !sections.length) throw new Error('大模型返回内容不完整，请再生成一次');
    data.subtitle=String(data.subtitle||'');
    data.summary=String(data.summary||'');
    data.coverCopy=String(data.coverCopy||data.title);
    data.keywords=Array.isArray(data.keywords)?data.keywords:[];
    data.seoDescription=String(data.seoDescription||'');
    data.aigcRisk=Number.isFinite(Number(data.aigcRisk))?Number(data.aigcRisk):30;
    data.aigcAdvice=String(data.aigcAdvice||'建议发布前人工终审。');
    data.closing=String(data.closing||'');
    data.cta=String(data.cta||'');
    data.sections=sections.map(s=>({
      heading:String(s?.heading||''), body:String(s?.body||''), emphasis:String(s?.emphasis||''),
      imagePrompt:String(s?.imagePrompt||''), imageCaption:String(s?.imageCaption||'')
    })).filter(s=>s.heading && s.body);
    return data;
  }

  const ARTICLE_SCHEMA = `只输出严格 JSON，不要 Markdown，不要代码块。字段必须完整：
{
  "title":"",
  "subtitle":"",
  "summary":"",
  "coverCopy":"",
  "keywords":[""],
  "seoDescription":"",
  "aigcRisk":0,
  "aigcAdvice":"",
  "sections":[{"heading":"","body":"","emphasis":"","imagePrompt":"","imageCaption":""}],
  "closing":"",
  "cta":""
}`;

  async function puterChat(messages){
    if(!window.puter?.ai?.chat) throw new Error('云端大模型组件未加载，请刷新页面后重试');
    const result=await window.puter.ai.chat(messages,{model:'openai/gpt-5.4-mini'});
    markCloudUI('GPT-5.4 Mini');
    return responseText(result);
  }

  async function generateByCloud(body){
    const system=`你是“极刻云AI主编”，是一名资深中文公众号总编、内容策略师和视觉编辑。你的任务不是凑字数，而是产出可以直接进入公众号编辑器的成品。\n要求：\n1. 中文自然、具体、有节奏，不写空洞套话。\n2. 先理解目标受众和传播目的，再设计标题、摘要和正文结构。\n3. 每个章节正文应有真实的信息密度，段落清晰。\n4. emphasis 只放真正值得突出的一句话。\n5. imagePrompt 要能直接给图片模型使用，写清主体、场景、构图、光线、风格，并明确“no text / 无文字”。\n6. 不编造用户没有提供的具体数据、资质、政策或时间。\n7. aigcRisk 为你对语言机械感的0-100自评。\n${ARTICLE_SCHEMA}`;
    const user=`请生成公众号成品。\n用户需求：${body.prompt||''}\n发布平台：${body.platform||'微信公众号'}\n风格：${body.style||'高级'}\n篇幅：${body.length||'中等'}\n品牌主体：${body.brand||'未指定'}\n自动配图规划：${body.autoImage===false?'否':'是'}\n请根据篇幅决定章节数量和正文长度。`;
    const raw=await puterChat([{role:'system',content:system},{role:'user',content:user}]);
    return {mode:'live',route:'cloud',provider:'puter',textModel:'GPT-5.4 Mini',article:parseArticle(raw)};
  }

  async function reviseByCloud(body){
    const actions={polish:'润色，提升表达质量和节奏，但不要改变核心事实',rewrite:'重写，使结构更清晰、更有传播力',humanize:'显著降低AI机械感，增加自然句式、具体表达和人类编辑感',concise:'精简冗余，但保留关键信息和说服力'};
    const system=`你是极刻云公众号总编。请对已有文章做${actions[body.action]||'专业优化'}。不得凭空增加未经提供的事实。返回完整文章对象。${ARTICLE_SCHEMA}`;
    const user=`原文章JSON：\n${JSON.stringify(body.article||{})}`;
    const raw=await puterChat([{role:'system',content:system},{role:'user',content:user}]);
    return {mode:'live',route:'cloud',provider:'puter',textModel:'GPT-5.4 Mini',article:parseArticle(raw)};
  }

  async function imageByCloud(body){
    if(!window.puter?.ai?.txt2img) throw new Error('云端图片模型组件未加载，请刷新后重试');
    const prompt=String(body.prompt||'').trim();
    if(!prompt) throw new Error('请输入生图提示词');
    const img=await window.puter.ai.txt2img(prompt,{model:'openai/gpt-image-2',quality:'medium'});
    if(!img?.src) throw new Error('图片模型没有返回图片');
    markCloudUI('GPT-5.4 Mini');
    return {mode:'live',route:'cloud',provider:'puter',imageModel:'GPT Image 2',image:img.src};
  }

  async function cloudRoute(path, init){
    const body=parseBody(init);
    if(path==='/api/status' || path==='/api/health'){
      if(!window.puter?.ai?.chat) throw new Error('云端大模型未加载');
      markCloudUI('GPT-5.4 Mini');
      return {ok:true,mode:'live',route:'cloud',provider:'puter',textModel:'GPT-5.4 Mini',imageEnabled:true,imageModel:'GPT Image 2'};
    }
    if(path==='/api/generate') return generateByCloud(body);
    if(path==='/api/action') return reviseByCloud(body);
    if(path==='/api/image') return imageByCloud(body);
    throw new Error('不支持的AI接口');
  }

  window.fetch = async function(input, init={}){
    if(!isJikeApi(input)) return nativeFetch(input,init);
    const path=apiPath(input);
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),4200);
    try{
      const res=await nativeFetch(input,{...init,signal:init.signal||ctrl.signal});
      clearTimeout(timer);
      if(res.ok){
        try{
          const clone=res.clone(); const d=await clone.json();
          if(d?.textModel) markPrimaryUI(d.textModel);
          else markPrimaryUI();
        }catch{ markPrimaryUI(); }
        return res;
      }
      if(res.status<500) return res;
    }catch(e){ clearTimeout(timer); }

    try{
      const data=await cloudRoute(path,init);
      return jsonResponse(data,200);
    }catch(e){
      const message=e?.message||String(e)||'真实大模型调用失败';
      return jsonResponse({error:`真实AI调用失败：${message}。如果浏览器弹出云模型授权窗口，请完成一次授权后重试。`,route:'error'},503);
    }
  };
})();
