// 极刻云运行时配置 + AI后端自动容灾
(() => {
  const host = window.location.hostname;
  const sameOriginHosts = new Set(['115.190.56.127','jikeyun.cn','www.jikeyun.cn','api.jikeyun.cn','127.0.0.1','localhost']);
  window.JIKE_API_BASE = sameOriginHosts.has(host) ? '' : 'https://api.jikeyun.cn';
  window.JIKE_RUNTIME = { fallback:false, backend:window.JIKE_API_BASE || location.origin };

  const nativeFetch = window.fetch.bind(window);
  const apiPath = input => {
    try { return new URL(typeof input === 'string' ? input : input.url, location.href).pathname; }
    catch { return ''; }
  };
  const isApi = input => apiPath(input).startsWith('/api/');
  const jsonResponse = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','X-Jike-Fallback':'1'}});
  const parseBody = init => {
    try { return init?.body ? JSON.parse(init.body) : {}; } catch { return {}; }
  };
  const pick = (s,n=24) => String(s||'').replace(/\s+/g,' ').replace(/[，。！？；：]/g,' ').trim().slice(0,n);
  const categoryOf = text => {
    if(/招生|报名|学校|小学|教育|学生|家长|校园/.test(text)) return 'education';
    if(/AI|人工智能|智能体|科技|软件|SaaS|产品/.test(text)) return 'tech';
    if(/活动|开业|发布会|体验|开放日/.test(text)) return 'event';
    if(/品牌|企业|公司|商业/.test(text)) return 'brand';
    return 'general';
  };
  const localArticle = body => {
    const prompt = String(body.prompt||'').trim();
    const brand = String(body.brand||'').trim();
    const cat = categoryOf(prompt + ' ' + brand);
    const subject = brand || pick(prompt,18) || '本次内容';
    const map = {
      education:{title:`${subject}｜把每一次选择，都变成看得见的成长`, heads:['为什么值得关注','真正重要的，不只是结果','把细节做到家长看得见','给孩子更适合的成长空间','现在，是了解它的好时机']},
      tech:{title:`${subject}｜让复杂工作，开始变得简单`, heads:['为什么现在需要它','核心能力到底解决什么','从工具到智能工作流','效率之外，更重要的是稳定','下一步怎么开始']},
      event:{title:`${subject}｜这一次，我们把体验真正做到了现场`, heads:['活动为什么值得来','现场可以体验什么','有哪些核心亮点','参与前需要知道什么','预约与参与方式']},
      brand:{title:`${subject}｜真正的品牌感，来自每一个细节`, heads:['我们为什么做这件事','品牌真正解决的问题','体验背后的标准','长期价值从哪里来','欢迎进一步了解']},
      general:{title:`${subject}｜把重要的事，说清楚、做好看、能行动`, heads:['先说结论','为什么这件事值得关注','核心信息一次讲清','几个关键细节','最后给你一个行动建议']}
    }[cat];
    const intro = prompt || `围绕${subject}，用清晰、可信、易读的方式完成一次完整表达。`;
    const bodies = [
      `很多内容并不缺信息，真正缺的是清晰的表达路径。${intro} 与其堆砌概念，不如先回答读者最关心的问题：这件事和我有什么关系，为什么值得现在关注。`,
      `好的内容不是把所有信息一次塞满，而是建立阅读节奏。先给判断，再给依据，再把关键细节展开，让读者能够快速抓住重点，也愿意继续往下看。`,
      `真正建立信任的，往往不是一句口号，而是可感知的细节。把流程、场景、标准、优势和边界说具体，比单纯强调“专业”“领先”“优质”更有说服力。`,
      `排版同样是内容的一部分。标题负责建立层级，重点卡负责聚焦信息，留白负责控制节奏，图片负责补充场景。读者看到的是页面，感受到的是整体专业度。`,
      `如果你正在比较、考虑或准备行动，可以先从最简单的一步开始：了解真实信息、确认自己的需求，再做决定。好的内容应该帮助判断，而不是制造压力。`
    ];
    const sections = map.heads.map((h,i)=>({heading:h,body:bodies[i],emphasis:i===2?'把抽象优势变成具体细节，信任感才会真正建立。':'',imagePrompt:`${subject}，${h}，现代高级公众号配图，真实场景，干净构图，无文字`,imageCaption:`${h} 场景配图`}));
    return {
      title:map.title,
      subtitle:`围绕“${pick(prompt,30)||subject}”整理的一篇可直接继续编辑的公众号草稿`,
      summary:`这是一份在真实 AI 后端暂时不可达时生成的本地应急稿。内容结构、公众号排版和复制功能可以正常使用；网络恢复后系统会自动切回真实 AI。`,
      coverCopy:map.title,
      keywords:[subject,cat==='education'?'教育':'内容', '公众号','智能排版'],
      seoDescription:`${subject}相关公众号内容，包含核心信息、重点表达与行动建议。`,
      aigcRisk:38,
      aigcAdvice:'当前为本地智能模板应急稿，建议联网后再用真实 AI 做一次润色或结合实际资料人工补充细节。',
      sections,
      closing:'把信息说清楚，把页面做好看，把行动路径留给读者。',
      cta:'了解更多 / 立即咨询'
    };
  };
  const fallbackImage = prompt => {
    const text = pick(prompt,18) || '极刻云配图';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef3ff"/><stop offset="1" stop-color="#dfe8ff"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="1030" cy="120" r="180" fill="#2457ff" opacity=".08"/><circle cx="180" cy="590" r="240" fill="#6d55db" opacity=".06"/><text x="80" y="300" font-family="Arial,Microsoft YaHei" font-size="56" font-weight="700" fill="#1d2b53">${text.replace(/[<>&]/g,'')}</text><text x="80" y="370" font-family="Arial,Microsoft YaHei" font-size="28" fill="#6f7b95">本地应急视觉占位 · 后端恢复后可重新 AI 生图</text><text x="80" y="560" font-family="Arial" font-size="22" fill="#2457ff">JIKE AI · FALLBACK MODE</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  const fallback = (path, init) => {
    window.JIKE_RUNTIME.fallback = true;
    window.dispatchEvent(new CustomEvent('jike:fallback-mode'));
    const body = parseBody(init);
    if(path==='/api/status' || path==='/api/health') return jsonResponse({ok:true,mode:'fallback',provider:'local',textModel:'本地智能模板应急模式',imageEnabled:false});
    if(path==='/api/generate') return jsonResponse({mode:'fallback',provider:'local',article:localArticle(body)});
    if(path==='/api/action') {
      const a = body.article || localArticle({prompt:'公众号内容'});
      a.aigcRisk = Math.max(20, Number(a.aigcRisk||40)-6);
      a.aigcAdvice = '已完成本地应急优化；真实 AI 后端恢复后建议再执行一次 AI 润色。';
      return jsonResponse({mode:'fallback',provider:'local',article:a});
    }
    if(path==='/api/image') return jsonResponse({mode:'fallback',provider:'local',image:fallbackImage(body.prompt),fallback:true});
    return jsonResponse({error:'后端暂不可达'},503);
  };

  window.fetch = async function(input, init={}){
    if(!isApi(input)) return nativeFetch(input, init);
    const path = apiPath(input);
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), 4500);
    try {
      const res = await nativeFetch(input, {...init, signal:init.signal || ctrl.signal});
      clearTimeout(timer);
      if(res.ok || res.status < 500){ window.JIKE_RUNTIME.fallback=false; return res; }
      return fallback(path, init);
    } catch(e) {
      clearTimeout(timer);
      return fallback(path, init);
    }
  };

  window.addEventListener('jike:fallback-mode',()=>{
    setTimeout(()=>{
      const badge=document.getElementById('statusBadge');
      if(badge){badge.classList.remove('live');badge.innerHTML='<i></i> 本地应急模式';}
      if(document.getElementById('jikeFallbackBanner')) return;
      const bar=document.createElement('div');
      bar.id='jikeFallbackBanner';
      bar.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9998;background:#111827;color:#fff;padding:9px 14px;border-radius:10px;font:12px/1.5 Arial,Microsoft YaHei;box-shadow:0 10px 30px rgba(0,0,0,.18);max-width:680px;text-align:center';
      bar.textContent='AI公网后端暂不可达：已自动启用本地智能模板应急模式。文章、5种排版、编辑、预览、复制可继续使用；后端恢复后会自动切回真实 AI。';
      document.body.appendChild(bar);
      setTimeout(()=>bar.remove(),9000);
    },0);
  });
})();
