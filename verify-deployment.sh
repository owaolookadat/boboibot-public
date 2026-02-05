#!/bin/bash

echo "=== Deployment Verification Script ==="
echo ""

# Check if outstanding detection exists
echo "1. Checking for outstanding detection in bot.js..."
if grep -q "filename.includes('outstanding')" ~/boboibot/bot.js; then
    echo "✅ Outstanding detection found"
    grep -A 5 "filename.includes('outstanding')" ~/boboibot/bot.js | head -10
else
    echo "❌ Outstanding detection NOT found"
fi

echo ""
echo "2. Checking if outstandingProcessor.js exists..."
if [ -f ~/boboibot/outstandingProcessor.js ]; then
    echo "✅ outstandingProcessor.js exists"
    echo "File size: $(ls -lh ~/boboibot/outstandingProcessor.js | awk '{print $5}')"
else
    echo "❌ outstandingProcessor.js NOT found"
fi

echo ""
echo "3. Checking if outstandingProcessor is imported..."
if grep -q "processOutstandingCSV" ~/boboibot/bot.js; then
    echo "✅ processOutstandingCSV import found"
    grep "processOutstandingCSV\|outstandingProcessor" ~/boboibot/bot.js | head -3
else
    echo "❌ processOutstandingCSV import NOT found"
fi

echo ""
echo "4. Checking git status..."
cd ~/boboibot
git status

echo ""
echo "5. Checking last commit..."
git log -1 --oneline

echo ""
echo "6. Checking PM2 status..."
pm2 list

echo ""
echo "=== Verification Complete ==="
