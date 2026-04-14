#!/bin/bash
set -e

# ============================================
# Roam Richer — Deploy to Oracle VPS
# ============================================
# App lives in Docker (postgres + backend)
# System nginx handles domain + SSL
#
# First time:  sudo bash deploy/deploy.sh --first-time
# Redeploy:    sudo bash deploy/deploy.sh
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../app" && pwd)"

echo "🚀 Roam Richer Deployment"
echo "========================="
echo "   App dir: $APP_DIR"

# ----------------------------------------
# First-time setup
# ----------------------------------------
if [[ "$1" == "--first-time" ]]; then
    echo ""
    echo "📦 First-time setup..."

    # Install Docker if not present
    if ! command -v docker &>/dev/null; then
        echo "🐳 Installing Docker..."
        apt update
        apt install -y docker.io docker-compose-plugin
        systemctl enable docker
        systemctl start docker
        echo "✅ Docker installed"
    else
        echo "✅ Docker already installed"
    fi

    # Install pnpm if not present
    if ! command -v pnpm &>/dev/null; then
        echo "📦 Installing pnpm..."
        npm install -g pnpm
        echo "✅ pnpm installed"
    fi

    # Install python deps for places import
    echo "🐍 Installing Python deps for data import..."
    pip3 install duckdb psycopg2-binary 2>/dev/null || apt install -y python3-pip && pip3 install duckdb psycopg2-binary

    echo ""
    echo "✅ First-time setup complete"
    echo ""
fi

# ----------------------------------------
# 1. Build frontend
# ----------------------------------------
echo ""
echo "📦 Building frontend..."
cd "$APP_DIR"
source .env 2>/dev/null || true

cd frontend
pnpm install
pnpm build
cd "$APP_DIR"
echo "✅ Frontend built → frontend/dist/"

# ----------------------------------------
# 2. Start Docker services (postgres + backend)
# ----------------------------------------
echo ""
echo "🐳 Starting Docker services..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for PostgreSQL..."
sleep 8

# ----------------------------------------
# 3. Run migrations
# ----------------------------------------
echo ""
echo "🗄️  Running migrations..."
docker compose -f docker-compose.prod.yml exec backend node /app/backend/dist/db/migrate.js 2>/dev/null \
    || echo "   ⚠️  Migrations may need manual run"

# ----------------------------------------
# 4. Setup nginx (first time only — copies config)
# ----------------------------------------
NGINX_CONF="/etc/nginx/sites-available/roamricher"
if [[ ! -f "$NGINX_CONF" ]]; then
    echo ""
    echo "🌐 Setting up nginx for app.roamricher.com..."
    cp "$SCRIPT_DIR/nginx-roamricher.conf" "$NGINX_CONF"
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/roamricher
    nginx -t && systemctl reload nginx
    echo "✅ nginx configured"
    echo ""
    echo "   ⚠️  NOW point DNS: app.roamricher.com → your server IP"
    echo "   Then run: sudo certbot --nginx -d app.roamricher.com"
fi

# ----------------------------------------
# 5. Health check
# ----------------------------------------
echo ""
echo "🏥 Health check..."
sleep 3
if curl -sf http://localhost:3847/api/health > /dev/null 2>&1; then
    echo "✅ Backend healthy!"
else
    echo "⚠️  Backend not ready — check: docker compose -f docker-compose.prod.yml logs backend"
fi

# ----------------------------------------
# Done
# ----------------------------------------
echo ""
echo "============================================"
echo "🎉 Done!"
echo ""
echo "   Site:  https://app.roamricher.com"
echo "   API:   https://app.roamricher.com/api/health"
echo "   Logs:  cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f"
echo "============================================"
