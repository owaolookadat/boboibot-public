# WhatsApp Business Bot - Codebase Documentation

## Overview
An AI-powered WhatsApp bot that answers business questions by reading data from Google Sheets, with separate personal assistant mode for the admin.

**Created:** February 2025
**Last Updated:** February 5, 2026
**Status:** ✅ **LIVE on AWS Lightsail**
**Admin Number:** 601111484198
**Company:** PHC Marine Product Sdn Bhd (934074-A)
**Tech Stack:** Node.js, whatsapp-web.js, Google Sheets API (OAuth2), Anthropic Claude API, MongoDB, AWS Lightsail

---

## Current Deployment Status

**Production Environment:**
- **Hosting:** AWS Lightsail (running 24/7)
- **Session Storage:** MongoDB Atlas (persistent WhatsApp sessions)
- **Data Source:** Google Sheets - "PHC Price Data" (Sheet ID: 1IzNLzBwbcoWyXGww7HtQ0eMoC6eMPMIG8dMQHOZjFbQ)
- **Bot Status:** Active and responding to messages

**Available Data:**
- Invoice Detail Listing (CSV file ready for import - 2,100+ invoice line items from Jan 2025)
- PHC Price Data (currently connected Google Sheet)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      WhatsApp Users                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   AWS Lightsail Server                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              whatsapp-web.js                         │  │
│  │         (RemoteAuth + MongoDB Storage)               │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│                       ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              bot.js (Main Logic)                     │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Message Router                                 │  │  │
│  │  │  - Groups: Business mode (askClaude)           │  │  │
│  │  │  - Admin DM: Personal mode (askClaudePersonal) │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────┬─────────────────────────┬─────────────────┘  │
└─────────────┼─────────────────────────┼────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────┐    ┌──────────────────────────────┐
│  MongoDB Atlas (Cloud)  │    │   Google Sheets API          │
│  - WhatsApp session     │    │   (OAuth2 Auth)              │
│  - Persistent storage   │    │   - PHC Price Data           │
│  - Auto backup          │    │   - Real-time reads          │
└─────────────────────────┘    │   - 5000 rows per sheet      │
                               └──────────┬───────────────────┘
                                          │
                                          ▼
                               ┌──────────────────────────────┐
                               │  Anthropic Claude API        │
                               │  (claude-sonnet-4-20250514)  │
                               │  - Natural language queries  │
                               │  - Conversation memory       │
                               └──────────────────────────────┘
```

---

## File Structure

```
whatsapp-business-bot/
├── bot.js                  # Main bot logic
├── auth.js                 # Google OAuth2 authentication script
├── package.json            # Dependencies
├── .env                    # API keys (CLAUDE_API_KEY, GOOGLE_SHEET_ID)
├── .env.example            # Template for .env
├── oauth_credentials.json  # Google OAuth2 client credentials
├── token.json              # Google OAuth2 access token (auto-generated)
├── .wwebjs_auth/           # WhatsApp session data (auto-generated)
├── .gitignore              # Ignore sensitive files
├── README.md               # User setup guide
└── CODEBASE_DOCUMENTATION.md # This file
```

---

## Business Context

### Company Information
**Name:** PHC Marine Product Sdn Bhd (934074-A)
**Industry:** Seafood Trading (Marine Products)
**Primary Products:**
- Shark Fin (dried, frozen)
- Sea Cucumber (various grades)
- Fish Maw (dried, frozen)
- Abalone (canned, dried)
- Conch (dried)
- Scallops
- Other premium seafood products

### Bot Use Cases
1. **Price Inquiries** - Check current prices for products
2. **Invoice Lookup** - Find customer invoices by date, product, or customer
3. **Sales Analysis** - Track sales patterns and top products
4. **Customer Management** - View customer purchase history
5. **Product Information** - Get details about product codes and descriptions

---

## Core Components

### 1. Authentication

#### WhatsApp Authentication
- **Production:** Uses `RemoteAuth` with MongoDB for persistent sessions across server restarts
- **Fallback:** LocalAuth if MongoDB connection fails
- Session stored in MongoDB Atlas (cloud) for production reliability
- QR code displayed in terminal for initial linking (one-time setup)
- Auto-reconnects using saved session from MongoDB
- Session backup every 5 minutes to prevent data loss

#### Google Sheets Authentication (OAuth2)
- **Why OAuth2?** Organization blocked service account keys
- Credentials stored in `oauth_credentials.json` (from Google Cloud Console)
- Access token stored in `token.json` (auto-refreshed when expired)
- Run `node auth.js` for initial authentication (opens browser)

#### Claude API Authentication
- API key stored in `.env` as `CLAUDE_API_KEY`
- Initialized with `@anthropic-ai/sdk`

---

### 2. Message Handling Flow

```javascript
client.on('message', async (message) => {
    // 1. Get chat and contact info
    // 2. If GROUP: Check trigger conditions
    // 3. If triggered or DM: Process message
    // 4. Route to appropriate handler
})
```

#### Group Message Triggers
The bot responds in groups when ANY of these conditions are met:
- `@mention` the bot
- Message starts with `!bot `
- Message starts with `jjbot `
- Replying to bot's previous message
- User has active conversation (tagged bot within last 5 minutes)

#### Message Routing
| Condition | Handler | Memory | Data Access |
|-----------|---------|--------|-------------|
| DM from Admin | `askClaudePersonalWithData()` | `personalHistory` (private) | Business + Personal |
| DM from Others | `askClaude()` | Per-chat history | Business only |
| Group Messages | `askClaude()` | Per-group history | Business only |

---

### 3. Memory System

#### Conversation History Storage
```javascript
// Group/DM memories (per chat)
const conversationHistory = new Map();  // Key: chatId, Value: [{role, content}]
const MAX_HISTORY = 10;  // 10 message pairs

