#!/bin/bash
# ─────────────────────────────────────────────────
#  DataIQ Platform – Local Development Setup Script
# ─────────────────────────────────────────────────
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   DataIQ Platform – Setup Script    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Check deps
command -v python3 >/dev/null 2>&1 || { echo "Python 3.10+ required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js 18+ required"; exit 1; }
command -v psql >/dev/null 2>&1 || echo "⚠  psql not found – using Docker for Postgres"
command -v redis-cli >/dev/null 2>&1 || echo "⚠  redis-cli not found – using Docker for Redis"

# 2. Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✔ Created .env from .env.example"
  echo "  → Edit .env and add your GEMINI_API_KEY or OPENAI_API_KEY"
fi

# ── Backend ──────────────────────────────────────
echo ""
echo "► Setting up backend..."
cd backend

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✔ Python dependencies installed"

# Load env vars
export $(grep -v '^#' ../.env | xargs) 2>/dev/null || true

python manage.py migrate
echo "✔ Database migrations applied"

python manage.py collectstatic --noinput -v 0
echo "✔ Static files collected"

echo ""
echo "Create a superuser? (y/n)"
read -r CREATE_SUPER
if [ "$CREATE_SUPER" = "y" ]; then
  python manage.py createsuperuser
fi

deactivate
cd ..

# ── Frontend ─────────────────────────────────────
echo ""
echo "► Setting up frontend..."
cd frontend

npm install --legacy-peer-deps
echo "✔ Node dependencies installed"

if [ ! -f .env.local ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
  echo "✔ Created frontend .env.local"
fi

cd ..

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Setup complete! Start the platform:              ║"
echo "║                                                      ║"
echo "║  Terminal 1 (Redis):                                 ║"
echo "║    redis-server                                      ║"
echo "║                                                      ║"
echo "║  Terminal 2 (Django):                                ║"
echo "║    cd backend && source venv/bin/activate            ║"
echo "║    python manage.py runserver                        ║"
echo "║                                                      ║"
echo "║  Terminal 3 (Celery):                                ║"
echo "║    cd backend && source venv/bin/activate            ║"
echo "║    celery -A dataiq_project worker -l info           ║"
echo "║                                                      ║"
echo "║  Terminal 4 (Next.js):                               ║"
echo "║    cd frontend && npm run dev                        ║"
echo "║                                                      ║"
echo "║  Open: http://localhost:3000                         ║"
echo "║  Admin: http://localhost:8000/admin                  ║"
echo "╚══════════════════════════════════════════════════════╝"
