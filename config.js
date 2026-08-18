// 极刻云正式/临时入口自动选择
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
})();
