#!/usr/bin/env bash
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "请使用 root 执行"; exit 1; }
[ -f /opt/jikeyun/backend/.env ] || { echo "未找到 /opt/jikeyun/backend/.env，请重新运行 install-debian-velinux.sh"; exit 1; }

cd /opt/jikeyun
git pull --ff-only
cd deploy

docker-compose up -d --build

echo "容器状态："
docker-compose ps

echo "检测 HTTPS..."
for i in $(seq 1 40); do
  if curl -fsS --max-time 5 https://115-190-53-80.sslip.io/api/health; then
    echo
    echo "✅ 后端上线成功：https://115-190-53-80.sslip.io"
    echo "✅ 前端：https://a2535105166-creator.github.io/-/"
    exit 0
  fi
  sleep 3
done

echo "⚠️ 容器已启动，但 HTTPS 检测未通过。"
echo "请确认火山安全组开放 TCP 80/443，然后执行：docker-compose logs --tail=100 caddy"
docker-compose ps
exit 2
