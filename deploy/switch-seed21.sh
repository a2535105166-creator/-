#!/usr/bin/env bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "请使用 root 执行"; exit 1; }
APP="/opt/jikeyun"
ENV="$APP/backend/.env"
cd "$APP"
git pull --ff-only
[ -f "$ENV" ] || { echo "未找到 $ENV"; exit 1; }
if grep -q '^AI_MODEL=' "$ENV"; then
  sed -i 's/^AI_MODEL=.*/AI_MODEL=doubao-seed-2-1-pro-260628/' "$ENV"
else
  printf '\nAI_MODEL=doubao-seed-2-1-pro-260628\n' >> "$ENV"
fi
systemctl restart jikeyun-ai
sleep 2
echo "=== 当前模型 ==="
curl -sS http://127.0.0.1:3000/api/health; echo
echo "=== 真实生成测试 ==="
curl -sS -H 'Content-Type: application/json; charset=utf-8' \
  -d '{"prompt":"写一段100字左右的学校招生宣传文案","platform":"微信公众号","style":"高级","length":"精简","brand":"极刻云"}' \
  http://127.0.0.1:3000/api/generate; echo
