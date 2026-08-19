// 极刻云生产配置：只调用自有豆包后端
(() => {
  const host = window.location.hostname;
  const sameOriginHosts = new Set([
    '115.190.56.127',
    'jikeyun.cn',
    'www.jikeyun.cn',
    'api.jikeyun.cn',
    '127.0.0.1',
    'localhost'
  ]);

  window.JIKE_API_BASE = sameOriginHosts.has(host) ? '' : 'https://api.jikeyun.cn';
  window.JIKE_RUNTIME = {
    provider: 'doubao',
    apiBase: window.JIKE_API_BASE || location.origin,
    textModel: 'doubao-seed-2-1-pro-260628',
    imageModel: 'doubao-seedream-5-0-260128',
    agentEndpoint: '/api/agent',
    generateEndpoint: '/api/generate',
    actionEndpoint: '/api/action',
    imageEndpoint: '/api/image'
  };
})();
