# Troubleshooting Guide

## Common Issues and Solutions

### CSV File Upload Not Working

**Symptom:** Bot responds with AI analysis of CSV filename instead of processing the file.

**Root Causes & Solutions:**

#### 1. Admin Number Mismatch (MOST COMMON)
**Problem:** The `ADMIN_NUMBER` constant doesn't match your actual WhatsApp ID.

**How to diagnose:**
- Check PM2 logs: `pm2 logs boboibot --lines 50`
- Look for: `⚠️ File received from non-admin, ignoring`
- Compare the sender ID with ADMIN_NUMBER in the logs

**Solution:**
```bash
# Check your actual WhatsApp ID from logs
pm2 logs boboibot | grep "Sender:"

# Update bot.js line 16 to match your ID
# Example: const ADMIN_NUMBER = '192053774397461@lid';
```

**WhatsApp ID Formats:**
- Direct messages: `601234567890@c.us`
- Group messages: `192053774397461@lid` (different format!)
- **Important:** Always use the ID format from the actual logs

#### 2. Message Type Not Detected
**Problem:** CSV files sent as documents aren't recognized by `message.hasMedia` alone.

**How to diagnose:**
- Check logs for: `📋 Message type: document, hasMedia: false`

**Solution:**
The code now checks both:
```javascript
if (message.hasMedia || message.type === 'document') {
    // Process file
}
```

#### 3. Code Not Deployed to Server
**Problem:** Local code is correct but server is running old version.

**How to diagnose:**
```bash
cd ~/boboibot
git status
git log -1
grep "filename.includes('outstanding')" bot.js
```

**Solution:**
```bash
cd ~/boboibot
git pull
pm2 restart boboibot
# Verify the restart worked
pm2 list
```

**If git pull doesn't work:**
```bash
cd ~/boboibot
git fetch origin
git reset --hard origin/main
pm2 restart boboibot
```

#### 4. PM2 Cached Old Code
**Problem:** PM2 is caching the old version even after git pull.

**Solution:**
```bash
cd ~/boboibot
pm2 delete boboibot
pm2 start bot.js --name boboibot
pm2 save
```

### CSV File Detection Not Working

**Symptom:** Bot processes the wrong CSV type (e.g., Outstanding CSV treated as Invoice Detail).

**Root Cause:** Filename detection logic is incorrect.

**How to diagnose:**
- Check logs for: `📊 Detected Outstanding CSV` or `📋 Detected Invoice Detail CSV`
- If the wrong message appears, the detection logic needs adjustment

**Solution:**
Detection is based on filename:
- If filename contains "outstanding" → Outstanding CSV processor
- Otherwise → Invoice Detail CSV processor

Update filename if needed:
```javascript
if (filename.includes('outstanding')) {
    // Outstanding CSV
} else {
    // Invoice Detail CSV
}
```

### Google Sheets API Errors

**Symptom:** `Error processing CSV: Failed to append data to Google Sheets`

**Root Causes:**

1. **Invalid Sheet ID**
   ```bash
   # Check .env file
   cat .env | grep SHEET_ID
   ```

2. **Missing OAuth Credentials**
   ```bash
   # Check if credentials exist
   ls -la ~/boboibot/credentials.json
   ls -la ~/boboibot/token.json
   ```

3. **Token Expired**
   - Delete `token.json` and re-authenticate
   - The bot will prompt for new OAuth flow

### Debug Mode

To enable detailed logging for troubleshooting:

1. **Check current logs:**
```bash
pm2 logs boboibot --lines 100
```

2. **Monitor in real-time:**
```bash
pm2 logs boboibot
```

3. **Check specific events:**
```bash
pm2 logs boboibot | grep "CSV"
pm2 logs boboibot | grep "Admin"
pm2 logs boboibot | grep "Error"
```

### Verification Checklist

Use this checklist when CSV upload isn't working:

```bash
# 1. Check deployment
cd ~/boboibot
bash verify-deployment.sh

# 2. Check admin number
pm2 logs boboibot | grep "ADMIN_NUMBER"

# 3. Test with a small CSV
# Upload a simple 2-line CSV to test

# 4. Check Google Sheets permissions
# Make sure the bot has edit access to the sheet
```

### Quick Fix Scripts

We've created helper scripts for common issues:

1. **verify-deployment.sh** - Check if code is deployed correctly
2. **force-update.sh** - Force sync with GitHub and restart

Usage:
```bash
cd ~/boboibot
git pull
bash verify-deployment.sh
# or
bash force-update.sh
```

## Prevention Tips

1. **Always verify admin number after deployment**
   - Test with a small file first
   - Check logs immediately after upload

2. **Use descriptive filenames**
   - "outstanding.csv" for payment updates
   - "Invoice Detail Listing.csv" for invoice imports

3. **Monitor PM2 restart count**
   - If restart count is high, something is crashing
   - Check error logs: `pm2 logs boboibot --err`

4. **Keep local and remote in sync**
   - Commit changes locally first
   - Push to GitHub
   - Pull on server
   - Restart PM2

5. **Test in stages**
   - Test locally if possible
   - Test on server with small dataset
   - Then process full dataset

## Contact & Support

If issues persist after trying these solutions:
1. Check `pm2 logs boboibot --lines 200` for full error details
2. Verify Google Sheets API quotas haven't been exceeded
3. Check AWS Lightsail instance status and resources
