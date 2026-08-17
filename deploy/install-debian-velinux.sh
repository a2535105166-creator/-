#!/usr/bin/env bash
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "请使用 sudo/root 执行"; exit 1; }

DOMAIN="115-190-53-80.sslip.io"
ORIGIN="https://a2535105166-creator.github.io"
REPO="https://github.com/a2535105166-creator/-.git"

# 清理旧脚本错误加入的 Docker Ubuntu/Debian 官方源
rm -f /etc/apt/sources.list.d/docker.list /etc/apt/sources.list.d/docker.sources

apt-get update
apt-get install -y ca-certificates curl git docker.io docker-compose
systemctl enable --now docker

echo "Docker 环境："
docker --version
docker-compose --version

rm -rf /opt/jikeyun
git clone --depth 1 "$REPO" /opt/jikeyun
cd /opt/jikeyun

read -rsp "请输入新建的火山方舟 API Key（输入不会显示）: " K </dev/tty
echo >/dev/tty
[ -n "$K" ] || { echo "API Key 不能为空"; exit 1; }

cat > backend/.env <<EOF
AI_PROVIDER=doubao
AI_API_KEY=${K}
AI_MODEL=doubao-seed-2-0-pro-260215
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
IMAGE_MODEL=doubao-seedream-5-0-260128
ALLOWED_ORIGINS=${ORIGIN}
PORT=3000
EOF
chmod 600 backend/.env
printf 'API_DOMAIN=%s\n' "$DOMAIN" > deploy/.env
chmod 600 deploy/.env

cd deploy
docker-compose --env-file .env up -d --build

echo "容器状态："
docker-compose ps

echo "检测 HTTPS..."
for i in $(seq 1 40); do
  if curl -fsS --max-time 5 "https://${DOMAIN}/api/health"; then
    echo
    echo "✅ 后端上线成功：https://${DOMAIN}"
    echo "✅ 前端：https://a2535105166-creator.github.io/-/"
    exit 0
  fi
  sleep 3
done

echo "⚠️ Docker 已启动，但 HTTPS 尚未通过。请确认火山安全组入方向开放 TCP 80 和 443。"
docker-compose logs --tail=80 caddy || true
exit 2
