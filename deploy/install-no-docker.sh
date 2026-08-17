#!/usr/bin/env bash
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "请使用 root 执行"; exit 1; }
DOMAIN="115-190-53-80.sslip.io"
APP="/opt/jikeyun"

[ -d "$APP/.git" ] || { echo "未找到 $APP，请先确认项目已存在"; exit 1; }
[ -f "$APP/backend/.env" ] || { echo "未找到 $APP/backend/.env（方舟 Key 配置）。"; exit 1; }

cd "$APP"
git pull --ff-only

# 不再依赖 Docker Hub，直接使用系统包
apt-get update
apt-get install -y python3 ca-certificates nginx certbot python3-certbot-nginx

cat > /etc/systemd/system/jikeyun-ai.service <<'EOF'
[Unit]
Description=JikeYun Real AI Backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/jikeyun/backend
EnvironmentFile=/opt/jikeyun/backend/.env
ExecStart=/usr/bin/python3 /opt/jikeyun/backend/server.py
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now jikeyun-ai
sleep 2

echo "本机后端状态："
curl -fsS http://127.0.0.1:3000/api/health || { echo; journalctl -u jikeyun-ai -n 80 --no-pager; exit 1; }
echo

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
systemctl enable --now nginx
systemctl reload nginx

# 使用 Let's Encrypt 给 sslip.io 主机名申请公网证书
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d "$DOMAIN"

systemctl reload nginx

echo "最终检测："
for i in $(seq 1 20); do
  if curl -fsS --max-time 8 "https://${DOMAIN}/api/health"; then
    echo
    echo "✅ 极刻云真实AI后端上线成功：https://${DOMAIN}"
    echo "✅ 前端：https://a2535105166-creator.github.io/-/"
    echo "✅ 已脱离 Docker Hub"
    exit 0
  fi
  sleep 3
done

echo "⚠️ 本机服务已启动，但公网 HTTPS 检测未通过。"
echo "请确认火山安全组入方向 TCP 80、443 已放行。"
echo "--- systemd ---"
systemctl --no-pager --full status jikeyun-ai || true
echo "--- nginx ---"
systemctl --no-pager --full status nginx || true
exit 2
