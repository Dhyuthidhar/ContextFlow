#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
CF_SCRIPT="$BACKEND_DIR/cf.py"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

divider() { echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── Step 1: Check Python 3.8+ ─────────────────────────────────────────────────
echo ""
divider
echo -e "${BOLD}  ContextFlow CLI Setup${NC}"
divider
echo ""
echo "Checking Python version..."

PYTHON=""
for candidate in python3 python; do
  if command -v "$candidate" &>/dev/null; then
    version=$("$candidate" -c 'import sys; print(sys.version_info >= (3,8))' 2>/dev/null)
    if [ "$version" = "True" ]; then
      PYTHON="$candidate"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo -e "${RED}✗ Python 3.8+ is required but not found.${NC}"
  echo "  Install it from https://python.org and re-run this script."
  exit 1
fi

PY_VERSION=$("$PYTHON" --version 2>&1)
echo -e "  ${GREEN}✓ Found $PY_VERSION${NC}"

# ── Step 2: Create venv if missing ───────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo ""
  echo "Creating virtual environment..."
  "$PYTHON" -m venv "$VENV_DIR"
  echo -e "  ${GREEN}✓ venv created at $VENV_DIR${NC}"

  echo ""
  echo "Installing dependencies..."
  "$VENV_DIR/bin/pip" install --quiet --upgrade pip
  if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    "$VENV_DIR/bin/pip" install --quiet -r "$BACKEND_DIR/requirements.txt"
    echo -e "  ${GREEN}✓ Dependencies installed${NC}"
  else
    echo -e "  ${YELLOW}⚠ No requirements.txt found — skipping pip install${NC}"
  fi
else
  echo -e "  ${GREEN}✓ venv already exists${NC}"
fi

PYTHON_BIN="$VENV_DIR/bin/python3"

# ── Step 3: Shell function ────────────────────────────────────────────────────
CF_FUNCTION="
# ContextFlow CLI
cf() {
  \"$PYTHON_BIN\" \"$CF_SCRIPT\" \"\$@\"
}
"

MARKER="# ContextFlow CLI"

add_to_shell_rc() {
  local rc_file="$1"
  if [ -f "$rc_file" ]; then
    if grep -q "$MARKER" "$rc_file" 2>/dev/null; then
      echo -e "  ${YELLOW}⚠ Already in $rc_file — skipping${NC}"
    else
      echo "$CF_FUNCTION" >> "$rc_file"
      echo -e "  ${GREEN}✓ Added cf function to $rc_file${NC}"
    fi
  fi
}

echo ""
echo "Adding cf shell function..."
add_to_shell_rc "$HOME/.zshrc"
add_to_shell_rc "$HOME/.bashrc"

# ── Step 4: Symlink in /usr/local/bin ────────────────────────────────────────
WRAPPER="/usr/local/bin/cf"
WRAPPER_CONTENT="#!/bin/bash
\"$PYTHON_BIN\" \"$CF_SCRIPT\" \"\$@\""

echo ""
echo "Creating /usr/local/bin/cf symlink for immediate use..."

install_wrapper() {
  echo "$WRAPPER_CONTENT" > "$WRAPPER"
  chmod +x "$WRAPPER"
  echo -e "  ${GREEN}✓ /usr/local/bin/cf installed${NC}"
}

if [ -w /usr/local/bin ]; then
  install_wrapper
else
  echo "  (sudo required to write to /usr/local/bin)"
  if sudo bash -c "echo '$WRAPPER_CONTENT' > '$WRAPPER' && chmod +x '$WRAPPER'" 2>/dev/null; then
    echo -e "  ${GREEN}✓ /usr/local/bin/cf installed${NC}"
  else
    echo -e "  ${YELLOW}⚠ Could not install to /usr/local/bin — you can still use: source ~/.zshrc && cf ...${NC}"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
divider
echo -e "${GREEN}${BOLD}✓ ContextFlow CLI installed!${NC}"
divider
echo ""
echo "Try it now:"
echo -e "  ${CYAN}cf \"how should I handle API errors?\"${NC}"
echo -e "  ${CYAN}cf \"what auth pattern should I use?\" --project worcoor${NC}"
echo -e "  ${CYAN}cf --list-projects${NC}"
echo ""
echo "To add a new project:"
echo "  Edit backend/projects.json and add:"
echo -e "  ${YELLOW}\"myproject\": \"<project-uuid-from-dashboard>\"${NC}"
echo ""
echo -e "${YELLOW}Note: Open a new terminal (or run 'source ~/.zshrc') to use the 'cf' shell function.${NC}"
echo -e "      The /usr/local/bin/cf wrapper works immediately in this terminal."
divider
echo ""