// Admin personal memory (completely separate)
const personalHistory = [];  // Single array, only for admin DMs
const MAX_PERSONAL_HISTORY = 20;  // 20 message pairs
```

#### Privacy Protection
- **Personal history is NEVER shared with groups**
- Each group has its own isolated memory
- Privacy rule in system prompt prevents AI from discussing private matters
- DM conversations use completely separate `personalHistory` array

---

### 4. Bot Settings (Admin Controlled)

```javascript
let botSettings = {
    enabled: true,           // Bot responds to non-admins
    maxRows: 5000,           // Max rows to read from sheets
    respondInGroups: true    // Bot responds in groups
};
```

#### Admin Commands (only work for admin number)
| Command | Description |
|---------|-------------|
| `/admin help` | Show all admin commands |
| `/admin status` | Show bot status and stats |
| `/admin on` | Enable bot for everyone |
| `/admin off` | Disable bot (admin can still use) |
| `/admin clearmemory` | Clear all conversation history |
| `/admin groups on` | Enable group responses |
| `/admin groups off` | Disable group responses |

---

### 5. Active Conversation Tracking (Groups)

```javascript
const activeGroupConversations = new Map();
const CONVERSATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Key format: `${groupId}_${senderId}`
// Value: timestamp of last interaction
```

**How it works:**
1. User tags bot with `jjbot` or `@mention`
2. Bot saves timestamp for that user in that group
3. For next 5 minutes, bot responds to ALL messages from that user
4. After 5 minutes of no interaction, user must tag again

---

### 6. Google Sheets Integration

#### Reading Data
```javascript
async function getAllBusinessData() {
    const sheets = await getAllSheets();  // Get all sheet names
    let allData = {};
    for (const sheetName of sheets) {
        const data = await getSheetData(sheetName);  // Read A:Z
        allData[sheetName] = data;
    }
    return allData;  // { "Sheet1": [[...], [...]], "Sheet2": [[...]] }
}
```

#### Data Limits
- **Max 5000 rows per sheet** (configurable in `botSettings.maxRows`)
- Reads columns A through Z
- First row treated as headers
- Data refreshed on every message (real-time)

---

### 7. Claude AI Integration

#### Models Used
- `claude-sonnet-4-20250514` for all responses

#### System Prompts

**Business Mode (Groups):**
```
You are a business assistant with access to the following data:
[Sheet data here]

Rules:
- Answer based on data
- Match user's language (Chinese/English)
- PRIVACY RULE: Never reveal private conversations
```

**Personal Mode (Admin DMs):**
```
You are JJ's personal AI assistant.
[Sheet data here]

Rules:
- Help with personal AND business matters
- This is PRIVATE - discuss anything freely
- Match user's language
```

---

## Configuration

### Environment Variables (.env)
```
CLAUDE_API_KEY=sk-ant-api03-...
GOOGLE_SHEET_ID=1IzNLzBwbcoWyXGww7HtQ0eMoC6eMPMIG8dMQHOZjFbQ
MONGODB_URI=mongodb+srv://... (optional, enables persistent sessions)
```

### Admin Configuration (in bot.js)
```javascript
const ADMIN_NUMBER = '601111484198@c.us';
```

---

## Running the Bot

### Production (AWS Lightsail)
**Current Status:** ✅ Running 24/7

The bot is deployed on AWS Lightsail and runs continuously using PM2 process manager.

**AWS Lightsail Commands:**
```bash
# SSH into the server
ssh -i key.pem user@aws-lightsail-ip

