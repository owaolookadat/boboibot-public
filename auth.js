const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'oauth_credentials.json');

async function authenticate() {
    console.log('🔐 Google Sheets Authentication\n');

    // Check for credentials file
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ oauth_credentials.json not found!\n');
        console.log('📋 To create OAuth credentials:');
        console.log('1. Go to https://console.cloud.google.com/');
        console.log('2. Select or create a project');
        console.log('3. Enable the Google Sheets API:');
        console.log('   - Search for "Google Sheets API" and click Enable');
        console.log('4. Configure OAuth consent screen:');
        console.log('   - Go to "OAuth consent screen"');
        console.log('   - Choose "External" user type');
        console.log('   - Fill in app name and your email');
        console.log('   - Add scope: .../auth/spreadsheets.readonly');
        console.log('   - Add your email as a test user');
        console.log('5. Create OAuth credentials:');
        console.log('   - Go to "Credentials"');
        console.log('   - Click "Create Credentials" > "OAuth client ID"');
        console.log('   - Choose "Desktop app"');
        console.log('   - Download the JSON file');
        console.log('   - Rename it to "oauth_credentials.json"');
        console.log('   - Place it in this folder\n');
        console.log('6. Run this script again: node auth.js\n');
        process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        'http://localhost:3000/callback'
    );

    // Generate auth URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('🌐 Opening browser for Google authentication...\n');
    console.log('If browser doesn\'t open, visit this URL:\n');
    console.log(authUrl);
    console.log('\n⏳ Waiting for authentication...\n');

    // Start local server to receive callback
    const server = http.createServer(async (req, res) => {
        if (req.url.startsWith('/callback')) {
            const queryParams = url.parse(req.url, true).query;
            const code = queryParams.code;

            if (code) {
                try {
                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);

                    // Save token
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window and return to the terminal.</p></body></html>');

                    console.log('✅ Authentication successful!');
                    console.log('📁 Token saved to token.json\n');
                    console.log('You can now run: npm start\n');

                    server.close();
                    process.exit(0);
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h1>Authentication failed</h1><p>Check the terminal for details.</p></body></html>');
                    console.error('❌ Error getting token:', error.message);
                    server.close();
                    process.exit(1);
                }
            } else {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>No authorization code received</h1></body></html>');
            }
        }
    });

    server.listen(3000, () => {
        // Try to open browser
        const { exec } = require('child_process');
        const platform = process.platform;

        if (platform === 'win32') {
            exec(`start "" "${authUrl}"`);
        } else if (platform === 'darwin') {
            exec(`open "${authUrl}"`);
        } else {
            exec(`xdg-open "${authUrl}"`);
        }
    });
}

authenticate();
