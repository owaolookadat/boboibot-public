// Generate token from authorization code
// Usage: node generate-token.js <CODE>

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'oauth_credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function generateToken() {
    // Get code from command line argument
    const code = process.argv[2];

    if (!code) {
        console.error('❌ Usage: node generate-token.js <AUTHORIZATION_CODE>');
        console.log('\nExample:');
        console.log('node generate-token.js 4/0ASc3gC2...');
        process.exit(1);
    }

    console.log('🔐 Generating token from authorization code...\n');

    // Load credentials
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        'http://localhost:3000/callback'
    );

    try {
        console.log('⏳ Exchanging code for token...');
        const { tokens } = await oAuth2Client.getToken(code);

        // Save token
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        console.log('✅ Token saved to token.json');
        console.log('✅ Authentication successful!');
        console.log('\n📋 Token includes scopes:');
        console.log('   - Google Sheets');
        console.log('   - Google Calendar');
        console.log('\n🚀 Now restart your bot: pm2 restart boboibot');
    } catch (error) {
        console.error('❌ Error generating token:', error.message);
        console.log('\n💡 The code might have expired. Run node auth.js again to get a new code.');
    }
}

generateToken();
