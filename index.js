const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 TOM PRIME X BOT STARTING...');
console.log('👑 Engineered by Professor Tom');
console.log('==================================\n');

// server.js চালু - Pair Code API
const server = spawn('node', [path.join(__dirname, 'server.js')], { 
    stdio: 'inherit',
    shell: true
});

// bot.js চালু - Telegram Bot + Auto Sub-Bot Manager  
const bot = spawn('node', [path.join(__dirname, 'bot.js')], { 
    stdio: 'inherit',
    shell: true
});

console.log('✅ Server Process Started - PID:', server.pid);
console.log('✅ Bot Process Started - PID:', bot.pid);

// Error হ্যান্ডেল
server.on('error', (err) => {
    console.error('🛑 Server Process Error:', err.message);
});

bot.on('error', (err) => {
    console.error('🛑 Bot Process Error:', err.message);
});

// Process exit হলে
server.on('exit', (code) => {
    console.log(`⚠️ Server process exited with code: ${code}`);
    if (code !== 0) process.exit(code);
});

bot.on('exit', (code) => {
    console.log(`⚠️ Bot process exited with code: ${code}`);
    if (code !== 0) process.exit(code);
});

// Ctrl+C দিলে সব kill হবে
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all processes...');
    server.kill('SIGINT');
    bot.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    bot.kill('SIGTERM');
    process.exit(0);
});

// Global error catch
process.on('uncaughtException', (err) => {
    console.error('🛑 Main Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.error('🛑 Main Rejection:', err.message);
});