# Check bot status
pm2 status

# View logs
pm2 logs whatsapp-bot

# Restart bot
pm2 restart whatsapp-bot

# Stop bot
pm2 stop whatsapp-bot
```

### Local Development
```bash
cd C:\Users\user\Desktop\boboibot\whatsapp-business-bot
npm install          # Install dependencies
node auth.js         # Authenticate with Google (first time only)
npm start            # Start the bot
```

### Stopping the Bot
- **Production:** Use `pm2 stop whatsapp-bot`
- **Local:** Press `Ctrl+C` in terminal
- Graceful shutdown handler closes WhatsApp connection properly

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| whatsapp-web.js | ^1.23.0 | WhatsApp Web client |
| qrcode-terminal | ^0.12.0 | Display QR code in terminal |
| googleapis | ^128.0.0 | Google Sheets API |
| dotenv | ^16.3.1 | Load environment variables |
| @anthropic-ai/sdk | ^0.39.0 | Claude AI API |
| mongoose | ^8.x | MongoDB ODM for session storage |
| wwebjs-mongo | ^2.x | WhatsApp session storage adapter for MongoDB |

---

## Security Considerations

### Sensitive Files (DO NOT SHARE)
- `.env` - Contains API keys
- `oauth_credentials.json` - Google OAuth client secrets
- `token.json` - Google access token
- `.wwebjs_auth/` - WhatsApp session

### Privacy Features
1. **Separate memories** - Personal DMs never leak to groups
2. **Privacy rule in prompts** - AI instructed to refuse personal questions in groups
3. **Admin-only commands** - Settings can only be changed by admin number

---

## Current Business Data

### Connected Google Sheet: "PHC Price Data"
- **Sheet ID:** 1IzNLzBwbcoWyXGww7HtQ0eMoC6eMPMIG8dMQHOZjFbQ
- **Purpose:** Marine product pricing and sales data
- **Update Frequency:** Real-time (reads on every query)

### Available for Import: Invoice Detail Listing
- **File:** Invoice Detail Listing.csv (115 KB)
- **Records:** 2,100+ invoice line items
- **Date Range:** January 2025
- **Contains:**
  - Item codes and descriptions
  - Quantities and prices
  - Customer information
  - Invoice numbers and dates
  - Product categories (shark fin, sea cucumber, fish maw, abalone, etc.)
- **Status:** Ready to be imported into Google Sheets

## Planned Improvements

### Phase 1 - Data Enhancement (Current)
1. ✅ **Cloud Deployment** - AWS Lightsail (COMPLETED)
2. ✅ **Persistent Sessions** - MongoDB integration (COMPLETED)
3. 🔄 **Import Invoice Data** - Add Invoice Detail Listing to Google Sheets
4. 🔄 **Enhanced Queries** - Add specific invoice/sales analysis commands

### Phase 2 - Advanced Features
1. **Calendar Integration** - Personal reminders and scheduling
2. **Multi-language Detection** - Better language matching
3. **Sales Analytics** - Automatic reports and insights
4. **Customer Management** - Track customer purchase history
5. **Inventory Alerts** - Low stock notifications

---

## Troubleshooting

### Common Issues

**"CLAUDE_API_KEY not found"**
- Check `.env` file exists and has correct key

**"oauth_credentials.json not found"**
- Download OAuth credentials from Google Cloud Console

**"The browser is already running"**
- Close other instances: `taskkill /F /IM chrome.exe`
- Delete session: `rmdir /s /q .wwebjs_auth`

**QR code not scanning**
- Make sure WhatsApp is updated
- Try restarting bot

**Bot not responding in groups**
- Must use trigger: `jjbot`, `!bot`, or @mention
- Check `/admin status` for settings

---

## Changelog

### v1.1.0 (February 5, 2026) - CURRENT
- ✅ **Deployed to AWS Lightsail** - Bot running 24/7 in production
- ✅ **MongoDB Integration** - Persistent WhatsApp sessions across server restarts
- ✅ **RemoteAuth Strategy** - Session backup to cloud every 5 minutes
- 📁 **Invoice Data Ready** - Invoice Detail Listing.csv prepared for import (2,100+ records)
- 🔄 **Active Development** - Adding new modules and improving functionality

### v1.0.0 (February 2025)
- Initial release
- WhatsApp integration with whatsapp-web.js
- Google Sheets data reading (OAuth2)
- Claude AI responses
- Admin commands
- Group trigger system (jjbot, !bot, @mention)
- 5-minute active conversation tracking
- Separate personal/business memory
- Multi-language support (Chinese/English)
- Privacy protection for personal conversations
