#!/bin/bash
# NiceGuyAPI Mobile Menu Deploy Script
# Run this from the workspace directory: bash deploy.sh
#
# Make sure gh CLI is authenticated first: gh auth status

set -e

WORKSPACE="/c/Users/kency/.openclaw/workspace"
cd "$WORKSPACE"

echo "============================================"
echo " NiceGuyAPI Mobile Menu Deploy"
echo "============================================"
echo ""

# Step 1: Generate the modified HTML
echo "[1/3] Generating modified HTML..."
node niceguyapi-deploy-fix.js

# Step 2: Get current SHA
echo ""
echo "[2/3] Getting current SHA..."
SHA=$(gh api repos/MrGhostGuy/niceguyapi/contents/index.html --jq ".sha")
echo "  SHA: ${SHA:0:8}"

# Step 3: Read modified HTML and encode
echo ""
echo "[3/3] Pushing to GitHub..."
B64=$(base64 -w0 index.html)
gh api --method PUT repos/MrGhostGuy/niceguyapi/contents/index.html \
  -f message="feat: mobile hamburger menu + premium tab transitions" \
  -f content="$B64" \
  -f sha="$SHA" \
  -f branch=main

echo ""
echo "============================================"
echo " DEPLOYED!"
echo " https://mrghostguy.github.io/niceguyapi/"
echo " (~30 seconds to go live)"
echo "============================================"
