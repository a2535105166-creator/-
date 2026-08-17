# 极刻云国产 AI 后端

默认接入豆包 / 火山方舟，也可切换 DeepSeek、通义千问。

## 默认豆包
复制 `.env.example` 为运行环境变量，至少配置：

- `AI_PROVIDER=doubao`
- `AI_API_KEY=你的火山方舟 API Key`
- `AI_MODEL=doubao-seed-2-0-lite-260215`
- `AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3`
- `IMAGE_MODEL=doubao-seedream-4-0-250828`
- `ALLOWED_ORIGINS=https://a2535105166-creator.github.io`

启动：`node server.js`

## DeepSeek
设置 `AI_PROVIDER=deepseek`，并配置 DeepSeek API Key。默认模型 `deepseek-v4-flash`。

## 通义千问
设置 `AI_PROVIDER=qwen`，并配置百炼 API Key。默认模型 `qwen-plus`。

## 前端连接
后端获得 HTTPS 地址后，将仓库根目录 `config.js` 的 `window.JIKE_API_BASE` 设置为后端地址即可。API Key 永远只放服务端环境变量，不写入前端和公共仓库。
