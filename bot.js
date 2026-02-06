const { Client, LocalAuth, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const { processCsvFile } = require('./csvProcessor');
const { processOutstandingCSV } = require('./outstandingProcessor');
const { updatePaymentStatus, parsePaymentCommand } = require('./paymentCommandHandler');
const { getInvoiceStats } = require('./invoiceStatsHandler');
const { getCustomerContextFromGroup, addCustomerContextToPrompt } = require('./groupContextHandler');
require('dotenv').config();

// Admin Configuration
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '192053774397461@lid'; // Only admin can change settings

// Conversation Memory (stores last 10 messages per chat)
const conversationHistory = new Map();
const MAX_HISTORY = 10;

// Bot Settings (admin can change these)
let botSettings = {
    enabled: true,
    maxRows: 5000,
    respondInGroups: true
};

// Track active conversations in groups (user -> timestamp of last interaction)
const activeGroupConversations = new Map();
const CONVERSATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Personal mode conversation history (separate from business)
const personalHistory = [];
const MAX_PERSONAL_HISTORY = 20;

// OAuth2 Configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']; // Changed to allow read AND write
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'oauth_credentials.json');

// MongoDB URI for persistent session storage
const MONGODB_URI = process.env.MONGODB_URI;

// WhatsApp client (initialized after MongoDB connection)
let client;

// Initialize Claude AI
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

// Google Sheets setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
let sheetsAPI;

// Initialize Google Sheets API with OAuth2
async function initGoogleSheets() {
    try {
        // Check if we have OAuth credentials
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            console.error('❌ oauth_credentials.json not found');
            console.log('\n📋 To set up Google Sheets access:');
            console.log('1. Go to https://console.cloud.google.com/');
            console.log('2. Create a project and enable Google Sheets API');
            console.log('3. Go to Credentials > Create Credentials > OAuth client ID');
            console.log('4. Choose "Desktop app" as application type');
            console.log('5. Download the JSON and save as "oauth_credentials.json" in this folder');
            console.log('6. Run "node auth.js" to authenticate\n');
            return false;
        }

        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Check if we have a saved token
        if (fs.existsSync(TOKEN_PATH)) {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
            oAuth2Client.setCredentials(token);

            // Check if token is expired and refresh if needed
            if (token.expiry_date && token.expiry_date < Date.now()) {
                console.log('🔄 Refreshing Google token...');
                const { credentials: newCredentials } = await oAuth2Client.refreshAccessToken();
                oAuth2Client.setCredentials(newCredentials);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(newCredentials));
            }

            sheetsAPI = google.sheets({ version: 'v4', auth: oAuth2Client });
            console.log('✅ Google Sheets API initialized');
            return true;
        } else {
            console.error('❌ Not authenticated with Google');
            console.log('Run "node auth.js" to authenticate with your Google account\n');
            return false;
        }
    } catch (error) {
        console.error('❌ Error initializing Google Sheets:', error.message);
        return false;
    }
}

