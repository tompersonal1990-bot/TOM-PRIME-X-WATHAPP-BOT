const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');

const TG_TOKEN = '8803390153:AAGEV-YVCVB7BIOohcUWUAqGULqUjmUbAfs';
const PORT = process.env.PORT || 3000;
const API_URL = process.env.RENDER_URL || `http://localhost:${PORT}`;
const sessionsDir = process.env.RENDER_DISK || path.join(__dirname, 'sessions');

global.subBots = global.subBots || {};
const bot = new TelegramBot(TG_TOKEN, { polling: true });

// Auto Sub-Bot
async function startSubBot(phone, sessionPath) {
    if (global.subBots[phone]) return;

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu("Chrome"),
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
    });

    global.subBots[phone] = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        let msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (text === '.menu') {
            await sock.sendMessage(msg.key.remoteJid, { text: `👋 Hello ${phone}\n✅ Bot Online\nOwner: Tom` });
        }
        if (text === '.ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: `Pong! ${phone} alive 🔥` });
        }
    });

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'close') {
            const reason = update.lastDisconnect?.error?.output?.statusCode;
            if (reason!== DisconnectReason.loggedOut) {
                setTimeout(() => startSubBot(phone, sessionPath), 5000);
            } else {
                delete global.subBots[phone];
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        }
    });
    console.log(`🔥 Sub-bot started: ${phone}`);
}

// /pair command
bot.onText(/\/pair/, async (msg) => {
    const chatId = msg.chat.id;
    if (msg.chat.type === 'private') return;

    const args = msg.text.split(' ');
    if (args.length < 2) return bot.sendMessage(chatId, 'EXAMPLE: /pair +88017XXXXXXXX', { reply_to_message_id: msg.message_id });

    let cleanedPhone = args[1].replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 10) return bot.sendMessage(chatId, '❌ Invalid number!', { reply_to_message_id: msg.message_id });

    const waitingMsg = await bot.sendMessage(chatId, '⏳ Generating pairing code...', { reply_to_message_id: msg.message_id });

    try {
        const response = await axios.get(`${API_URL}/pair`, { params: { phone: cleanedPhone }, timeout: 30000 });
        const data = response.data;

        if (data.status && data.code) {
            await bot.editMessageText(`🔒 *PAIR Code Ready*\n📱 *NUMBER:* ${cleanedPhone}\n\n\`${data.code}\`\n\n📌 WhatsApp > Settings > Linked Devices > Link a Device > Enter Code\n⏰ 60s validity`, {
                chat_id: chatId,
                message_id: waitingMsg.message_id,
                parse_mode: 'Markdown'
            });
        } else {
            await bot.editMessageText(`❌ ${data.error || data.message}`, {
                chat_id: chatId,
                message_id: waitingMsg.message_id
            });
        }
    } catch (error) {
        await bot.editMessageText('❌ API Timeout. Try again.', {
            chat_id: chatId,
            message_id: waitingMsg.message_id
        });
    }
});

// Bot start এ পুরান session চালু
if (fs.existsSync(sessionsDir)) {
    fs.readdirSync(sessionsDir).filter(f => fs.statSync(path.join(sessionsDir, f)).isDirectory()).forEach(phone => {
        if (fs.existsSync(path.join(sessionsDir, phone, 'creds.json'))) {
            startSubBot(phone, path.join(sessionsDir, phone));
        }
    });
}
