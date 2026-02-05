#!/bin/bash

echo "=== Force Update Script ==="
echo ""

cd ~/boboibot

echo "1. Fetching latest from GitHub..."
git fetch origin

echo ""
echo "2. Showing current branch and status..."
git branch
git status

echo ""
echo "3. Force reset to origin/main..."
git reset --hard origin/main

echo ""
echo "4. Verifying files..."
echo "Checking bot.js for outstanding detection:"
grep -q "filename.includes('outstanding')" bot.js && echo "✅ Found" || echo "❌ Not found"

echo ""
echo "Checking if outstandingProcessor.js exists:"
[ -f outstandingProcessor.js ] && echo "✅ Exists" || echo "❌ Missing"

echo ""
echo "5. Restarting bot with PM2..."
pm2 restart boboibot

echo ""
echo "6. Showing PM2 logs (last 20 lines)..."
pm2 logs boboibot --lines 20 --nostream

echo ""
echo "=== Update Complete ==="
