# 🤖 Personal Assistant Setup Guide

Your bot now has **Personal Life Automation** features! This guide will help you set them up.

---

## 🎯 **What You Can Do Now**

### 📅 **Calendar & Reminders**
- "Remind me to call John at 3pm tomorrow"
- "Meeting with supplier next Monday 10am"
- "Remind me to work out every Monday, Wednesday, Friday at 6am"
- "Show my reminders"
- "Delete last reminder"

### 💰 **Financial Advisor** (Coming Soon)
- Upload bank statements
- Track spending
- Get personalized advice
- "Where is my money going?"

---

## 📦 **What's Already Done**

✅ All code files created
✅ Dependencies installed
✅ Bot.js updated to support personal features
✅ Local reminder storage works (no Google Calendar needed yet)

---

## 🚀 **Quick Start (Without Google Calendar)**

Your bot already works for reminders **locally**! Just test it:

```
1. Make sure bot is running:
   cd /c/Users/user/Desktop/boboibot/boboibot
   pm2 restart boboibot

2. Send to your bot via WhatsApp:
   "Remind me to test this in 5 minutes"

3. Bot will ask for confirmation:
   📋 Confirm reminder details:
   📝 Task: "test this"
   📅 When: Today at [time]

   Reply "yes" to create

4. Reminder saved locally! ✅
```

**Note:** Without Google Calendar, reminders are stored but won't trigger iPhone notifications. Keep reading to set that up!

---

## 🔧 **Full Setup (With Google Calendar & iPhone Notifications)**

### **Step 1: Get Google Calendar Credentials**

1. Go to: https://console.cloud.google.com/

2. Create a new project (or use existing one)

3. Enable **Google Calendar API**:
   - Click "+ ENABLE APIS AND SERVICES"
   - Search "Google Calendar API"
   - Click "ENABLE"

4. Create OAuth 2.0 Credentials:
   - Go to "Credentials" in left sidebar
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **"Desktop app"**
   - Name: "BoboiBot Calendar"
   - Click "CREATE"

5. Download credentials:
   - Click the download icon (⬇️) next to your new credential
   - Save file as: `google-credentials.json`
   - Put it in: `/c/Users/user/Desktop/boboibot/boboibot/`

---

### **Step 2: Authorize Calendar Access**

```bash
cd /c/Users/user/Desktop/boboibot/boboibot
node setup-calendar.js
```

**What happens:**
1. Script will show a URL
2. Copy URL and open in browser
3. Sign in with your Google account
4. Click "Allow" to grant calendar access
5. Browser will show "✅ Authentication successful!"
6. Script saves token automatically

**Done!** Your bot can now create Google Calendar events! 🎉

---

### **Step 3: Sync iPhone with Google Calendar**

On your iPhone:

1. Open **Settings**
2. Scroll down to **Calendar**
3. Tap **Accounts**
4. Tap **Add Account**
5. Choose **Google**
6. Sign in with the SAME Google account used in Step 2
7. Turn ON **Calendars**
8. Tap **Save**

**Test it:** Send "Remind me to check iPhone in 5 minutes"
- Check Google Calendar on web: Event should appear
- Check iPhone Calendar app: Event should sync
- Wait 5 mins: iPhone should show notification! 📱🔔

---

## 📝 **Usage Examples**

### **Simple Reminders:**
```
"Remind me to call mom at 7pm"
"Remind me to pay rent on the 1st"
"Remind me in 30 minutes"
"Remind me to follow up with John in 3 days"
```

### **Recurring Reminders:**
```
"Remind me to take vitamins every day at 8am"
"Remind me to work out every Monday, Wednesday, Friday at 6am"
"Remind me to check budget on the 1st of every month"
```

### **View & Manage:**
```
"Show my reminders"
"What's on my schedule today?"
"Delete last reminder"
```

---

## 🗂️ **File Structure**

New files created:
```
boboibot/
├── reminderParser.js          ✅ Natural language date/time parsing
├── calendarManager.js         ✅ Google Calendar integration
├── reminderHandler.js         ✅ Main reminder logic
├── personalAssistant.js       ✅ Routes personal queries
├── financialAdvisor.js        ✅ Financial tracking (foundation)
├── setup-calendar.js          ✅ OAuth setup script
├── data/
│   ├── reminders.json         📝 Local reminder storage
│   └── financial/
│       ├── transactions.db    📊 SQLite database (auto-created)
│       └── financial_profile.json
└── google-credentials.json    🔐 (You need to add this)
```

---

## 🧪 **Testing Checklist**

