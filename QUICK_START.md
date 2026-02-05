# ✅ Quick Setup Checklist

Print this out and check off each step as you complete it!

---

## Before You Start

- [ ] Windows PC ready
- [ ] Node.js installed (check by typing `node --version` in cmd)
- [ ] Dedicated phone number with WhatsApp installed
- [ ] Google account ready
- [ ] 30-60 minutes of uninterrupted time

---

## Part 1: Get Your Keys (15 mins)

### Claude API Key
- [ ] Go to https://console.anthropic.com/
- [ ] Sign up / Log in
- [ ] Create API key
- [ ] **Copy and save the key** (starts with `sk-ant-`)

### Google Sheet Setup
- [ ] Create new Google Sheet
- [ ] Add your business data (paste CSV)
- [ ] Organize into tabs (Price History, Stock, Property, etc.)
- [ ] **Copy Sheet ID from URL** (the long code in the middle)

---

## Part 2: Google API Setup (20 mins)

- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project: "WhatsApp Bot"
- [ ] Enable "Google Sheets API"
- [ ] Create Service Account: "whatsapp-bot"
- [ ] Download JSON key file
- [ ] **Rename to `credentials.json`**
- [ ] Open `credentials.json` and **copy the email address**
- [ ] Go back to your Google Sheet
- [ ] Click Share
- [ ] **Paste the email and give Viewer access**
- [ ] Click Send

---

## Part 3: Install Bot (10 mins)

- [ ] Download all files from chat
- [ ] Create folder: `C:\MyBot\`
- [ ] Extract all files to this folder
- [ ] **Move `credentials.json` into `C:\MyBot\`**
- [ ] Open Command Prompt (Win key, type "cmd")
- [ ] Type: `cd C:\MyBot`
- [ ] Type: `npm install` (wait 2-3 mins)

---

## Part 4: Configure (5 mins)

- [ ] Type: `copy .env.example .env`
- [ ] Open `.env` file in Notepad
- [ ] **Paste your Claude API key**
- [ ] **Paste your Google Sheet ID**
- [ ] Save and close

Your `.env` should look like:
```
CLAUDE_API_KEY=sk-ant-api03-xxxxx...
GOOGLE_SHEET_ID=1ABC123XYZ456...
```

---

## Part 5: Launch! (5 mins)

- [ ] Type: `npm start`
- [ ] **QR code appears** in terminal
- [ ] Open WhatsApp on your dedicated phone
- [ ] Go to Settings → Linked Devices
- [ ] Tap "Link a Device"
- [ ] **Scan the QR code**
- [ ] Wait for "WhatsApp Bot is ready!" message

---

## Part 6: Test (5 mins)

From another phone, send WhatsApp to your bot number:

- [ ] Send: "Hi"
- [ ] Bot replies with welcome message
- [ ] Send: "What products do I have?"
- [ ] Bot replies with your data
- [ ] Send: "What's the price for [your product]?"
- [ ] Bot replies with correct info

**If all tests pass: 🎉 YOU'RE DONE!**

---

## Troubleshooting Checklist

If something doesn't work:

- [ ] Check `.env` file has both keys filled in correctly
- [ ] Check `credentials.json` is in the bot folder
- [ ] Check you shared Google Sheet with service account email
- [ ] Check Sheet ID is correct (no extra spaces)
- [ ] Check Node.js is installed: `node --version`
- [ ] Try restarting: Ctrl+C, then `npm start` again

---

## Daily Usage

Each day you want to use the bot:

1. [ ] Open Command Prompt
2. [ ] Type: `cd C:\MyBot`
3. [ ] Type: `npm start`
4. [ ] Keep Command Prompt window open
5. [ ] Bot is now active!

**To stop the bot:**
- Press `Ctrl+C` in Command Prompt

---

## When You Update Data

- [ ] Export new CSV from AutoCount
- [ ] Open Google Sheet
- [ ] Delete old data
- [ ] Paste new data
- [ ] **That's it!** Bot sees changes immediately (no restart needed)

---

## Files You Must Keep

✅ **KEEP THESE SAFE (don't delete):**
- `credentials.json` - Google API access
- `.env` - Your API keys
- All `.js` files - Bot code
- `package.json` - Dependencies list

⚠️ **NEVER SHARE THESE FILES:**
- `.env`
- `credentials.json`

They contain your secret keys!

---

## Next Steps (After It's Working)

- [ ] Test for 1-2 weeks
- [ ] Add more data to Google Sheets
- [ ] Train your boss to use it
- [ ] Apply for WhatsApp Business API (for official version)
- [ ] Consider cloud deployment (24/7 uptime)

---

## Emergency Contacts

**If you're completely stuck:**
1. Read the README.md file again carefully
2. Check the Troubleshooting section
3. Make sure you followed EVERY step above
4. Double-check your credentials

**Most common issues:**
- Forgot to share Google Sheet with service account ← **90% of problems!**
- Wrong Sheet ID in `.env`
- Typo in API keys

---

**🎯 Remember:** Take it one step at a time. Each checkbox is a small victory!

Good luck! 🚀
