#!/usr/bin/env bash
set -euo pipefail

echo "=== Health Sensor App Setup ==="

# Configure git hooks
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
echo "✓ Git hooks configured"

# Copy env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ .env created from template (edit before production!)"
fi

# Build and start
docker compose up --build -d
echo "✓ Containers started"

# Wait for backend
echo "Waiting for backend..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ Backend ready"
    break
  fi
  sleep 2
done

echo ""
echo "==================================="
echo "  Frontend:  http://localhost:5173"
echo "  API docs:  http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/health"
echo "==================================="
