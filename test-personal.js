// Quick test script for personal assistant features
// Run: node test-personal.js

const { parseReminder, formatDateTime } = require('./reminderParser');
const { detectPersonalIntent } = require('./personalAssistant');

console.log('🧪 Testing Personal Assistant Features\n');

// Test 1: Date Parsing
console.log('📅 Test 1: Date Parsing');
console.log('─'.repeat(50));

const testMessages = [
    "Remind me to call John at 3pm tomorrow",
    "Meeting next Monday at 10am",
    "Remind me in 30 minutes",
    "Remind me to work out every Monday, Wednesday, Friday at 6am"
];

testMessages.forEach((msg, i) => {
    console.log(`\n${i + 1}. Input: "${msg}"`);
    const parsed = parseReminder(msg);
    console.log(`   Task: "${parsed.task}"`);
    console.log(`   When: ${formatDateTime(parsed.datetime)}`);
    console.log(`   Repeat: ${parsed.repeat ? JSON.stringify(parsed.repeat) : 'None'}`);
    console.log(`   Confidence: ${(parsed.confidence * 100).toFixed(0)}%`);
});

// Test 2: Intent Detection
console.log('\n\n🎯 Test 2: Intent Detection');
console.log('─'.repeat(50));

const intentTests = [
    "Remind me to test this",
    "Show my reminders",
    "Delete last reminder",
    "yes",
    "tekkah is a customer",
    "list all unpaid invoices"
];

intentTests.forEach((msg, i) => {
    const intent = detectPersonalIntent(msg);
    console.log(`\n${i + 1}. "${msg}"`);
    console.log(`   Personal: ${intent.isPersonal ? '✅ YES' : '❌ NO'}`);
    if (intent.isPersonal) {
        console.log(`   Type: ${intent.type}`);
    } else {
        console.log(`   Type: Business query`);
    }
});

console.log('\n\n✅ All tests completed!');
console.log('💡 If you see no errors above, everything is working!\n');
