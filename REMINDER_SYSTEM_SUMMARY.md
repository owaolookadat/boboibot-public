# 📌 Complete Reminder System - Summary

## ✅ What's Been Built

### **Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    REMINDER SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Input (WhatsApp)                                       │
│         ↓                                                     │
│  reminderParser.js ─────→ Parse date/time (Malaysia UTC+8)  │
│         ↓                                                     │
│  reminderHandler.js ────→ Create reminder + confirmation     │
│         ↓                                                     │
│  Save to:                                                     │
│    • Google Calendar ──→ iPhone notifications 📱            │
│    • data/reminders.json ──→ Local backup                    │
│         ↓                                                     │
│  reminderScheduler.js ─→ Check every 30s                     │
│         ↓                                                     │
│  When due:                                                    │
│    • Personal → DM notification                              │
│    • Business → Group notification                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Features

### **1. Personal vs Business Separation**
- **Personal reminders** (set in DM):
  - Saved as `type: 'personal'`
  - Notifications sent to your DM only
  - Listed in DM view

- **Business reminders** (set in groups):
  - Saved as `type: 'business'` with group context
  - Notifications sent to original group
  - Filtered by group when listing
  - Isolated per group (Group A doesn't see Group B)

### **2. Dual Notification System**
When reminder is due:
1. **📱 iPhone** - Google Calendar notification (always)
2. **💬 WhatsApp** - Bot message (DM or group)

### **3. Natural Language Parsing**
Understands:
- "Remind me to call John at 3pm tomorrow"
- "Remind me in 30 minutes"
- "Remind me to workout every Monday at 6am"
- "Remind me to check delivery next Friday"

### **4. Timezone Support**
- All times parsed in Malaysia timezone (UTC+8)
- Server runs in UTC but converts correctly
- Display times always show Malaysia time

### **5. Confirmation System**
- Prevents AI hallucinations
- Shows parsed details before creating
- Can cancel with "no"

### **6. Smart Listing**
- **In DM:** Shows ALL reminders (personal + business from all groups)
- **In Groups:** Shows ONLY that group's business reminders

---

## 📁 Files

### **Core Files**
1. **reminderParser.js** - Natural language date/time parsing
2. **reminderHandler.js** - Create, list, delete reminders
3. **reminderScheduler.js** - Background checker + WhatsApp sender
4. **personalAssistant.js** - Intent detection + routing
5. **calendarManager.js** - Google Calendar integration
6. **bot.js** - Main orchestration

### **Data Storage**
- `data/reminders.json` - Local reminder database
- Google Calendar - Cloud sync + iPhone notifications

---

## 🔒 Security & Access Control

### **Admin Only (You)**
- Can create personal reminders (DM)
- Can create business reminders (groups)
- Can list/delete reminders

### **Other Users**
- Can ONLY use business features (invoices, etc.)
- Cannot access reminder system at all

### **SOP (Standard Operating Procedure)**
- **In DM:** Personal + business reminders allowed
- **In Groups:** ONLY business reminders (prevents personal leaks)

---

## ⚙️ Technical Details

### **Scheduler Configuration**
- Check interval: 30 seconds
- Cleanup interval: Daily (removes old reminders 7+ days)
- Notification window: ±30 seconds (to account for check interval)

### **Timezone Handling**
```javascript
// Server is UTC
// User input: "3pm" → Interprets as Malaysia 3pm
// Stores as: UTC time (3pm - 8 hours = 7am UTC)
// Displays as: Malaysia time (converts back to 3pm)
```

### **Duplicate Prevention**
- Reminders marked `notified: true` after sending
- Filter prevents re-sending same reminder
- Cleanup removes notified reminders after 7 days

---

## 🚀 Deployment Status

✅ **Deployed and Running:**
- Bot server: ubuntu@13.250.50.95
- Process manager: PM2 (auto-restart)
- Scheduler: Active (checking every 30s)
- Google Calendar: Connected
- WhatsApp: Connected

---

## 🧪 Testing Guide

See **REMINDER_TESTS.md** for complete test plan.

**Quick Test:**
```
1. DM bot: "Remind me to test in 1 minute"
2. Reply: "yes"
3. Wait 1 minute
4. Should receive:
   - iPhone notification
   - WhatsApp DM
```

---

## 🎨 User Experience

### **Creating Reminder:**
```
You: "Remind me to workout tomorrow at 6am"
Bot: 📋 Confirm reminder details:
     📝 Task: "workout"
     📅 When: Tomorrow at 6:00 AM

     Is this correct?
     Reply "yes" to create or "no" to cancel

You: "yes"
Bot: ✅ Reminder created!
     🏠 Personal
     📝 workout
     📅 Tomorrow at 6:00 AM

     📱 Added to Google Calendar
     🔔 You'll get iPhone notifications
```

### **When Reminder Fires:**
```
[iPhone rings with Google Calendar notification]
[WhatsApp message appears]

Bot: 📌 Reminder

     workout
```

---

## 📈 Future Enhancements (Not Yet Built)

Potential additions discussed:
- ⏰ Snooze functionality
- 🔄 Edit existing reminders
- 🎯 Location-based reminders
- 📊 Reminder statistics
- 🗑️ Delete specific reminder (not just last)
- 📅 "What's today/tomorrow" queries

---

## 🐛 Known Issues

- Google Calendar API: Was not enabled initially, may need time to propagate
- Timezone: Fixed (was 8 hours off, now correct)
- Confirmation: Works correctly with "yes"/"no" detection

---

## 📞 Support Commands

### **Check Logs:**
```bash
ssh -i "LightsailDefaultKey-ap-southeast-1.pem" ubuntu@13.250.50.95 "pm2 logs boboibot --lines 50"
```

### **Restart Bot:**
```bash
ssh -i "LightsailDefaultKey-ap-southeast-1.pem" ubuntu@13.250.50.95 "pm2 restart boboibot"
```

### **Check Scheduler Status:**
```bash
ssh -i "LightsailDefaultKey-ap-southeast-1.pem" ubuntu@13.250.50.95 "pm2 logs boboibot | grep 'Reminder scheduler'"
```

---

## 🎉 What Makes This System Great

1. **Dual Notifications** - iPhone + WhatsApp = Never miss
2. **Context-Aware** - Personal stays personal, business stays in groups
3. **Natural Language** - No complicated syntax needed
4. **Timezone Smart** - Always shows Malaysia time
5. **Safe** - Confirmation prevents mistakes
6. **Reliable** - Background scheduler + auto-cleanup
7. **Isolated** - Groups don't leak into each other

---

**Ready to test!** Start with the simple 1-minute test and go from there. 🚀
