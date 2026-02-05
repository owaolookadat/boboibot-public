# CSV Upload Feature - User Guide

## 📤 How to Upload Invoice Data to Bot

### Quick Summary
Export CSV from AutoCount → Send to bot via WhatsApp → Bot automatically processes and updates Google Sheets (no duplicates!)

---

## Step-by-Step Guide

### 1. Export from AutoCount
1. Open AutoCount
2. Go to your Invoice Detail Listing report
3. Export as CSV file
4. Save to your computer (anywhere, like Desktop or Downloads)

### 2. Send to Bot via WhatsApp
1. Open WhatsApp on your phone
2. Find the bot conversation (your admin number)
3. Click the attachment icon (📎)
4. Choose "Document" or "File"
5. Select the CSV file you just exported
6. Send it!

### 3. Bot Processes Automatically
The bot will:
- ✅ Download the file
- ✅ Parse all invoice records
- ✅ Check for duplicates (by Invoice Number + Item Code)
- ✅ Add only new records to Google Sheets
- ✅ Reply with a summary

---

## Example Bot Response

```
✅ Successfully processed invoice data!

📊 Summary:
• Total records: 150
• New records added: 142
• Duplicates skipped: 8
• Sheet: Invoice Detail Listing
```

---

## Important Notes

### ✅ DO:
- Export fresh data from AutoCount whenever you want updates
- Send CSV files during work hours when you're available
- Wait for confirmation before sending another file
- Keep the original CSV format from AutoCount

### ❌ DON'T:
- Modify the CSV file before sending (keep AutoCount format)
- Send multiple files at once (wait for each to process)
- Worry about duplicates (bot handles this automatically)
- Need any special folders or Drive sync

---

## What Gets Uploaded to Google Sheets

**Sheet Name:** "Invoice Detail Listing"

**Columns:**
1. Item Code
2. Description
3. Qty
4. Unit Price
5. Discount
6. Currency
7. Sub Total
8. Doc No (Invoice Number)
9. Date
10. Debtor Code (Customer Code)
11. Debtor (Customer Name)
12. Notes

---

## Duplicate Detection

The bot checks for duplicates using:
- **Invoice Number (Doc No)** + **Item Code**

If a record with the same Invoice Number and Item Code already exists, it will be skipped.

**Example:**
- Invoice IV-2501-001 with item SC-GJ-FL already exists → Skip
- Invoice IV-2501-001 with NEW item AB-KP → Add (new line item)
- Invoice IV-2501-999 with any item → Add (new invoice)

---

## Troubleshooting

### "Error processing CSV file"
- **Cause:** File format is wrong or corrupted
- **Solution:** Re-export from AutoCount and try again

### "All records already exist"
- **Cause:** You already uploaded this exact data
- **Solution:** Export newer data from AutoCount

### Bot doesn't respond to file
- **Cause:** You might not be the admin
- **Solution:** Only admin number (601111484198) can upload files

### File sent but no processing message
- **Cause:** File might not be recognized as CSV
- **Solution:** Make sure file has .csv extension

---

## Daily Workflow (Recommended)

### Morning Routine:
1. Open AutoCount
2. Export yesterday's invoices to CSV
3. Send CSV to bot via WhatsApp
4. Wait for confirmation
5. Done! Data is now in Google Sheets and queryable

### Throughout the Day:
- Ask bot questions about the data
- "Show me today's invoices"
- "What did TEKKAH buy yesterday?"
- "Top customers this week"

---

## First Time Setup

### Re-authenticate Google (One-time)
Since we changed permissions from read-only to read+write, you need to re-authenticate:

**On AWS Lightsail:**
```bash
# SSH into server
ssh -i key.pem user@your-server-ip

# Navigate to bot folder
cd whatsapp-business-bot

# Install new dependency
npm install csv-parse

# Re-authenticate with Google
node auth.js
```

This will:
1. Open browser for Google auth
2. Ask you to allow Sheets read+write access
3. Save new token
4. You're done!

**Then restart bot:**
```bash
pm2 restart whatsapp-bot
```

---

## Advanced Features (Coming Soon)

🔄 **Scheduled Auto-Import** - Bot checks folder daily for new CSV
📊 **Custom Sheet Names** - Choose which sheet to upload to
📈 **Data Validation** - Bot warns about suspicious data
🔔 **WhatsApp Notifications** - Daily summary of sales

---

## Support

**For Issues:**
1. Check AWS Lightsail logs: `pm2 logs whatsapp-bot`
2. Verify Google Sheets permissions
3. Re-run `node auth.js` if permissions error

**Admin Contact:** 601111484198

---

## Example Use Case

**Scenario:** Daily invoice upload

**Morning (9 AM):**
1. Export yesterday's invoices from AutoCount → `invoices_2026-02-05.csv`
2. Send file to bot via WhatsApp
3. Bot replies: "Added 47 new invoices, skipped 3 duplicates"

**Throughout Day:**
- Sales team asks bot: "Show me all shark fin sales yesterday"
- Manager asks: "What's our top customer this week?"
- Boss asks: "Total sales for February so far?"

**All answered instantly because data is up-to-date!** ✅

---

**Status:** ✅ Ready to Use (after re-authentication)
