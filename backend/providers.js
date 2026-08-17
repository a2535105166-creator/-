export function getProvider(){
  const name=(process.env.AI_PROVIDER||'doubao').toLowerCase();
  const all={
    doubao:{base:process.env.AI_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3',key:process.env.AI_API_KEY||process.env.ARK_API_KEY||'',model:process.env.AI_MODEL||'doubao-seed-2-0-lite-260215'},
    deepseek:{base:process.env.AI_BASE_URL||'https://api.deepseek.com',key:process.env.AI_API_KEY||process.env.DEEPSEEK_API_KEY||'',model:process.env.AI_MODEL||'deepseek-v4-flash'},
    qwen:{base:process.env.AI_BASE_URL||'https://dashscope.aliyuncs.com/compatible-mode/v1',key:process.env.AI_API_KEY||process.env.DASHSCOPE_API_KEY||'',model:process.env.AI_MODEL||'qwen-plus'}
  };
  if(!all[name]) throw new Error('AI_PROVIDER 仅支持 doubao / deepseek / qwen');
  return {name,...all[name]};
}

export async function chat(provider,messages){
  if(!provider.key) throw new Error(`尚未配置 ${provider.name} API Key`);
  const r=await fetch(`${provider.base.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${provider.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:provider.model,messages,temperature:0.7})});
  const d=await r.json();
  if(!r.ok) throw new Error(d?.error?.message||`模型接口错误 ${r.status}`);
  const t=d?.choices?.[0]?.message?.content;
  if(!t) throw new Error('模型没有返回内容');
  return t;
}

export async function doubaoImage(provider,prompt){
  if(provider.name!=='doubao') throw new Error('当前智能配图默认使用豆包 Seedream');
  const model=process.env.IMAGE_MODEL||'doubao-seedream-4-0-250828';
  const r=await fetch(`${provider.base.replace(/\/$/,'')}/images/generations`,{method:'POST',headers:{Authorization:`Bearer ${provider.key}`,'Content-Type':'application/json'},body:JSON.stringify({model,prompt,size:'2K',sequential_image_generation:'disabled',stream:false,response_format:'url',watermark:false})});
  const d=await r.json();
  if(!r.ok) throw new Error(d?.error?.message||`图片接口错误 ${r.status}`);
  return d?.data?.[0]?.url||null;
}
