# 📋 Reminder System - Test Plan

## ✅ System Status
- Reminder scheduler: Running (checks every 30s)
- Google Calendar: Initialized
- WhatsApp notifications: Active

---

## 🧪 Test Cases

### **Test 1: Personal Reminder in DM**
**Where:** Private DM with bot

**Test:**
```
"Remind me to test in 1 minute"
```

**Expected Flow:**
1. Bot asks for confirmation with reminder details
2. Reply: `yes`
3. Bot confirms: "✅ Reminder created! 🏠 Personal"
4. **After 1 minute:**
   - iPhone notification (Google Calendar)
   - WhatsApp DM from bot: "📌 Reminder: test"

---

### **Test 2: Business Reminder in Group**
**Where:** Any customer/business group chat

**Test:**
```
"Remind me to check delivery in 2 minutes"
```

**Expected Flow:**
1. Bot asks for confirmation with group name shown
2. Reply: `yes`
3. Bot confirms: "✅ Reminder created! 🏢 Business (Group Name)"
4. **After 2 minutes:**
   - iPhone notification (Google Calendar)
   - WhatsApp message IN THE GROUP: "📌 Reminder (Group Name): check delivery"

---

### **Test 3: List Reminders in DM**
**Where:** Private DM with bot

**Test:**
```
"show my reminders"
```

**Expected:**
```
📅 All your reminders (X):

🏠 Personal (X):
1. test
   Today at [time]

🏢 Business (X):
1. check delivery (Group Name)
   Today at [time]
```

---

### **Test 4: List Reminders in Group**
**Where:** Customer/business group

**Test:**
```
"show reminders"
```

**Expected:**
```
🏢 Business reminders for [Group Name] (X):

1. check delivery
   Today at [time]
```
*Should ONLY show reminders for THIS specific group, not others*

---

### **Test 5: Delete Last Reminder**
**Where:** Private DM

**Test:**
```
"delete last reminder"
```

**Expected:**
```
✅ Deleted: "[task name]"
```

---

### **Test 6: Recurring Reminder**
**Where:** Private DM

**Test:**
```
"Remind me to workout every Monday at 6am"
```

**Expected:**
- Confirmation shows: "🔁 Repeat: Every Mon"
- Creates recurring event in Google Calendar
- Will fire every Monday at 6am

---

### **Test 7: Cancel During Confirmation**
**Where:** Any chat

**Test:**
```
"Remind me to test in 5 minutes"
```
*Wait for confirmation, then reply:*
```
"no"
```

**Expected:**
```
❌ Reminder cancelled.
```

---

### **Test 8: Timezone Check**
**Where:** Private DM

**Test:**
```
"Remind me to test at 3pm tomorrow"
```

**Expected:**
- Confirmation shows: "📅 When: Tomorrow at 3:00 PM"
- Should be Malaysia time (NOT 8 hours off)
- iPhone notification fires at actual 3pm Malaysia time

---

### **Test 9: Business Reminder Isolation**
**Setup:** Create reminders in TWO different groups

**Test in Group A:**
```
"Remind me to follow up in 5 minutes"
```
*Confirm with yes*

**Test in Group B:**
```
"Remind me to send invoice in 10 minutes"
```
*Confirm with yes*

**Then check in Group A:**
```
"show reminders"
```

**Expected:**
- Should ONLY show "follow up" reminder
- Should NOT show "send invoice" (from Group B)

**Check in DM:**
```
"show my reminders"
```

**Expected:**
- Should show BOTH reminders with group names

---

### **Test 10: Multiple Reminders Firing**
**Setup:** Create 3 reminders all due at the same time

**Test:**
```
"Remind me to test 1 in 1 minute"
"Remind me to test 2 in 1 minute"
"Remind me to test 3 in 1 minute"
```

**Expected:**
- All 3 should fire within 30 seconds of due time
- All 3 should send WhatsApp notifications
- All 3 should only fire ONCE (no duplicates)

---

## 🐛 Edge Cases to Test

### **Edge Case 1: Ambiguous Time**
```
"Remind me about the meeting"
```
**Expected:** Bot asks for clarification about when

### **Edge Case 2: Invalid Time**
```
"Remind me to test at 25:00"
```
**Expected:** Bot asks for clarification

### **Edge Case 3: Past Time**
```
"Remind me to test yesterday"
```
**Expected:** Bot should interpret as relative future or ask for clarification

---

## 🔍 Verification Checklist

After each test, verify:
- [ ] Google Calendar event created (check calendar.google.com)
- [ ] Reminder saved in data/reminders.json
- [ ] WhatsApp notification sent at correct time
- [ ] Timezone is correct (Malaysia UTC+8)
- [ ] No duplicate notifications
- [ ] Personal/Business separation working
- [ ] Group isolation working (business reminders)

---

## 📊 What to Report

If something doesn't work, note:
1. What test you ran
2. What you expected
3. What actually happened
4. Time it happened (Malaysia time)
5. Any error messages in logs

Check logs with:
```bash
ssh -i "LightsailDefaultKey-ap-southeast-1.pem" ubuntu@13.250.50.95 "pm2 logs boboibot --lines 50"
```

---

## 🎯 Quick Start Testing

**Simplest test to start:**
```
1. DM the bot: "Remind me to test in 1 minute"
2. Reply: "yes"
3. Wait 1 minute
4. Check if you get:
   - iPhone notification
   - WhatsApp message
```

If this works, the whole system is working! 🎉
