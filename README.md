# WhatsApp Business Bot Setup Guide

## 🎯 What This Bot Does

Your AI-powered WhatsApp bot that answers business questions by reading data from Google Sheets:
- Check stock levels, prices, inventory
- Query sales data and customer information  
- View rental schedules, loan payments, property info
- And anything else in your Google Sheets!

---

## 📋 Prerequisites

- ✅ Windows PC with Node.js installed
- ✅ Dedicated phone number for WhatsApp (recommended)
- ✅ Google account
- ✅ Claude API key

---

## 🚀 Step-by-Step Setup

### Step 1: Get Your Claude API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to "API Keys" section
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-...`)
6. **Save it somewhere safe!**

### Step 2: Prepare Your Google Sheet

1. **Create a new Google Sheet** or use existing one
2. **Organize your data in separate sheets (tabs)**:
   - Sheet 1: "Price History" - Paste your AutoCount price CSV
   - Sheet 2: "Stock Levels" - Your inventory data
   - Sheet 3: "Property Rentals" - Rental income schedules
   - Sheet 4: "Property Expenses" - Utilities, loans, council fees
   
3. **Get your Sheet ID**:
   - Look at the URL: `https://docs.google.com/spreadsheets/d/1ABC123XYZ456/edit`
   - The Sheet ID is: `1ABC123XYZ456`
   - Copy and save it!

4. **Make sure first row has headers** (column names)

### Step 3: Set Up Google Sheets API Access

1. Go to https://console.cloud.google.com/
2. **Create a new project**:
   - Click "Select a project" > "New Project"
   - Name it "WhatsApp Bot"
   - Click "Create"

3. **Enable Google Sheets API**:
   - In the search bar, type "Google Sheets API"
   - Click on it
   - Click "Enable"

4. **Create Service Account**:
   - Go to "Credentials" (left sidebar)
   - Click "Create Credentials" > "Service Account"
   - Name: "whatsapp-bot"
   - Click "Create and Continue"
   - Skip optional steps, click "Done"

5. **Download credentials**:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON"
   - Click "Create"
   - A file will download - **this is important!**
   - Rename it to `credentials.json`

6. **Share your Google Sheet with the bot**:
   - Open the `credentials.json` file
   - Find the email address (looks like: `whatsapp-bot@xxxxx.iam.gserviceaccount.com`)
   - Copy this email
   - Go to your Google Sheet
   - Click "Share" button
   - Paste the email
   - Give it "Viewer" access
   - Click "Send"

### Step 4: Install the Bot

1. **Download all files** from this chat to a folder, example:
   ```
   C:\MyBot\
   ```

2. **Move your credentials.json** into the bot folder:
   ```
   C:\MyBot\credentials.json
   ```

3. **Open Command Prompt** (press Windows key, type "cmd", press Enter)

4. **Navigate to your bot folder**:
   ```bash
   cd C:\MyBot
   ```

5. **Install dependencies**:
   ```bash
   npm install
   ```
   
   This will take 2-3 minutes. You'll see lots of text - that's normal!

### Step 5: Configure the Bot

1. **Copy the example environment file**:
   ```bash
   copy .env.example .env
   ```

2. **Edit the .env file**:
   - Open `.env` in Notepad
   - Replace `your_claude_api_key_here` with your actual Claude API key
   - Replace `your_google_sheet_id_here` with your Google Sheet ID
   - Save and close

   Example:
   ```
   CLAUDE_API_KEY=sk-ant-api03-abc123xyz...
   GOOGLE_SHEET_ID=1ABC123XYZ456
   ```

### Step 6: Run the Bot!

1. **Start the bot**:
   ```bash
   npm start
   ```

2. **You'll see a QR code** in the terminal

3. **Scan with WhatsApp**:
   - Open WhatsApp on your dedicated phone
   - Go to Settings > Linked Devices
   - Tap "Link a Device"
   - Scan the QR code

4. **Wait for "WhatsApp Bot is ready!"** message

5. **Test it!**:
   - From another phone, send a WhatsApp message to your bot number
   - Try: "Hi" or "What's the price for shark fin?"

---

## 💬 How to Use

### Basic Commands:
- **"Hi"** or **"/start"** - Get welcome message
- **"/help"** - See example questions

### Example Questions:
- "What's the current price for shark fin?"
- "Show me stock levels for sea cucumber"
- "List all invoices from January 2025"
- "What's my rental income this month?"
- "Show me all customers"
- "What are the upcoming loan payments?"

The bot reads your Google Sheets and uses AI to answer!

---

## 🔧 Troubleshooting

### QR Code not showing?
- Make sure you ran `npm install` first
- Try restarting: Press Ctrl+C, then run `npm start` again

### "CLAUDE_API_KEY not found" error?
- Make sure you created the `.env` file (not `.env.example`)
- Check that you pasted your API key correctly
- No spaces before or after the key

### "Unable to access business data" message?
- Check that `credentials.json` is in the bot folder
- Make sure you shared your Google Sheet with the service account email
- Verify the Sheet ID in `.env` is correct

### Bot stops when I close Command Prompt?
- This is normal for testing
- The bot runs as long as Command Prompt is open
- To run 24/7, we'll deploy to cloud later

### WhatsApp disconnects?
- Your phone needs to stay connected to internet
- The bot phone should stay on WhatsApp Web
- Don't log out of WhatsApp Web on the bot

---

## 📊 Google Sheets Tips

### Best Practices:
1. **Keep headers in row 1** - Bot uses these to understand data
2. **Don't use merged cells** - Can cause reading errors
3. **Use consistent date formats** - DD/MM/YYYY recommended
4. **Avoid empty rows** in the middle of data

### Updating Data:
- Just edit your Google Sheet directly
- Bot reads it in real-time
- No need to restart the bot!

### Example Sheet Structure:

**Price History Tab:**
```
Date        | Invoice     | Customer    | Product          | Quantity | Unit | Price
10/01/2025 | IV-2501-020 | Allied Sea  | Shark Fin        | 12       | KG   | 1540
11/01/2025 | IV-2501-027 | Soon Lee    | Sea Cucumber     | 41.7     | KG   | 730
```

**Stock Levels Tab:**
```
Product Code | Product Name      | Current Stock | Unit | Min Level | Supplier
SF-001      | Shark Fin Premium | 150          | KG   | 50        | Allied Sea
SC-002      | Sea Cucumber      | 200          | KG   | 75        | Hong Soon
```

---

## 🎉 Next Steps

Once this is working:

1. **Test for 1-2 weeks** with your boss
2. **Add more data** to Google Sheets (property info, etc.)
3. **Apply for WhatsApp Business API** (for official version)
4. **Deploy to cloud** (so it runs 24/7 without your PC)

---

## 📞 Support

If you get stuck:
- Check the Troubleshooting section above
- Make sure all steps were followed exactly
- Double-check your API keys and credentials

---

## ⚠️ Important Notes

- **Use a dedicated WhatsApp number** (not your main business line)
- **This is for testing** - migrate to WhatsApp Business API before selling to clients  
- **Keep your PC running** while testing (we'll fix this with cloud deployment later)
- **Don't share your credentials.json or .env files** - they contain sensitive keys!

---

## 🔐 Security Reminders

- Never commit `.env` or `credentials.json` to version control
- Keep your Claude API key secret
- Don't share your Google Service Account credentials
- Use a test number for initial setup

---

Good luck! You're about to save yourself hours of manual data lookups! 🚀
