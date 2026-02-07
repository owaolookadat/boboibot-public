# ⚡ Quick Calendar Setup (5 Minutes)

You **already have Google OAuth set up** for Sheets! We just need to add Calendar access.

---

## 🎯 **What You Need to Do**

### **Step 1: Enable Calendar API (2 minutes)**

1. Go to: https://console.cloud.google.com/
2. Select your **existing project** (the one you used for Sheets)
3. Click "APIs & Services" → "Library"
4. Search for: **"Google Calendar API"**
5. Click it → Click **"ENABLE"**

Done! ✅

---

### **Step 2: Re-authorize with Calendar Scope (3 minutes)**

Your bot needs permission to access Calendar. Just re-authorize:

**On your server:**

```bash
# 1. SSH to server
ssh -i "LightsailDefaultKey-ap-southeast-1.pem" ubuntu@[YOUR_IP]

# 2. Go to bot folder
cd ~/boboibot

# 3. Delete old token (forces re-authorization)
rm token.json

# 4. Restart bot
pm2 restart boboibot

# 5. Check logs
pm2 logs boboibot --lines 30
```

**What happens:**
- Bot starts
- Shows an authorization URL
- Copy the URL
- Open in browser
- Sign in to Google
- Click "Allow" (it will ask for Calendar + Sheets access)
- Bot saves new token with both permissions

Done! ✅

---

### **Alternative: Use Setup Script**

```bash
# On your server:
cd ~/boboibot
node setup-calendar.js
```

This does the same thing but opens browser automatically.

---

## 📱 **Step 3: Sync iPhone (Optional - 2 minutes)**

If you want iPhone notifications:

1. iPhone Settings
2. Calendar → Accounts
3. Add Account → Google
4. Sign in with **same Google account**
5. Turn ON **Calendars**
6. Done!

---

## ✅ **Test It Works**

```bash
# On WhatsApp, send to your bot:
"Remind me to test calendar in 2 minutes"

# Bot should reply:
📋 Confirm reminder details:
📝 Task: "test calendar"
📅 When: Today at [time]

# Reply:
"yes"

# Bot should say:
✅ Reminder created!
📱 Added to Google Calendar
🔔 You'll get iPhone notifications
```

**Then:**
1. Open https://calendar.google.com
2. Look for event: "📌 test calendar"
3. Wait 2 minutes
4. iPhone should show notification! 🔔

---

## 🎯 **Quick Summary**

**All you need:**
1. Enable Calendar API in Google Console (already have credentials!)
2. Delete `token.json` and restart bot (re-authorize)
3. Test reminder!

**That's it!** No separate credentials, no new OAuth setup. Just add Calendar to existing access. 🚀

---

## 🐛 **Troubleshooting**

**"Calendar not initialized"**
- Run: `rm token.json && pm2 restart boboibot`
- Check logs for authorization URL
- Open URL and allow Calendar access

**"No calendar event created"**
- Check Google Calendar API is enabled
- Make sure token.json was regenerated with new scopes
- Check bot logs: `pm2 logs boboibot`

**iPhone not getting notifications**
- Sync might take 1-2 minutes
- Force sync: Open iPhone Calendar → Pull down to refresh
- Check Google account is added in iPhone Settings

---

**Ready?** Just enable Calendar API and re-authorize! 🎉
