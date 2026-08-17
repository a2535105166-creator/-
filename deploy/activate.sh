#!/usr/bin/env bash
set -euo pipefail
D="115-190-53-80.sslip.io"
O="https://a2535105166-creator.github.io"
cd /opt/jikeyun
read -rsp "请输入火山方舟 API Key（输入不会显示）: " K </dev/tty; echo >/dev/tty
[ -n "$K" ] || { echo "API Key 不能为空"; exit 1; }
cat > backend/.env <<EOF
AI_PROVIDER=doubao
AI_API_KEY=${K}
AI_MODEL=doubao-seed-2-0-pro-260215
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
IMAGE_MODEL=doubao-seedream-5-0-260128
ALLOWED_ORIGINS=${O}
PORT=3000
EOF
chmod 600 backend/.env
printf 'API_DOMAIN=%s\n' "$D" > deploy/.env
chmod 600 deploy/.env
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then ufw allow 22/tcp || true; ufw allow 80/tcp || true; ufw allow 443/tcp || true; fi
cd deploy
docker compose --env-file .env up -d --build
echo "服务已启动，检测 HTTPS..."
for i in $(seq 1 24); do
  if curl -fsS --max-time 5 "https://${D}/api/health"; then
    echo; echo "上线成功：https://${D}"
    echo "前端：https://a2535105166-creator.github.io/-/"
    exit 0
  fi
  sleep 3
done
echo "容器已启动，但 HTTPS 未通过。请在火山安全组放行 TCP 80/443。"
docker compose ps
exit 2
