#!/usr/bin/env bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "请使用 root 执行"; exit 1; }
DOMAIN="115-190-56-127.sslip.io"
APP="/opt/jikeyun"
cd "$APP"
git pull --ff-only

cat > /etc/nginx/sites-available/jikeyun-ai <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 3m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 15s;
        proxy_read_timeout 240s;
        proxy_send_timeout 240s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/jikeyun-ai /etc/nginx/sites-enabled/jikeyun-ai
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "HTTP 检测："
curl -fsS "http://${DOMAIN}/api/health" || true
echo

certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d "$DOMAIN"
systemctl reload nginx

echo "HTTPS 检测："
curl -fsS "https://${DOMAIN}/api/health"
echo
echo "✅ 新公网IP已切换：https://${DOMAIN}"
echo "✅ 前端：https://a2535105166-creator.github.io/-/"