### **Test 1: Basic Reminder (Local)**
```
You: "Remind me to test in 2 minutes"
Bot: 📋 Confirm reminder details...
You: "yes"
Bot: ✅ Reminder created!
      💾 Saved locally
      ⚠️ Google Calendar not connected
```
**Result:** Reminder saved locally ✅

---

### **Test 2: Google Calendar (After Setup)**
```
You: "Remind me to check calendar at 3pm today"
Bot: 📋 Confirm reminder details...
You: "yes"
Bot: ✅ Reminder created!
      📱 Added to Google Calendar
      🔔 You'll get iPhone notifications
```

**Verify:**
1. Open https://calendar.google.com
2. Look for: "📌 check calendar" at 3pm today
3. Click it → Should show "Created via BoboiBot WhatsApp"

---

### **Test 3: iPhone Notification**
```
You: "Remind me to test iPhone in 5 minutes"
Bot: Creates reminder...

Wait 5 minutes...

iPhone shows:
┌─────────────────────────────┐
│ Calendar                    │
│ 🔔 📌 test iPhone - Now     │
│ 3:00 PM                     │
│ Created via BoboiBot        │
└─────────────────────────────┘
```

**Result:** Notifications working! 🎉

---

### **Test 4: Recurring Reminder**
```
You: "Remind me to work out every Monday at 6am"
Bot: 📋 Confirm reminder details:
     📝 Task: "work out"
     📅 When: Next Monday at 6:00 AM
     🔁 Repeat: Every Mon

You: "yes"
Bot: ✅ Reminder created!
     📱 Added to Google Calendar
     🔔 You'll get notifications every Monday
```

**Verify:** Check Google Calendar → Event repeats every week

---

## 🛠️ **Troubleshooting**

### **Problem: "Google Calendar not connected"**

**Solution 1:** Run setup script
```bash
node setup-calendar.js
```

**Solution 2:** Check files exist
```bash
ls -la google-credentials.json
ls -la google-token.json
```

**Solution 3:** Re-download credentials from Google Console

---

### **Problem: "Authentication failed"**

1. Delete old token:
   ```bash
   rm google-token.json
   ```

2. Run setup again:
   ```bash
   node setup-calendar.js
   ```

---

### **Problem: iPhone not getting notifications**

1. Check Google Calendar on web first
   - If event not there → Calendar setup failed
   - If event there → iPhone sync issue

2. On iPhone:
   - Settings → Calendar → Accounts
   - Tap Google account
   - Toggle Calendars OFF then ON
   - Wait 1 minute for sync

3. Force sync:
   - Open Calendar app on iPhone
   - Pull down to refresh

---

### **Problem: "Reminder deleted but still showing"**

Reminder might be in Google Calendar still:
1. Go to: https://calendar.google.com
2. Find the event (search for "📌")
3. Click it → Delete

---

## 🔐 **Security & Privacy**

- ✅ **Credentials stored locally** - Only on your server
- ✅ **OAuth tokens encrypted** - By Google's libraries
- ✅ **No cloud storage** - Everything on your machine
- ✅ **Reminders work offline** - Saved locally first
- ✅ **Only you can access** - Your Google account only

---

## 📊 **What's Next? (Phase 2)**

Once reminders are working, we can add:

### **Financial Advisor:**
- Upload bank statements (PDF/CSV)
- Auto-categorize expenses
- Get spending insights
- "Why am I always broke?"
- Daily spending alerts

### **Task Manager:**
- Shopping lists
- Todo lists
- "Add milk to shopping list"

### **Habit Tracking:**
- "Did workout today"
- Track streaks
- Motivational feedback

---

## 🎉 **Success Indicators**

You'll know everything works when:

✅ Bot responds to "Remind me..." commands
✅ Confirmation shows correct date/time
✅ Events appear in Google Calendar
✅ iPhone shows notifications at the right time
✅ "Show my reminders" lists upcoming events
✅ Recurring reminders repeat correctly

---

## 💡 **Tips**

1. **Start small:** Test one reminder before creating many
2. **Use confirmations:** Always check details before saying "yes"
3. **Be specific:** "tomorrow 3pm" better than "tomorrow afternoon"
4. **Check calendar:** Verify events in Google Calendar web interface
5. **iPhone sync:** Give it 1-2 minutes to sync after creating

---

## 🆘 **Need Help?**

If something's not working:

1. Check bot logs:
   ```bash
   pm2 logs boboibot --lines 50
   ```

2. Look for errors mentioning:
   - "Calendar"
   - "Google"
   - "Authentication"
   - "Reminder"

3. Share the error messages and I'll help debug!

---

**Last Updated:** 2026-02-07
**Status:** ✅ Ready for testing!

🚀 **Start with:** "Remind me to test this in 5 minutes"
