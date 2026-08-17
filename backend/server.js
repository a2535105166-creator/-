import http from 'http';
import {getProvider,chat,doubaoImage} from './providers.js';

const PORT=Number(process.env.PORT||3000);
const ORIGINS=new Set((process.env.ALLOWED_ORIGINS||'https://a2535105166-creator.github.io').split(',').map(x=>x.trim()).filter(Boolean));
const provider=getProvider();

function cors(req){const o=req.headers.origin;if(!o||!(ORIGINS.has('*')||ORIGINS.has(o)))return {};return {'Access-Control-Allow-Origin':o,'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}}
function send(req,res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...cors(req)});res.end(JSON.stringify(data))}
function read(req){return new Promise((ok,bad)=>{const a=[];let n=0;req.on('data',c=>{n+=c.length;if(n>2e6){bad(new Error('请求过大'));req.destroy()}else a.push(c)});req.on('end',()=>{try{ok(a.length?JSON.parse(Buffer.concat(a).toString('utf8')):{})}catch{bad(new Error('JSON格式错误'))}});req.on('error',bad)})}
function parse(s=''){s=s.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<a)throw new Error('模型未返回结构化JSON');return JSON.parse(s.slice(a,b+1))}
const shape=`只返回JSON对象，不要Markdown。字段：title, subtitle, summary, coverCopy, keywords数组, seoDescription, aigcRisk(0-100), aigcAdvice, sections数组(3-8节，每节含heading/body/emphasis/imagePrompt/imageCaption), closing, cta。imagePrompt必须英文且不要要求图片中文字。aigcRisk只表示语言机械感/模板感启发式评分，不得声称是第三方检测。`;
function sys(x={}){return `你是中文内容总监、公众号主编和排版策略师。平台：${x.platform||'微信公众号'}；风格：${x.style||'高级'}；篇幅：${x.length||'中等'}；品牌：${x.brand||'未指定'}。内容自然、有信息密度、有阅读节奏；不得虚构资质、数字、承诺或事实；标题有传播力但不标题党。${shape}`}

async function route(req,res){
  if(req.method==='OPTIONS'){res.writeHead(204,cors(req));return res.end()}
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if((u.pathname==='/api/status'||u.pathname==='/api/health')&&req.method==='GET')return send(req,res,200,{ok:true,mode:provider.key?'live':'config_required',provider:provider.name,textModel:provider.model,imageEnabled:Boolean(provider.key&&provider.name==='doubao')});
  if(!provider.key)return send(req,res,503,{error:`AI服务尚未配置 ${provider.name} API Key。`});
  if(u.pathname==='/api/generate'&&req.method==='POST'){
    const x=await read(req);if(!x.prompt||String(x.prompt).trim().length<2)return send(req,res,400,{error:'请输入至少2个字的创作要求。'});
    const out=await chat(provider,[{role:'system',content:sys(x)},{role:'user',content:`完成以下任务：\n${x.prompt}`}]);
    return send(req,res,200,{mode:'live',provider:provider.name,article:parse(out)});
  }
  if(u.pathname==='/api/action'&&req.method==='POST'){
    const x=await read(req);if(!x.article)return send(req,res,400,{error:'缺少文章内容。'});
    const actions={polish:'整体润色，提高表达质量和可读性，不改变事实。',rewrite:'整体重新表达，但保持事实和观点不变。',seo:'优化SEO标题、摘要、关键词和主题词。',humanize:'降低模板感和机械感，增加自然句式变化，不虚构事实。',concise:'压缩冗余表达，让文章更短更有力。'};
    const out=await chat(provider,[{role:'system',content:`你是资深中文主编。${shape}`},{role:'user',content:`${actions[x.action]||'优化文章。'}\n原文章：${JSON.stringify(x.article)}`}]);
    return send(req,res,200,{mode:'live',provider:provider.name,article:parse(out)});
  }
  if(u.pathname==='/api/image'&&req.method==='POST'){
    const x=await read(req);if(!x.prompt)return send(req,res,400,{error:'缺少图片提示词。'});
    const image=await doubaoImage(provider,x.prompt);if(!image)throw new Error('图片模型没有返回结果');return send(req,res,200,{image});
  }
  return send(req,res,404,{error:'API不存在'});
}

http.createServer((req,res)=>route(req,res).catch(e=>send(req,res,500,{error:e.message||'服务器错误'}))).listen(PORT,()=>console.log(`极刻云真实AI后端：${provider.name}/${provider.model} :${PORT}`));
