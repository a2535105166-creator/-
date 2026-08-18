#!/usr/bin/env bash
set -euo pipefail

IP="115.190.56.127"
ROOT_DOMAIN="jikeyun.cn"
WWW_DOMAIN="www.jikeyun.cn"
API_DOMAIN="api.jikeyun.cn"
ROOT="/opt/jikeyun"
APP_PORT="3000"
ENV_FILE="$ROOT/backend/.env"
SITE="/etc/nginx/sites-available/jikeyun-cn"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 root 执行"
  exit 1
fi

resolve4(){ getent ahostsv4 "$1" 2>/dev/null | awk 'NR==1{print $1}'; }

ROOT_IP="$(resolve4 "$ROOT_DOMAIN" || true)"
API_IP="$(resolve4 "$API_DOMAIN" || true)"
if [ "$ROOT_IP" != "$IP" ] || [ "$API_IP" != "$IP" ]; then
  echo "DNS_NOT_READY"
  echo "$ROOT_DOMAIN -> ${ROOT_IP:-无}"
  echo "$API_DOMAIN -> ${API_IP:-无}"
  echo "需要都指向 $IP"
  exit 20
fi

python3 - <<'PY'
from pathlib import Path
p=Path('/opt/jikeyun/backend/.env')
if not p.exists():
    raise SystemExit('缺少 /opt/jikeyun/backend/.env')
vals={
    'AI_MODEL':'doubao-seed-2-1-pro-260628',
    'IMAGE_MODEL':'doubao-seedream-5-0-260128',
    'ALLOWED_ORIGINS':'https://a2535105166-creator.github.io,https://jikeyun.cn,https://www.jikeyun.cn,https://api.jikeyun.cn'
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
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health"
echo

rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/jikeyun-local-http
rm -f /etc/nginx/sites-enabled/jikeyun-api
rm -f /etc/nginx/sites-enabled/jikeyun-sslip
rm -f /etc/nginx/sites-enabled/jikeyun-cn

cat > "$SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${ROOT_DOMAIN} ${WWW_DOMAIN};
    root ${ROOT};
    index index.html;

    location = /config.js {
        default_type application/javascript;
        add_header Cache-Control "no-store" always;
        return 200 "window.JIKE_API_BASE='';\n";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${API_DOMAIN};

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

ln -sfn "$SITE" /etc/nginx/sites-enabled/jikeyun-cn
nginx -t
systemctl reload nginx

CERT_DOMAINS=(-d "$ROOT_DOMAIN" -d "$API_DOMAIN")
WWW_IP="$(resolve4 "$WWW_DOMAIN" || true)"
if [ "$WWW_IP" = "$IP" ]; then
  CERT_DOMAINS+=(-d "$WWW_DOMAIN")
fi

certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect "${CERT_DOMAINS[@]}"

curl -fsS "https://${ROOT_DOMAIN}/api/status"
echo
curl -fsS "https://${API_DOMAIN}/api/status"
echo

echo "DONE"
echo "WEB=https://${ROOT_DOMAIN}/"
echo "API=https://${API_DOMAIN}"
