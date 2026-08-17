#!/usr/bin/env bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "请使用 root 执行"; exit 1; }
APP="/opt/jikeyun"
cd "$APP"
git pull --ff-only
systemctl restart jikeyun-ai
sleep 2

echo "=== 健康检查 ==="
curl -fsS http://127.0.0.1:3000/api/health
echo

echo "=== 中文生成测试 ==="
RESP=$(curl -fsS --max-time 120 \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{"prompt":"写一段简短的中文教育宣传文案","platform":"微信公众号","style":"高级","length":"精简","brand":"极刻云"}' \
  http://127.0.0.1:3000/api/generate)
printf '%s\n' "$RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("mode=",d.get("mode")); print("provider=",d.get("provider")); a=d.get("article") or {}; print("title=",a.get("title")); print("sections=",len(a.get("sections") or [])); print("error=",d.get("error"))'

echo "=== 公网检查 ==="
curl -fsS https://115-190-56-127.sslip.io/api/health
echo

echo "✅ Latin-1 中文编码修复已应用"
