# WhatsApp Business Bot - Project Status

**Last Updated:** February 5, 2026 (Evening Update)

---

## ✅ CURRENT STATUS: LIVE IN PRODUCTION

### Deployment
- **Environment:** AWS Lightsail
- **Status:** Running 24/7
- **Uptime:** Continuous
- **Process Manager:** PM2 (auto-restart on failure)

### Active Features
✅ WhatsApp Bot responding to messages
✅ Google Sheets integration (PHC Price Data)
✅ Claude AI powered responses
✅ Admin controls and commands
✅ Group chat support with triggers
✅ Personal mode for admin DMs
✅ MongoDB session persistence
✅ Multi-language support (English/Chinese)
✅ **CSV File Upload & Processing (NEW!)**
✅ **Invoice Detail Listing Import (NEW!)**
✅ **Payment Status Tracking (NEW!)**

---

## 📊 DATA STATUS

### Connected Data Sources
1. **Google Sheet: "PHC Price Data"**
   - Sheet ID: `1IzNLzBwbcoWyXGww7HtQ0eMoC6eMPMIG8dMQHOZjFbQ`
   - Status: ✅ Active and connected
   - Access: Real-time reads via OAuth2
   - Contains: Current pricing and product data

### CSV Import System (Operational)
2. **Invoice Detail Listing (CSV Import)**
   - File: `Invoice Detail Listing.csv`
   - Size: 115 KB
   - Records: 2,100+ invoice line items
   - Period: January 2025 - February 2026
   - Status: ✅ **OPERATIONAL - Upload via WhatsApp**
   - Import Method: Send CSV file directly to bot in WhatsApp
   - Features:
     - Automatic duplicate detection (by Invoice No + Item Code)
     - Automatic payment status tracking (defaults to "Unpaid")
     - Creates "Invoice Detail Listing" sheet automatically
     - Appends new records without overwriting existing data
   - Contains:
     - Invoice numbers and dates
     - Customer codes and names
     - Product codes and descriptions
     - Quantities, prices, totals
     - Payment status and payment date columns

3. **Outstanding CSV Processor**
   - File: `outstanding.csv` (or any filename with "outstanding")
   - Purpose: Update payment statuses for existing invoices
   - Status: ✅ **OPERATIONAL**
   - Process:
     - Matches invoices by Doc No (invoice number)
     - If outstanding amount = 0 → marks all line items as "Paid"
     - If outstanding amount > 0 → marks as "Unpaid"
     - Updates ALL line items for each invoice automatically
   - One-time use: Run whenever payment status needs updating

---

## 🎯 NEXT STEPS

### Completed Today (Feb 5, 2026)
✅ **CSV Upload System Built**
   - Admin can upload CSV files via WhatsApp
   - Automatic file type detection (Invoice Detail vs Outstanding)
   - Duplicate detection and prevention
   - Payment tracking columns added

✅ **Payment Status Tracking**
   - Outstanding CSV processor built
   - Automatic status updates based on outstanding amounts
   - Batch updates for all invoice line items

✅ **Critical Bug Fixes**
   - Fixed admin number mismatch (601111484198@c.us → 192053774397461@lid)
   - Fixed document type detection for CSV files
   - Added detailed debug logging for troubleshooting

### Immediate Tasks
1. **Test Outstanding CSV Import**
   - Upload outstanding.csv to update payment statuses
   - Verify all invoice line items update correctly
   - Confirm paid/unpaid status accuracy

2. **Manual Payment Update Commands** (Future)
   - Add WhatsApp commands like `/payment paid IV-2501-001`
   - Quick update for individual invoices via chat
   - No need to upload CSV for daily updates

3. **Enhanced Invoice Queries**
   - Commands for invoice lookup by customer
   - Sales by date range analysis
   - Product-specific sales reports
   - Customer purchase history

4. **Analytics Dashboard**
   - Monthly sales summaries
   - Top customers report
   - Best-selling products
   - Outstanding balance tracking

### Future Enhancements
- Calendar/reminder integration
- Automated sales reports
- Low stock alerts
- Customer notification system
- Multi-currency support
- Export data functions

---

## 🛠️ TECHNICAL STACK

| Component | Technology | Status |
|-----------|------------|--------|
| **Server** | AWS Lightsail | ✅ Running |
| **Runtime** | Node.js | ✅ Active |
| **WhatsApp** | whatsapp-web.js | ✅ Connected |
| **Database** | MongoDB Atlas | ✅ Connected |
| **Data Source** | Google Sheets API | ✅ Connected |
| **AI Engine** | Claude Sonnet 4 | ✅ Active |
| **Process Manager** | PM2 | ✅ Running |

---

## 📞 BOT CAPABILITIES

### Current Commands

**User Commands:**
- `/start` or `hi` - Welcome message
- `/help` - Show example queries
- Any natural language question about business data

**Admin Commands:**
- `/admin help` - Show admin menu
- `/admin status` - Bot statistics
- `/admin on/off` - Enable/disable bot
- `/admin groups on/off` - Control group responses
- `/admin clearmemory` - Clear conversation history

**CSV Upload (Admin Only):**
- Send CSV file directly to bot in WhatsApp
- **Invoice Detail Listing.csv** → Imports invoice data with duplicate detection
- **outstanding.csv** (or filename with "outstanding") → Updates payment statuses
- Bot automatically detects file type and processes accordingly

