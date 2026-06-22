process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

const express = require('express');
const pino = require('pino');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const config = require('./config');

// Anti-Crash Shields Layer
process.on('uncaughtException', (err) => console.error('🛑 Protection:', err.message));
process.on('unhandledRejection', (err) => {
  if (err.message && err.message.includes('rate-overlimit')) return;
  console.error('🛑 Protection Rejection:', err);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('👑 TOM PRIME X IS ACTIVE ✅');
});

global.pairingInstances = global.pairingInstances || {};

const LOCK_PIC = "https://i.postimg.cc/pVF8rw2m/IMG-20260329-WA0128.jpg";
const LOCK_NAME = "—͞To፝֟ᴍㅤᏴꫝ֟፝ʙ𝚈ㅤᥫᩣ";
const LOCK_NUM = "8801889428254";
const LOCK_JID = LOCK_NUM + '@s.whatsapp.net';
const WP_CHANNEL = "https://whatsapp.com/channel/0029VbBItW060eBXTB93HT1Q";

async function getBuffer(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return res.data;
  } catch (e) { return null; }
}

async function sendWithContact(sock, jid, text) {
  try {
    const thumb = await getBuffer(LOCK_PIC);
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${LOCK_NAME}\nTEL;type=CELL;type=VOICE;waid=${LOCK_NUM}:${LOCK_NUM}\nEND:VCARD`;
    await sock.sendMessage(jid, {
      text: text,
      contextInfo: {
        stanzaId: Math.floor(100000 + Math.random() * 900000).toString(),
        participant: LOCK_JID,
        quotedMessage: { contactMessage: { displayName: LOCK_NAME, vcard: vcard, jpegThumbnail: thumb || undefined } }
      }
    });
  } catch (e) {}
}

// === 🤖 TELEGRAM BOT INTERFACE ===
const TG_TOKEN = '8803390153:AAGEV-YVCVB7BIOohcUWUAqGULqUjmUbAfs'; 
const bot = new TelegramBot(TG_TOKEN, { polling: true });

bot.on('polling_error', (error) => {});

bot.onText(/\/pair/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    if (msg.chat.type === 'private') return;

    const text = msg.text || '';
    const args = text.split(' ');

    if (args.length < 2) {
        return bot.sendMessage(chatId, `PLEASE PROVIDE A PHONE NUMBER.\nEXAMPLE: /pair +88017XXXXXXXX`, { reply_to_message_id: messageId });
    }

    let inputPhone = args.slice(1).join('').trim();
    let cleanedPhone = inputPhone.replace(/[^0-9]/g, '');

    if (!cleanedPhone || cleanedPhone.length < 10) {
        return bot.sendMessage(chatId, '❌ Invalid phone number format!', { reply_to_message_id: messageId });
    }

    const waitingMsg = await bot.sendMessage(chatId, '⏳ *Please wait...* Spawning temporary container...', {
        reply_to_message_id: messageId,
        parse_mode: 'Markdown'
    }).catch(() => null);

    if (!waitingMsg) return;

    if (global.pairingInstances[cleanedPhone]) {
        try { global.pairingInstances[cleanedPhone].end(); } catch (e) {}
        delete global.pairingInstances[cleanedPhone];
    }

    setTimeout(async () => {
        try {
            // Dynamic ESM Import
            const baileys = await import('@whiskeysockets/baileys');
            const makeWASocket = baileys.default || baileys.makeWASocket;
            const { 
                useMemoryAuthState, // Fix: Updated function name for latest Baileys core
                fetchLatestBaileysVersion, 
                makeCacheableSignalKeyStore, 
                Browsers, 
                delay 
            } = baileys;

            let { version } = await fetchLatestBaileysVersion();
            
            // Execute memory state function properly
            const { state, saveCreds } = useMemoryAuthState();

            const sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                browser: Browsers.ubuntu("Chrome"),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
                },
                syncFullHistory: false,
                downloadHistory: false,
                markOnlineOnConnect: true,
                connectTimeoutMs: 60000,
            });

            global.pairingInstances[cleanedPhone] = sock;

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection } = update;
                if (connection === 'open') {
                    await bot.sendMessage(chatId, `🎉 *Bot Connected Successfully!*\n📱 *User:* ${cleanedPhone}`, {
                        reply_to_message_id: messageId,
                        parse_mode: 'Markdown'
                    }).catch(() => {});

                    const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const welcomeText = `*🤖 ᴛᴏᴍ ᴘʀɪᴍᴇ x ʙᴏᴛ ᴏণʟɪɴᴇ!*\n\n*STATUS:* CONNECTED ✅\n*DEV:* PROFESSOR TOM\n*CHANNEL:* ${WP_CHANNEL}`;
                    await sendWithContact(sock, myJid, welcomeText);
                }
            });

            if (!sock.authState.creds.registered) {
                await delay(2000); 
                let code = await sock.requestPairingCode(cleanedPhone);
                code = code?.match(/.{1,4}/g)?.join("-") || code;

                const successMessage = `🔒 *PAIR Code Ready*\n` +
                                       `📱 *NUMBER:* ${cleanedPhone}\n\n` +
                                       `  🔑 \`${code}\`  \n\n` +
                                       `📌 *HOW TO USE:*\n` +
                                       `1. WhatsApp ➡️ Settings ➡️ Linked Devices\n` +
                                       `2. Click LINK A DEVICE ➡️ ENTER CODE\n` +
                                       `👑 *Owner:* Tom`;

                await bot.editMessageText(successMessage, {
                    chat_id: chatId,
                    message_id: waitingMsg.message_id,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                }).catch(() => {});
            }

        } catch (err) {
            await bot.editMessageText(`❌ *Pairing Instance Failure:* ${err.message}`, {
                chat_id: chatId,
                message_id: waitingMsg.message_id
            }).catch(() => {});
        }
    }, 50);
});

app.listen(PORT, () => {
    console.log(`🚀 Dedicated Memory-Auth Engine running on port ${PORT}`);
});
