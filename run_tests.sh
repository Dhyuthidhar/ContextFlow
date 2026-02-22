#!/bin/bash
set -e

echo "================================================"
echo "  ContextFlow Integration Test Suite"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# ── BACKEND TESTS ──
echo ">>> Running Python backend tests..."
cd /Users/sssd/Documents/ContextFlow/backend
source .venv/bin/activate

python3 tests/test_integration.py
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Backend tests completed${NC}"
else
  echo -e "${RED}Backend tests had failures${NC}"
fi

# ── FRONTEND TESTS ──
echo ""
echo ">>> Running Playwright E2E tests..."
echo "    (Make sure 'npm run dev' is running in another terminal)"
echo ""
cd /Users/sssd/Documents/ContextFlow/frontend

npx playwright test --reporter=list
if [ $? -eq 0 ]; then
  echo -e "${GREEN}E2E tests passed${NC}"
else
  echo -e "${RED}E2E tests had failures${NC}"
fi

echo ""
echo "================================================"
echo "  Test run complete"
echo "  Playwright report: frontend/playwright-report/index.html"
echo "================================================"
