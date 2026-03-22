#!/bin/bash
# UnoRouter - Claude Code CLI Setup Script
# This script configures Claude Code to use UnoRouter as the API endpoint.

set -e

API_URL="https://api.unorouter.ai"

echo "=================================="
echo "  UnoRouter - Claude Code Setup"
echo "=================================="
echo ""

read -p "Enter your UnoRouter API Key: " API_KEY

if [ -z "$API_KEY" ]; then
  echo "Error: API Key cannot be empty."
  exit 1
fi

# Detect shell config file
if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "$(which zsh 2>/dev/null)" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "$(which bash 2>/dev/null)" ]; then
  SHELL_RC="$HOME/.bashrc"
else
  SHELL_RC="$HOME/.profile"
fi

# Remove old entries if they exist
if [ -f "$SHELL_RC" ]; then
  sed -i.bak '/^export ANTHROPIC_BASE_URL=/d' "$SHELL_RC" 2>/dev/null || true
  sed -i.bak '/^export ANTHROPIC_API_KEY=/d' "$SHELL_RC" 2>/dev/null || true
fi

# Add new entries
echo "" >> "$SHELL_RC"
echo "# UnoRouter - Claude Code Configuration" >> "$SHELL_RC"
echo "export ANTHROPIC_BASE_URL=\"$API_URL\"" >> "$SHELL_RC"
echo "export ANTHROPIC_API_KEY=\"$API_KEY\"" >> "$SHELL_RC"

# Apply to current session
export ANTHROPIC_BASE_URL="$API_URL"
export ANTHROPIC_API_KEY="$API_KEY"

echo ""
echo "Configuration saved to $SHELL_RC"
echo ""
echo "ANTHROPIC_BASE_URL = $API_URL"
echo "ANTHROPIC_API_KEY  = ${API_KEY:0:8}..."
echo ""
echo "Run 'source $SHELL_RC' or open a new terminal to apply changes."
echo "Then run 'claude' to start using Claude Code with UnoRouter."
echo ""