### Group Chat Triggers
Users can interact in groups by:
- Mentioning the bot with `@`
- Starting message with `jjbot`
- Starting message with `!bot`
- Replying to bot's messages
- Continuing conversation (5-minute window)

---

## 🔐 SECURITY

### Protected Files
- ✅ `.env` - API keys (not in version control)
- ✅ `oauth_credentials.json` - Google credentials
- ✅ `token.json` - Google access token
- ✅ `.wwebjs_auth/` - WhatsApp session (local backup)

### Session Security
- MongoDB Atlas cloud storage (encrypted)
- Auto-backup every 5 minutes
- Session persistence across server restarts
- No sensitive data exposed to users

### Privacy Features
- Separate conversation memory per chat
- Admin personal mode isolated from business queries
- Privacy rules in AI prompts
- Admin-only settings control

---

## 📈 PERFORMANCE

### Current Limits
- Max 5,000 rows per Google Sheet
- 10 message pairs memory (groups)
- 20 message pairs memory (admin personal)
- 5-minute active conversation timeout
- Real-time data refresh on every query

### API Usage
- **Claude API:** Pay-per-use (currently active)
- **Google Sheets API:** Free tier (generous limits)
- **MongoDB Atlas:** Free tier (512 MB storage)

---

## 🐛 KNOWN ISSUES & TROUBLESHOOTING

### Common Issues (Resolved)
✅ QR code authentication - Working
✅ Session persistence - Solved with MongoDB
✅ Google Sheets access - OAuth2 configured
✅ Server disconnections - PM2 auto-restart enabled
✅ CSV file upload not processing - Fixed admin number mismatch (Feb 5, 2026)
✅ Document type detection - Fixed for CSV files (Feb 5, 2026)

### Critical Lessons Learned (Feb 5, 2026)

**Admin Number Format Issue:**
- WhatsApp IDs in groups use `@lid` format (e.g., `192053774397461@lid`)
- Direct message IDs use `@c.us` format (e.g., `601234567890@c.us`)
- **Always verify sender ID from logs before setting ADMIN_NUMBER**
- See TROUBLESHOOTING.md for detailed diagnostic steps

**CSV Upload Troubleshooting:**
1. Check admin authentication first (most common issue)
2. Verify file type detection with debug logs
3. Ensure code is deployed to server (git pull + pm2 restart)
4. Use verification scripts: `bash verify-deployment.sh`

For detailed troubleshooting guide, see **TROUBLESHOOTING.md**

### Monitoring
- Check logs: `pm2 logs boboibot`
- Check status: `pm2 status`
- Restart if needed: `pm2 restart boboibot`
- Verify deployment: `bash verify-deployment.sh`
- Force update: `bash force-update.sh`

---

## 💼 BUSINESS VALUE

### Time Saved
- Instant access to invoice data (no manual lookup)
- Quick price checks via WhatsApp
- Customer history at fingertips
- No need to open computer for basic queries

### Use Cases in Production
1. **Sales Team:** "What did [customer] order last month?"
2. **Pricing Queries:** "Current price for shark fin?"
3. **Customer Service:** "Show invoices for Allied Sea Products"
4. **Management:** "Top selling products this month?"
5. **Admin Personal:** Calendar, reminders, business + personal queries

---

## 🎓 FOR DEVELOPERS

### Project Structure
```
boboibot/
├── bot.js                      # Main application
├── csvProcessor.js             # Invoice Detail CSV import
├── outstandingProcessor.js     # Payment status updates
├── auth.js                     # Google OAuth setup
├── package.json                # Dependencies
├── .env                        # Configuration (SECRET)
├── oauth_credentials.json      # Google credentials (SECRET)
├── token.json                  # Google token (SECRET)
├── verify-deployment.sh        # Deployment verification script
├── force-update.sh             # Force sync & restart script
├── CODEBASE_DOCUMENTATION.md   # Technical docs
├── PROJECT_STATUS.md           # This file (status & roadmap)
├── TROUBLESHOOTING.md          # Issue resolution guide
└── README.md                   # Setup guide
```

### Key Functions
- `getAllBusinessData()` - Fetch all Google Sheets data
- `askClaude()` - Business mode AI queries
- `askClaudePersonalWithData()` - Admin personal mode
- `handleMessage()` - Process incoming WhatsApp messages
- `initGoogleSheets()` - Initialize Google API connection

### Adding New Features
1. Modify `bot.js` for new functionality
2. Test locally with `npm start`
3. Deploy to AWS Lightsail
4. Restart with `pm2 restart whatsapp-bot`
5. Monitor logs with `pm2 logs whatsapp-bot`

---

## 📞 SUPPORT

**Admin:** 601111484198
**Company:** PHC Marine Product Sdn Bhd

For technical issues:
1. Check logs on AWS Lightsail
2. Review CODEBASE_DOCUMENTATION.md
3. Test commands with `/admin status`
4. Contact developer if persistent issues

---

## 🚀 SUCCESS METRICS

### Goals Achieved
✅ Bot deployed and running 24/7
✅ Stable WhatsApp connection with session persistence
✅ Google Sheets data accessible in real-time
✅ Admin controls working
✅ Multi-language support functional
✅ Group and DM modes operational

### Next Milestones
🎯 Import full invoice dataset
🎯 Add invoice-specific query commands
🎯 Build sales analytics features
🎯 Create automated reporting
🎯 Expand to customer notifications

---

**Status:** ✅ **PRODUCTION READY - ACTIVELY IMPROVING**
