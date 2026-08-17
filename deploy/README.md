# 极刻云真实 AI · 火山引擎部署

## 推荐服务器
- 火山引擎 ECS，北京地域
- Ubuntu 24.04 LTS
- 2 vCPU / 4 GiB 内存
- 40 GiB 系统盘
- 公网 3–5 Mbps
- 安全组开放 22、80、443；不要长期对公网开放 3000

## 1. 方舟环境变量
复制 `backend/.env.example` 为 `backend/.env`，填写 `AI_API_KEY`。
默认文本模型：`doubao-seed-2-0-pro-260215`
默认图片模型：`doubao-seedream-4-5-251128`

## 2. 后端域名
复制 `deploy/.env.example` 为 `deploy/.env`，把 `API_DOMAIN` 改成你的后端域名，例如 `api.example.com`，并把该域名 A 记录解析到 ECS 公网 IP。

## 3. 初始化 Ubuntu
```bash
sudo bash deploy/bootstrap-ubuntu.sh
```

## 4. 启动服务
```bash
cd deploy
docker compose up -d --build
```

Caddy 会在域名解析生效后自动申请 HTTPS 证书，并把请求反向代理到 Node 后端。

## 5. 连接 GitHub Pages 前端
把根目录 `config.js` 中的 `window.JIKE_API_BASE` 设置成你的 HTTPS 后端地址，例如：
```js
window.JIKE_API_BASE = 'https://api.example.com';
```
提交后 GitHub Pages 会自动重新发布。

## 6. 验收
访问：
- `https://你的后端域名/api/health`
- `https://你的后端域名/api/status`

状态返回 `mode: live` 后，再打开前端页面进行真实文章与图片生成测试。
