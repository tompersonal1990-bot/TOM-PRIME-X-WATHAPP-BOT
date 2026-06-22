const express = require('express');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers, delay } = require('@whiskeysockets/baileys');

process.on('uncaughtException', (err) => console.error('🛑', err.message));
process.on('unhandledRejection', (err) => console.error('🛑', err));

const app = express();
const PORT = process.env.PORT || 3000;
global.pairingInstances = global.pairingInstances || {};

const sessionsDir = process.env.RENDER_DISK || path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

app.get('/', (req, res) => res.send('👑 TOM PRIME X ACTIVE ✅'));

app.get('/pair', async (req, res) => {
    let phone = req.query.phone;
    if (!phone) return res.json({ status: false, error: "Phone দে!" });
    phone = phone.replace(/[^0-9]/g, '');

    const sessionPath = path.join(sessionsDir, phone);

    try {
        if (global.pairingInstances[phone]) {
            try { await global.pairingInstances[phone].end(); } catch(e){}
            delete global.pairingInstances[phone];
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.ubuntu("Chrome"),
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
            syncFullHistory: false,
        });

        global.pairingInstances[phone] = sock;
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                console.log(`✅ ${phone} connected`);
                delete global.pairingInstances[phone];
            }
        });

        if (!state.creds.registered) {
            await delay(3000);
            let code = await sock.requestPairingCode(phone);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            return res.json({ status: true, code: code });
        } else {
            return res.json({ status: false, message: "Already connected!" });
        }

    } catch (err) {
        res.json({ status: false, error: err.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Pair Server: ${PORT}`));
