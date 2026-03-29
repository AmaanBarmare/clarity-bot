#!/usr/bin/env bash
# ClarityBot — NemoClaw sandbox bootstrap
# Run this once before starting the backend to enable OS-level network policy.
#
# Usage:
#   bash nemoclaw/setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY_FILE="$SCRIPT_DIR/openclaw-sandbox.yaml"

if ! command -v nemoclaw &> /dev/null; then
  echo "Error: nemoclaw CLI not found."
  echo "Install NemoClaw from https://developer.nvidia.com/nemoclaw"
  exit 1
fi

if [ ! -f "$POLICY_FILE" ]; then
  echo "Error: Policy file not found at $POLICY_FILE"
  exit 1
fi

echo "==> Onboarding ClarityBot sandbox..."
nemoclaw onboard --name claritybot-sandbox --policy "$POLICY_FILE"

echo "==> Starting sandbox..."
nemoclaw start --name claritybot-sandbox

echo ""
echo "NemoClaw sandbox is running."
echo "Allowed egress:"
echo "  - generativelanguage.googleapis.com (Gemini API)"
echo "  - google.serper.dev                 (Serper search)"
echo "  - build.nvidia.com                  (NVIDIA inference)"
echo "All other outbound traffic is denied."
