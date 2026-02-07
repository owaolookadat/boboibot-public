// Google Calendar OAuth setup script
// Run this once to authorize calendar access

const { google } = require('googleapis');
const fs = require('fs').promises;
const http = require('http');
const url = require('url');
const path = require('path');

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar'
];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'oauth_credentials.json');

async function setupCalendar() {
    console.log('🔐 Setting up Google Calendar authorization...\n');

    // Check if credentials exist
    try {
        await fs.access(CREDENTIALS_PATH);
    } catch (error) {
        console.error('❌ oauth_credentials.json not found!');
        console.log('\n📝 This should already exist from Google Sheets setup!');
        console.log('If missing, follow these steps:');
        console.log('1. Go to: https://console.cloud.google.com/');
        console.log('2. Select your existing project');
        console.log('3. Enable "Google Calendar API"');
        console.log('4. Use existing OAuth credentials');
        console.log('5. Make sure oauth_credentials.json exists');
        console.log('\nRun this script again after fixing credentials.');
        process.exit(1);
    }

    // Load credentials
    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    // Generate auth URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('📱 Authorize this app by visiting:\n');
    console.log(authUrl);
    console.log('\n');

    // Start local server to receive callback
    const server = http.createServer(async (req, res) => {
        try {
            if (req.url.indexOf('/oauth2callback') > -1) {
                const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
                const code = qs.get('code');

                res.end('✅ Authentication successful! You can close this window and return to terminal.');

                server.close();

                // Get token
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);

                // Save token
                await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));

                console.log('✅ Token saved to:', TOKEN_PATH);
                console.log('✅ Google Calendar setup complete!');
                console.log('\n🚀 You can now use calendar reminders in your bot!');
                process.exit(0);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            res.end('❌ Authentication failed');
            process.exit(1);
        }
    });

    server.listen(3000, () => {
        console.log('⏳ Waiting for authorization...');
        console.log('💡 If browser doesn\'t open automatically, copy the URL above');
    });
}

setupCalendar().catch(console.error);
