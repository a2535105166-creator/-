#!/usr/bin/env bash
set -euo pipefail

ROOT=/opt/jikeyun
BACKEND=http://127.0.0.1:3000
SITE=/etc/nginx/sites-available/jikeyun-local-http

if [ "$(id -u)" -ne 0 ]; then
  echo '请使用 root 执行'
  exit 1
fi

if [ ! -f "$ROOT/index.html" ]; then
  echo "缺少 $ROOT/index.html"
  exit 2
fi

if [ ! -f "$ROOT/app.js" ]; then
  echo "缺少 $ROOT/app.js"
  exit 3
fi

systemctl restart jikeyun-ai
sleep 1
curl -fsS "$BACKEND/api/health" >/tmp/jikeyun-health.json

# 清理会抢占80默认站点的旧配置，仅针对本项目已知文件
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/jikeyun-api
rm -f /etc/nginx/sites-enabled/jikeyun-sslip
rm -f /etc/nginx/sites-enabled/jikeyun-local-http

cat > "$SITE" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /opt/jikeyun;
    index index.html;

    location = /config.js {
        default_type application/javascript;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        return 200 "window.JIKE_API_BASE='';\n";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
EOF

ln -sfn "$SITE" /etc/nginx/sites-enabled/jikeyun-local-http
nginx -t
systemctl reload nginx

sleep 1

echo '=== 本机页面 ==='
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1/
echo '=== 本机AI状态 ==='
curl -fsS http://127.0.0.1/api/status
echo
echo '=== 公网地址 ==='
echo 'http://115.190.56.127/'
echo '=== 完成 ==='
