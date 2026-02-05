const fs = require('fs');
const path = require('path');

console.log('🔍 WhatsApp Bot Setup Verification\n');
console.log('This script checks if everything is configured correctly.\n');

let hasErrors = false;

// Check 1: Node.js version
console.log('1️⃣ Checking Node.js version...');
const nodeVersion = process.version;
console.log(`   ✅ Node.js ${nodeVersion} detected`);
if (parseInt(nodeVersion.slice(1)) < 16) {
    console.log('   ⚠️  Warning: Node.js 16+ recommended');
    hasErrors = true;
}

// Check 2: .env file exists
console.log('\n2️⃣ Checking .env file...');
if (fs.existsSync('.env')) {
    console.log('   ✅ .env file found');
    
    // Load .env
    require('dotenv').config();
    
    // Check API key
    if (process.env.CLAUDE_API_KEY) {
        if (process.env.CLAUDE_API_KEY === 'your_claude_api_key_here') {
            console.log('   ❌ CLAUDE_API_KEY not configured (still has placeholder value)');
            console.log('      → Edit .env and add your real API key');
            hasErrors = true;
        } else if (process.env.CLAUDE_API_KEY.startsWith('sk-ant-')) {
            console.log('   ✅ CLAUDE_API_KEY configured');
        } else {
            console.log('   ⚠️  CLAUDE_API_KEY format looks unusual');
            console.log('      → Should start with "sk-ant-"');
            hasErrors = true;
        }
    } else {
        console.log('   ❌ CLAUDE_API_KEY not found in .env');
        hasErrors = true;
    }
    
    // Check Sheet ID
    if (process.env.GOOGLE_SHEET_ID) {
        if (process.env.GOOGLE_SHEET_ID === 'your_google_sheet_id_here') {
            console.log('   ❌ GOOGLE_SHEET_ID not configured (still has placeholder value)');
            console.log('      → Edit .env and add your Google Sheet ID');
            hasErrors = true;
        } else {
            console.log('   ✅ GOOGLE_SHEET_ID configured');
        }
    } else {
        console.log('   ❌ GOOGLE_SHEET_ID not found in .env');
        hasErrors = true;
    }
} else {
    console.log('   ❌ .env file not found');
    console.log('      → Run: copy .env.example .env');
    console.log('      → Then edit .env with your keys');
    hasErrors = true;
}

// Check 3: credentials.json
console.log('\n3️⃣ Checking Google credentials...');
if (fs.existsSync('credentials.json')) {
    console.log('   ✅ credentials.json found');
    
    try {
        const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
        if (credentials.type === 'service_account') {
            console.log('   ✅ Valid service account credentials');
            console.log(`   📧 Service account email: ${credentials.client_email}`);
            console.log('      → Make sure you shared your Google Sheet with this email!');
        } else {
            console.log('   ⚠️  Credentials file format unexpected');
            hasErrors = true;
        }
    } catch (error) {
        console.log('   ❌ Error reading credentials.json:', error.message);
        hasErrors = true;
    }
} else {
    console.log('   ❌ credentials.json not found');
    console.log('      → Download from Google Cloud Console');
    console.log('      → Place in bot folder');
    hasErrors = true;
}

// Check 4: Dependencies
console.log('\n4️⃣ Checking dependencies...');
if (fs.existsSync('node_modules')) {
    console.log('   ✅ node_modules folder found');
    
    const requiredPackages = [
        'whatsapp-web.js',
        'googleapis',
        'dotenv',
        'qrcode-terminal',
        'anthropic-ai'
    ];
    
    let missingPackages = [];
    requiredPackages.forEach(pkg => {
        if (!fs.existsSync(path.join('node_modules', pkg))) {
            missingPackages.push(pkg);
        }
    });
    
    if (missingPackages.length > 0) {
        console.log('   ⚠️  Some packages missing:', missingPackages.join(', '));
        console.log('      → Run: npm install');
        hasErrors = true;
    } else {
        console.log('   ✅ All required packages installed');
    }
} else {
    console.log('   ❌ node_modules not found');
    console.log('      → Run: npm install');
    hasErrors = true;
}

// Check 5: Required files
console.log('\n5️⃣ Checking required files...');
const requiredFiles = ['bot.js', 'package.json', '.gitignore'];
let allFilesPresent = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file} found`);
    } else {
        console.log(`   ❌ ${file} missing`);
        allFilesPresent = false;
        hasErrors = true;
    }
});

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ SETUP INCOMPLETE - Please fix the errors above');
    console.log('\nCommon solutions:');
    console.log('1. Make sure you ran: npm install');
    console.log('2. Create .env file: copy .env.example .env');
    console.log('3. Edit .env with your actual API keys');
    console.log('4. Download credentials.json from Google Cloud');
    console.log('5. Share your Google Sheet with service account email');
    console.log('\nSee README.md for detailed instructions.');
} else {
    console.log('✅ SETUP LOOKS GOOD!');
    console.log('\nYou\'re ready to start the bot!');
    console.log('Run: npm start');
    console.log('\nRemember to:');
    console.log('- Share Google Sheet with service account email');
    console.log('- Have your dedicated WhatsApp phone ready');
    console.log('- Keep this terminal window open while bot runs');
}
console.log('='.repeat(50));

process.exit(hasErrors ? 1 : 0);
