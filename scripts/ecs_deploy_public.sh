#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/yaodian-app}"
PUBLIC_HOST="${PUBLIC_HOST:-39.106.79.115}"
APP_NAME="${APP_NAME:-yaodian-app}"

if [[ -z "${REPO_URL}" ]]; then
  echo "ERROR: REPO_URL is required."
  echo "Example: REPO_URL='https://github.com/<org>/<repo>.git' bash scripts/ecs_deploy_public.sh"
  exit 1
fi

if command -v dnf >/dev/null 2>&1; then
  PKG_MGR="dnf"
elif command -v yum >/dev/null 2>&1; then
  PKG_MGR="yum"
else
  echo "ERROR: neither dnf nor yum is available."
  exit 1
fi

echo "[1/8] Installing system dependencies..."
sudo "${PKG_MGR}" install -y git curl nginx

echo "[2/8] Installing Node.js 20 (if needed)..."
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq "^v(20|21|22|23|24)\."; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo "${PKG_MGR}" install -y nodejs
fi

echo "[3/8] Installing pm2..."
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "[4/8] Syncing app source..."
sudo mkdir -p "${APP_DIR}"
sudo chown -R "${USER}:${USER}" "${APP_DIR}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
git fetch --all --prune
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "[5/8] Preparing .env..."
if [[ ! -f .env ]]; then
  if [[ -f deploy/.env.ecs.example ]]; then
    cp deploy/.env.ecs.example .env
  elif [[ -f .env.example ]]; then
    cp .env.example .env
  fi
  echo "Created .env. Fill QWEN/MEMFIRE keys and rerun."
  exit 1
fi

echo "[6/8] Installing dependencies and building..."
npm ci
npm run build

echo "[7/8] Starting app with pm2..."
# Release occupied 8787 if another app is listening.
EXISTING_PIDS="$(lsof -tiTCP:8787 -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "${EXISTING_PIDS}" ]]; then
  echo "Port 8787 is occupied. Stopping old listeners: ${EXISTING_PIDS}"
  sudo kill -9 ${EXISTING_PIDS} || true
fi

pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
pm2 start npm --name "${APP_NAME}" -- start
pm2 save

# Enable pm2 autostart (ignore if already configured)
PM2_CMD="$(pm2 startup systemd -u "${USER}" --hp "${HOME}" 2>/dev/null | tail -n 1 || true)"
if [[ -n "${PM2_CMD}" ]]; then
  sudo bash -lc "${PM2_CMD}" || true
fi

echo "[8/8] Configuring nginx reverse proxy..."
sudo rm -f /etc/nginx/conf.d/default.conf || true
if [[ -f deploy/nginx.yaodian.conf.template ]]; then
  sed "s/__PUBLIC_HOST__/${PUBLIC_HOST}/g" deploy/nginx.yaodian.conf.template | sudo tee /etc/nginx/conf.d/yaodian.conf >/dev/null
else
  cat <<EOF | sudo tee /etc/nginx/conf.d/yaodian.conf >/dev/null
server {
  listen 80 default_server;
  server_name ${PUBLIC_HOST} _;
  client_max_body_size 20m;
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
fi

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl restart nginx

echo "Done. Health checks:"
curl -sS "http://127.0.0.1:8787/api/health" || true
echo
curl -sS "http://${PUBLIC_HOST}/api/health" || true
echo
curl -sS "http://${PUBLIC_HOST}/api/qwen/health" || true
echo
curl -sS "http://${PUBLIC_HOST}/api/memfire/health" || true
echo
