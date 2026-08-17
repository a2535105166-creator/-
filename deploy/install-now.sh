#!/usr/bin/env bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "请用 sudo 执行"; exit 1; }
BASE="https://raw.githubusercontent.com/a2535105166-creator/-/main"
curl -fsSL "$BASE/deploy/bootstrap-ubuntu.sh" -o /tmp/jikeyun-bootstrap.sh
bash /tmp/jikeyun-bootstrap.sh
rm -rf /opt/jikeyun
git clone --depth 1 https://github.com/a2535105166-creator/-.git /opt/jikeyun
bash /opt/jikeyun/deploy/activate.sh
