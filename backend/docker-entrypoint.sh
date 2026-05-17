#!/usr/bin/env bash
set -e

echo "⏳ Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
until python -c "
import socket, os, sys
s = socket.socket()
s.settimeout(2)
try:
    s.connect((os.environ['POSTGRES_HOST'], int(os.environ['POSTGRES_PORT'])))
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is up."

echo "📦 Applying database migrations..."
alembic upgrade head

if [ "${SEED_DEMO:-true}" = "true" ]; then
  echo "🌱 Seeding demo data (idempotent)..."
  python -m app.seed || echo "Seed skipped/failed (non-fatal)."
fi

echo "🚀 Starting API..."
exec "$@"
