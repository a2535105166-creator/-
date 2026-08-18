#!/usr/bin/env bash
set -euo pipefail

DOMAIN="api.jikeyun.com"
EXPECTED_IP="115.190.56.127"
APP_PORT="3000"
ENV_FILE="/opt/jikeyun/backend/.env"
NGINX_SITE="/etc/nginx/sites-available/jikeyun-api"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 root 执行"
  exit 1
fi

echo "=== 1. 检查 DNS ==="
RESOLVED="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}')"
if [ "$RESOLVED" != "$EXPECTED_IP" ]; then
  echo "DNS_NOT_READY"
  echo "请先把 $DOMAIN 的 A 记录指向 $EXPECTED_IP"
  echo "当前解析: ${RESOLVED:-无}"
  exit 20
fi

echo "DNS_OK $DOMAIN -> $RESOLVED"

echo "=== 2. 固定 AI 模型与跨域 ==="
python3 - <<'PY'
from pathlib import Path
p=Path('/opt/jikeyun/backend/.env')
if not p.exists():
    raise SystemExit('缺少 /opt/jikeyun/backend/.env')
vals={
    'AI_MODEL':'doubao-seed-2-1-pro-260628',
    'IMAGE_MODEL':'doubao-seedream-5-0-260128',
    'ALLOWED_ORIGINS':'https://a2535105166-creator.github.io,https://jikeyun.com,https://www.jikeyun.com'
}
lines=p.read_text(encoding='utf-8').splitlines()
out=[]; seen=set()
for line in lines:
    if '=' in line and not line.lstrip().startswith('#'):
        k=line.split('=',1)[0].strip()
        if k in vals:
            out.append(k+'='+vals[k]); seen.add(k); continue
    out.append(line)
for k,v in vals.items():
    if k not in seen: out.append(k+'='+v)
p.write_text('\n'.join(out)+'\n',encoding='utf-8')
p.chmod(0o600)
PY

systemctl restart jikeyun-ai
sleep 2
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/tmp/jikeyun-health.json
cat /tmp/jikeyun-health.json
echo

echo "=== 3. 配置 Nginx ==="
cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF
ln -sfn "$NGINX_SITE" /etc/nginx/sites-enabled/jikeyun-api
nginx -t
systemctl reload nginx

echo "=== 4. 申请 HTTPS ==="
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d "$DOMAIN"

echo "=== 5. 最终验收 ==="
curl -fsS "https://${DOMAIN}/api/health" >/tmp/jikeyun-public-health.json
cat /tmp/jikeyun-public-health.json
echo

echo "=== 6. CORS 验收 ==="
HEADERS="$(mktemp)"
curl -sS -D "$HEADERS" -o /dev/null -X OPTIONS \
  -H 'Origin: https://a2535105166-creator.github.io' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' \
  "https://${DOMAIN}/api/generate"
grep -i '^Access-Control-Allow-Origin:' "$HEADERS" || true
rm -f "$HEADERS"

echo "DONE"
echo "API=https://${DOMAIN}"
echo "WEB=https://a2535105166-creator.github.io/-/"