// Read data from Google Sheets
async function getSheetData(sheetName, range = 'A:Z') {
    try {
        const response = await sheetsAPI.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!${range}`,
        });

        return response.data.values || [];
    } catch (error) {
        console.error(`Error reading sheet ${sheetName}:`, error.message);
        return [];
    }
}

// Get all available sheets
async function getAllSheets() {
    try {
        const response = await sheetsAPI.spreadsheets.get({
            spreadsheetId: SHEET_ID,
        });

        return response.data.sheets.map(sheet => sheet.properties.title);
    } catch (error) {
        console.error('Error getting sheets:', error.message);
        return [];
    }
}

// Format sheet data for Claude
async function getAllBusinessData() {
    try {
        const sheets = await getAllSheets();
        let allData = {};

        for (const sheetName of sheets) {
            const data = await getSheetData(sheetName);
            allData[sheetName] = data;
        }

        return allData;
    } catch (error) {
        console.error('Error getting business data:', error);
        return {};
    }
}

// Helper function to get/update conversation history
function getConversationHistory(chatId) {
    if (!conversationHistory.has(chatId)) {
        conversationHistory.set(chatId, []);
    }
    return conversationHistory.get(chatId);
}

function addToHistory(chatId, role, content) {
    const history = getConversationHistory(chatId);
    history.push({ role, content });
    if (history.length > MAX_HISTORY * 2) { // *2 because we store user + assistant pairs
        history.splice(0, 2); // Remove oldest pair
    }
}

// Query Claude for personal/DM mode (with business data access, private history)
async function askClaudePersonalWithData(question, businessData) {
    try {
        // Build business data context
        let dataContext = "";
        for (const [sheetName, data] of Object.entries(businessData)) {
            dataContext += `\n=== ${sheetName} ===\n`;
            if (data.length > 0) {
                dataContext += data[0].join(' | ') + '\n';
                dataContext += '-'.repeat(50) + '\n';
                const rowsToShow = data.slice(1, 5001);
                rowsToShow.forEach(row => {
                    dataContext += row.join(' | ') + '\n';
                });
                if (data.length > 5001) {
                    dataContext += `\n... and ${data.length - 5001} more rows\n`;
                }
            }
        }

        const systemPrompt = `You are JJ's personal AI assistant. You help with both personal matters (calendars, reminders, tasks, questions) AND business queries.

You have access to the following business data:
${dataContext}

Rules:
- Be friendly, helpful, and concise
- Always reply in the same language the user used (Chinese/English)
- This is a PRIVATE conversation - you can discuss anything freely
- Help with personal tasks, reminders, calendars, and any questions
- Also help with business data queries when asked`;

        // Add to personal history
        personalHistory.push({ role: "user", content: question });
        if (personalHistory.length > MAX_PERSONAL_HISTORY * 2) {
            personalHistory.splice(0, 2);
        }

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: systemPrompt,
            messages: personalHistory
        });

        const answer = response.content[0].text;

        // Save response to history
        personalHistory.push({ role: "assistant", content: answer });
        if (personalHistory.length > MAX_PERSONAL_HISTORY * 2) {
            personalHistory.splice(0, 2);
        }

        return answer;
    } catch (error) {
        console.error('Error querying Claude (personal):', error);
        return "Sorry, I encountered an error. Please try again.";
    }
}

// Query Claude with business context and memory
async function askClaude(question, businessData, chatId, customerContext = null) {
    try {
        // Format business data for context
        let context = "You are a business assistant with access to the following data:\n\n";

        for (const [sheetName, data] of Object.entries(businessData)) {
            context += `\n=== ${sheetName} ===\n`;
            if (data.length > 0) {
                // Add headers
                context += data[0].join(' | ') + '\n';
                context += '-'.repeat(50) + '\n';
                // Add up to 5000 rows
                const rowsToShow = data.slice(1, 5001);
                rowsToShow.forEach(row => {
                    context += row.join(' | ') + '\n';
                });
                if (data.length > 5001) {
                    context += `\n... and ${data.length - 5001} more rows\n`;
                }
            }
            context += '\n';
        }

        context += "\n\nBE EXTREMELY CONCISE AND DIRECT. Answer questions with minimal words. No filler, no elaboration unless specifically asked.\n\nRESPONSE STYLE RULES:\n- For yes/no questions: Just answer yes/no (or 有/没有 in Chinese)\n- For 'does X owe money': Just state the amount or '没有欠款'/'No outstanding'\n- For 'how much': Just give the number\n- For 'show me X': Just list the data, no introduction\n- Only add explanation if user asks 'why', 'explain', or 'how'\n- Maximum 1-2 sentences unless complex data requires more\n\nDATA STRUCTURE RULES:\n- The 'Invoice Detail Listing' sheet contains MULTIPLE LINE ITEMS per invoice (one row per product in each invoice)\n- When counting invoices, ALWAYS count UNIQUE invoice numbers (Doc No column), NOT total rows\n- When asked 'how many invoices', you MUST deduplicate by invoice number\n- Example: If IV-2501-001 appears 3 times (3 products), that's 1 invoice with 3 items, not 3 invoices\n\nIMPORTANT: Always reply in the same language the user used. If they ask in Chinese, reply in Chinese. If they ask in English, reply in English. Match their language exactly.\n\nPRIVACY RULE: You must NEVER reveal or discuss any information from private conversations. If someone asks about what the admin/owner told you privately, or asks about personal matters, politely decline and say you can only help with business-related questions based on the data provided.";

        // Add customer context if in a customer group
        if (customerContext) {
            context = addCustomerContextToPrompt(context, customerContext);
        }

        // Build messages with conversation history
        const history = getConversationHistory(chatId);
        const messages = [
            { role: "user", content: context }
        ];

        // Add conversation history
        for (const msg of history) {
            messages.push(msg);
        }

        // Add current question
        messages.push({ role: "user", content: question });

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: context,
            messages: messages.length > 1 ? messages.slice(1) : [{ role: "user", content: question }]
        });

        const answer = response.content[0].text;

        // Save to history
        addToHistory(chatId, "user", question);
        addToHistory(chatId, "assistant", answer);

        return answer;
    } catch (error) {
        console.error('Error querying Claude:', error);
        return "Sorry, I encountered an error processing your question. Please try again.";
    }
}


// Initialize WhatsApp client with appropriate auth strategy
async function initializeWhatsAppClient(store) {
    const authStrategy = store
        ? new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000 // Backup session every 5 minutes
          })
        : new LocalAuth();

    client = new Client({
        authStrategy: authStrategy,
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    // WhatsApp Event Handlers
    client.on('qr', (qr) => {
        console.log('\n📱 Scan this QR code with your WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('\nOpen WhatsApp on your phone > Settings > Linked Devices > Link a Device');
    });

    client.on('ready', () => {
        console.log('\n✅ WhatsApp Bot is ready!');
        console.log('📞 Your bot is now listening for messages...\n');
    });

    client.on('authenticated', () => {
        console.log('✅ WhatsApp authenticated successfully');
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Authentication failed:', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('⚠️  WhatsApp disconnected:', reason);
    });

    client.on('remote_session_saved', () => {
        console.log('💾 WhatsApp session saved to MongoDB');
    });

    // Handle incoming messages
    client.on('message', handleMessage);

    return client;
}

// Message handler (moved from inline)
async function handleMessage(message) {
    try {
        const chat = await message.getChat();
        const contact = await message.getContact();

        console.log(`\n📩 Message from ${contact.pushname || contact.number}: ${message.body}`);
        console.log(`📋 Message type: ${message.type}, hasMedia: ${message.hasMedia}`);

        // Check admin status (used for multiple features)
        const senderId = message.from;
        const isAdmin = senderId === ADMIN_NUMBER;

        // Handle file uploads (CSV processing) - Admin only
        // Check for both media and document types (CSV files are often type "document")
        if (message.hasMedia || message.type === 'document') {
            console.log('🔍 File detected, checking admin status...');
            console.log(`👤 Sender: ${senderId}, isAdmin: ${isAdmin}, ADMIN_NUMBER: ${ADMIN_NUMBER}`);

            if (isAdmin) {
                console.log('📥 Downloading media...');
                const media = await message.downloadMedia();
                console.log(`📁 Media downloaded: filename=${media?.filename}, mimetype=${media?.mimetype}`);

                // Check if it's a CSV file
                if (media && media.filename && (media.filename.endsWith('.csv') || media.mimetype === 'text/csv')) {
                    console.log('📄 CSV file received from admin');
                    await message.reply('📥 Processing your CSV file...');

                    try {
                        // Create temp directory if doesn't exist
                        const tempDir = path.join(__dirname, 'temp');
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir);
                        }

                        // Save file temporarily
                        const tempFilePath = path.join(tempDir, `upload_${Date.now()}.csv`);
                        fs.writeFileSync(tempFilePath, media.data, 'base64');

                        // Detect CSV type by filename
                        const filename = media.filename.toLowerCase();
                        let result;

                        if (filename.includes('outstanding')) {
                            // Outstanding CSV - updates payment status
                            console.log('📊 Detected Outstanding CSV');
                            result = await processOutstandingCSV(tempFilePath, sheetsAPI, SHEET_ID);
                        } else {
                            // Invoice Detail Listing CSV - imports invoice data
                            console.log('📋 Detected Invoice Detail CSV');
                            result = await processCsvFile(tempFilePath, sheetsAPI, SHEET_ID);
                        }

                        // Delete temp file
                        fs.unlinkSync(tempFilePath);

                        // Send result
                        if (result.success) {
                            if (result.updatedRows !== undefined) {
                                // Outstanding CSV result
                                await message.reply(
                                    `✅ ${result.message}\n\n` +
                                    `💰 **Payment Status Update:**\n` +
                                    `• Rows updated: ${result.updatedRows}\n` +
                                    `• Paid invoices: ${result.paidCount}\n` +
                                    `• Unpaid invoices: ${result.unpaidCount}`
                                );
                            } else {
                                // Invoice Detail CSV result
                                await message.reply(
                                    `✅ ${result.message}\n\n` +
                                    `📊 **Summary:**\n` +
                                    `• Total records: ${result.totalRecords}\n` +
                                    `• New records added: ${result.newRecords}\n` +
                                    `• Duplicates skipped: ${result.duplicates}\n` +
                                    `• Sheet: ${result.sheetName}`
                                );
                            }
                        } else {
                            await message.reply(`❌ ${result.message}`);
                        }

                        return; // Don't process further
                    } catch (error) {
                        console.error('Error processing CSV:', error);
                        await message.reply('❌ Error processing CSV file. Please check the file format and try again.');
                        return;
                    }
                } else {
                    console.log('⚠️ Not a CSV file, skipping processing');
                }
            } else {
                console.log('⚠️ File received from non-admin, ignoring');
            }
        }

        // Handle payment commands (Admin only)
        if (isAdmin) {
            const paymentCommand = parsePaymentCommand(message.body);

            if (paymentCommand) {
                console.log(`💳 Payment command detected: ${paymentCommand.invoiceNumbers.length} invoice(s) → ${paymentCommand.status}`);

                // If no date provided and status is "Paid", use today's date
                if (paymentCommand.status === 'Paid' && !paymentCommand.paymentDate) {
                    const today = new Date();
                    paymentCommand.paymentDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
                }

                // Process each invoice
                const results = [];
                for (const invoiceNo of paymentCommand.invoiceNumbers) {
                    const result = await updatePaymentStatus(
                        invoiceNo,
                        paymentCommand.status,
                        paymentCommand.paymentDate,
                        sheetsAPI,
                        SHEET_ID
                    );
                    results.push(result);
                }

                // Send summary response
                const successCount = results.filter(r => r.success).length;
                const failCount = results.filter(r => !r.success).length;
                const totalRowsUpdated = results.reduce((sum, r) => sum + (r.rowsUpdated || 0), 0);

                if (successCount > 0) {
                    let response = `✅ Payment status updated!\n\n`;
                    response += `💰 **Status:** ${paymentCommand.status}\n`;
                    if (paymentCommand.paymentDate) {
                        response += `📅 **Date:** ${paymentCommand.paymentDate}\n`;
                    }
                    response += `\n📊 **Summary:**\n`;
                    response += `• Invoices processed: ${results.length}\n`;
                    response += `• Successful: ${successCount}\n`;
                    if (failCount > 0) {
                        response += `• Failed: ${failCount}\n`;
                    }
                    response += `• Total line items updated: ${totalRowsUpdated}\n`;

                    // List each invoice
                    response += `\n📋 **Invoices:**\n`;
                    results.forEach(r => {
                        if (r.success) {
                            response += `✅ ${r.invoiceNo} (${r.rowsUpdated} items)\n`;
                        } else {
                            response += `❌ ${r.invoiceNo} - ${r.message}\n`;
                        }
                    });

                    await message.reply(response);
                } else {
                    await message.reply(`❌ Failed to update invoices. Check invoice numbers and try again.`);
                }

                return; // Don't process further
            }
        }

        // In groups, smart response logic
        if (chat.isGroup) {
            const botId = client.info.wid._serialized;
            const botIdShort = client.info.wid.user;
            const senderKey = `${chat.id._serialized}_${message.author || message.from}`;

            const mentions = await message.getMentions();
            const mentionedMe = mentions.some(c => c.id._serialized === botId);
            const mentionedInIds = message.mentionedIds && message.mentionedIds.some(id =>
                id === botId || id.includes(botIdShort)
            );

            const startsWithBot = message.body.toLowerCase().startsWith('!bot ');
            const startsWithJjbot = message.body.toLowerCase().startsWith('jjbot ');

            const quotedMsg = await message.getQuotedMessage().catch(() => null);
            const isReplyToBot = quotedMsg && quotedMsg.fromMe;

            const lastInteraction = activeGroupConversations.get(senderKey);
            const hasActiveConversation = lastInteraction && (Date.now() - lastInteraction) < CONVERSATION_TIMEOUT;

            const shouldRespond = mentionedMe || mentionedInIds || startsWithBot || startsWithJjbot || isReplyToBot || hasActiveConversation;

            if (!shouldRespond) {
                return;
            }

            if (mentionedMe || mentionedInIds || startsWithBot || startsWithJjbot || isReplyToBot) {
                activeGroupConversations.set(senderKey, Date.now());
            } else if (hasActiveConversation) {
                activeGroupConversations.set(senderKey, Date.now());
            }

            if (startsWithBot) {
                message.body = message.body.substring(5).trim();
            } else if (startsWithJjbot) {
                message.body = message.body.substring(6).trim();
            }
        }

        if (message.fromMe) {
            return;
        }

        // senderId and isAdmin already declared at top of function

        if (!botSettings.enabled && !isAdmin) {
            return;
        }

        chat.sendStateTyping();

        // Check for invoice stats queries (triggers automatic accurate counting)
        const lowerBody = message.body.toLowerCase();
        const isInvoiceStatsQuery = (
            (lowerBody.includes('how many') || lowerBody.includes('count')) &&
            (lowerBody.includes('invoice') || lowerBody.includes('unpaid') || lowerBody.includes('paid'))
        );

        if (isInvoiceStatsQuery) {
            console.log('📊 Invoice stats query detected, fetching accurate stats...');
            const stats = await getInvoiceStats(sheetsAPI, SHEET_ID);

            if (stats.success) {
                let response = '📊 *Invoice Statistics*\n\n';
                response += `📋 Total Invoices: ${stats.totalInvoices}\n`;
                response += `✅ Paid: ${stats.paidCount} (RM ${stats.paidAmount.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})})\n`;
                response += `⏳ Unpaid: ${stats.unpaidCount} (RM ${stats.unpaidAmount.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})})\n`;

                if (lowerBody.includes('unpaid') && stats.unpaidCount > 0 && stats.unpaidCount <= 10) {
                    response += `\n*Unpaid Invoices:*\n`;
                    stats.unpaidInvoices.forEach(inv => {
                        response += `• ${inv.invoiceNo}: RM ${inv.total.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${inv.lineItems} items)\n`;
                    });
                }

                await message.reply(response);
                return; // Don't process with AI
            }
        }

        // Admin commands
        if (isAdmin && message.body.toLowerCase().startsWith('/admin')) {
            const cmd = message.body.toLowerCase().replace('/admin', '').trim();

            if (cmd === 'help') {
                await message.reply(
                    '🔐 *Admin Commands:*\n\n' +
                    '/admin help - Show this menu\n' +
                    '/admin status - Show bot status\n' +
                    '/admin on - Enable bot\n' +
                    '/admin off - Disable bot\n' +
                    '/admin clearmemory - Clear all conversation history\n' +
                    '/admin groups on - Enable group responses\n' +
                    '/admin groups off - Disable group responses'
                );
                return;
            }

            if (cmd === 'status') {
                const usingMongo = !!MONGODB_URI;
                await message.reply(
                    '📊 *Bot Status:*\n\n' +
                    `• Enabled: ${botSettings.enabled ? '✅ Yes' : '❌ No'}\n` +
                    `• Groups: ${botSettings.respondInGroups ? '✅ Yes' : '❌ No'}\n` +
                    `• Max Rows: ${botSettings.maxRows}\n` +
                    `• Active Chats: ${conversationHistory.size}\n` +
                    `• Session Storage: ${usingMongo ? '☁️ MongoDB (Persistent)' : '💾 Local'}`
                );
                return;
            }

            if (cmd === 'on') {
                botSettings.enabled = true;
                await message.reply('✅ Bot is now *enabled*');
                return;
            }

            if (cmd === 'off') {
                botSettings.enabled = false;
                await message.reply('❌ Bot is now *disabled* (only you can still use it)');
                return;
            }

            if (cmd === 'clearmemory') {
                conversationHistory.clear();
                await message.reply('🧹 All conversation history cleared');
                return;
            }

            if (cmd === 'groups on') {
                botSettings.respondInGroups = true;
                await message.reply('✅ Bot will now respond in groups');
                return;
            }

            if (cmd === 'groups off') {
                botSettings.respondInGroups = false;
                await message.reply('❌ Bot will no longer respond in groups');
                return;
            }

            await message.reply('Unknown admin command. Use /admin help');
            return;
        }

        if (chat.isGroup && !botSettings.respondInGroups && !isAdmin) {
            return;
        }

        // Special commands
        if (message.body.toLowerCase() === '/start' || message.body.toLowerCase() === 'hi' || message.body.toLowerCase() === 'hello') {
            await message.reply(
                '👋 Hello! I\'m your AI business assistant.\n\n' +
                'I can help you with:\n' +
                '• Check stock levels\n' +
                '• Price inquiries\n' +
                '• Sales data\n' +
                '• Property information\n' +
                '• Rental schedules\n' +
                '• And more!\n\n' +
                'Just ask me anything about your business data.'
            );
            return;
        }

        if (message.body.toLowerCase() === '/help') {
            await message.reply(
                '💡 Example questions:\n\n' +
                '• "What\'s the current price for shark fin?"\n' +
                '• "Show me stock levels for sea cucumber"\n' +
                '• "What\'s my rental income this month?"\n' +
                '• "List all customers from January"\n' +
                '• "What are the upcoming loan payments?"\n\n' +
                'Ask me anything!'
            );
            return;
        }

        // DM from admin - personal mode
        if (!chat.isGroup && isAdmin) {
            console.log('📱 Private DM from admin');
            const businessData = await getAllBusinessData();
            const answer = await askClaudePersonalWithData(message.body, businessData);
            await message.reply(answer);
            console.log(`✅ Private response sent`);
            return;
        }

        // Groups - business mode
        const businessData = await getAllBusinessData();

        if (Object.keys(businessData).length === 0) {
            await message.reply('⚠️ Unable to access business data. Please check Google Sheets connection.');
            return;
        }

        // Extract customer context from group name (if applicable)
        let customerContext = null;
        if (chat.isGroup && chat.name) {
            customerContext = getCustomerContextFromGroup(chat.name);
            if (customerContext) {
                console.log(`🏢 Group context detected: ${customerContext.customerName}`);
            }
        }

        const chatId = chat.id._serialized;
        const answer = await askClaude(message.body, businessData, chatId, customerContext);
        await message.reply(answer);

        console.log(`✅ Response sent`);

    } catch (error) {
        console.error('Error handling message:', error);
        await message.reply('Sorry, I encountered an error. Please try again.');
    }
}

// Start the bot
async function startBot() {
    console.log('🚀 Starting WhatsApp Business Bot...\n');

    // Check environment variables
    if (!process.env.CLAUDE_API_KEY) {
        console.error('❌ CLAUDE_API_KEY not found in .env file');
        console.log('Please add your Claude API key to the .env file\n');
        process.exit(1);
    }

    if (!process.env.GOOGLE_SHEET_ID) {
        console.error('❌ GOOGLE_SHEET_ID not found in .env file');
        console.log('Please add your Google Sheet ID to the .env file\n');
        process.exit(1);
    }

    // Initialize MongoDB if URI is provided (for persistent session)
    let store = null;
    if (MONGODB_URI) {
        try {
            console.log('🔗 Connecting to MongoDB for persistent session...');
            await mongoose.connect(MONGODB_URI);
            store = new MongoStore({ mongoose: mongoose });
            console.log('✅ MongoDB connected - WhatsApp session will persist across restarts!');
        } catch (error) {
            console.error('⚠️  MongoDB connection failed:', error.message);
            console.log('Falling back to LocalAuth (session won\'t persist)\n');
        }
    } else {
        console.log('ℹ️  No MONGODB_URI set - using LocalAuth (session stored locally)');
        console.log('   To enable persistent sessions, add MONGODB_URI to .env\n');
    }

    // Initialize WhatsApp client
    await initializeWhatsAppClient(store);

    // Initialize Google Sheets
    const sheetsInitialized = await initGoogleSheets();
    if (!sheetsInitialized) {
        console.log('\n⚠️  Continuing without Google Sheets - bot will have limited functionality');
    }

    // Initialize WhatsApp
    client.initialize();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down bot...');
    await client.destroy();
    process.exit(0);
});

// Start
startBot();
