#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 root 执行：sudo bash deploy/bootstrap-ubuntu.sh"
  exit 1
fi

# 清理旧脚本误加的 Docker Ubuntu/Debian 官方源，避免 Debian Buster 404。
rm -f /etc/apt/sources.list.d/docker.list /etc/apt/sources.list.d/docker.sources

apt-get update
apt-get install -y ca-certificates curl git docker.io docker-compose

systemctl enable --now docker

# 验证 Docker 与 Compose。Debian Buster 通常提供 docker-compose 独立命令；
# 新系统若已有 Compose plugin，也同时支持 docker compose。
docker --version
if docker compose version >/dev/null 2>&1; then
  docker compose version
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose --version
else
  echo "Docker Compose 安装失败"
  exit 1
fi

mkdir -p /opt/jikeyun

echo "Docker 已安装并启动。"
