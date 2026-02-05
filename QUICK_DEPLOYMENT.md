# 🚀 Quick Deployment Guide - CSV Upload Feature

**Target:** AWS Lightsail Production Server
**Time Estimate:** 10-15 minutes

---

## Prerequisites Checklist

- [ ] CSV sample file ready for testing
- [ ] Access to AWS Lightsail server
- [ ] SSH key available
- [ ] Google account credentials ready

---

## Deployment Steps

### 1. Local Preparation (2 mins)

```bash
# On your local machine
cd C:\Users\user\Desktop\boboibot\whatsapp-business-bot

# Verify all new files exist
dir csvProcessor.js
dir CSV_UPLOAD_GUIDE.md
```

### 2. Upload to Server (3 mins)

```bash
# Replace with your actual server details
scp -i your-key.pem bot.js user@your-server-ip:~/whatsapp-business-bot/
scp -i your-key.pem csvProcessor.js user@your-server-ip:~/whatsapp-business-bot/
scp -i your-key.pem package.json user@your-server-ip:~/whatsapp-business-bot/
scp -i your-key.pem auth.js user@your-server-ip:~/whatsapp-business-bot/
```

### 3. Server Setup (5 mins)

```bash
# SSH into server
ssh -i your-key.pem user@your-server-ip

# Navigate to bot directory
cd whatsapp-business-bot

# Install new dependency
npm install csv-parse

# Verify installation
npm list csv-parse
```

### 4. Re-authenticate Google (3 mins)

```bash
# IMPORTANT: This step is REQUIRED
node auth.js
```

**What happens:**
1. Browser opens (or you get a URL)
2. Login to your Google account
3. Allow "Google Sheets API" read+write access
4. Token saved automatically
5. See "✅ Authentication successful!"

### 5. Restart Bot (1 min)

```bash
# Restart with new code
pm2 restart whatsapp-bot

# Check status
pm2 status

# Monitor logs
pm2 logs whatsapp-bot --lines 50
```

### 6. Test (2 mins)

1. Open WhatsApp on your phone
2. Go to bot conversation
3. Send the test CSV file (Invoice Detail Listing.csv)
4. Wait for response

**Expected Response:**
```
📥 Processing your CSV file...

✅ Successfully processed invoice data!

📊 Summary:
• Total records: 2100+
• New records added: 2100+
• Duplicates skipped: 0
• Sheet: Invoice Detail Listing
```

---

## Verification Checklist

After deployment, verify:

- [ ] Bot responds to normal messages (test with "hi")
- [ ] CSV upload works (test with sample file)
- [ ] Google Sheets has new "Invoice Detail Listing" tab
- [ ] Data in sheet matches CSV file
- [ ] Bot shows correct summary (new vs duplicates)
- [ ] PM2 logs show no errors
- [ ] Send same file again → all duplicates

---

## Troubleshooting

### "Error processing CSV file"
```bash
# Check file permissions
ls -la temp/

# Check logs for details
pm2 logs whatsapp-bot --err
```

### "Unable to access business data"
```bash
# Re-authenticate
node auth.js

# Restart bot
pm2 restart whatsapp-bot
```

### Bot not responding
```bash
# Check if running
pm2 status

# Restart if needed
pm2 restart whatsapp-business-bot

# Check for errors
pm2 logs whatsapp-bot --err
```

### Authentication fails
```bash
# Delete old token
rm token.json

# Re-authenticate
node auth.js
```

---

## Rollback (If Needed)

```bash
# Stop bot
pm2 stop whatsapp-bot

# Restore old files from git (if using version control)
git checkout HEAD~1 bot.js auth.js package.json

# Or manually restore from backup
cp bot.js.backup bot.js
cp auth.js.backup auth.js

# Restart
pm2 restart whatsapp-bot
```

---

## Post-Deployment

### Day 1:
- Monitor PM2 logs every 2 hours
- Test with 2-3 different CSV files
- Verify data accuracy in Google Sheets
- Document any issues

### Day 2-7:
- Normal daily use
- Upload fresh CSV each morning
- Monitor for errors
- Collect user feedback

### Week 2:
- Review success metrics
- Plan next enhancements
- Optimize if needed

---

## Quick Commands Reference

```bash
# Status check
pm2 status

# View logs
pm2 logs whatsapp-bot

# Restart
pm2 restart whatsapp-bot

# Stop
pm2 stop whatsapp-bot

# Re-authenticate Google
node auth.js

# Check installed packages
npm list
```

---

## Support Contacts

**Technical Issues:**
- Check IMPLEMENTATION_SUMMARY.md
- Check CODEBASE_DOCUMENTATION.md

**Google Auth Issues:**
- Verify oauth_credentials.json exists
- Check Google Cloud Console permissions

**CSV Format Issues:**
- Compare with original sample file
- Verify AutoCount export settings

---

## Success Indicators

✅ **You're ready to go live when:**
1. Test CSV uploads successfully
2. Data appears correctly in Google Sheets
3. Duplicate detection works (send same file twice)
4. No errors in PM2 logs
5. Bot responds to normal queries
6. Admin can ask about new invoice data

---

**Deployment Status:** ⏳ Ready to Deploy
**Next Step:** Run commands above on AWS Lightsail

Good luck! 🚀
