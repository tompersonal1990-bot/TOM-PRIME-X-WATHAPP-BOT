const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const sessionsPath = path.join(__dirname, 'sessions');

if (!fs.existsSync(sessionsPath)) fs.mkdirSync(sessionsPath, { recursive: true });

// Home page - ছবির মতো UI
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TOM PRIME X - Pair Bot</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
body{
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height:100vh;display:flex;align-items:center;justify-content:center;
    padding:20px;
}
.box{
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(20px);
    border-radius: 25px;
    padding: 40px 30px;
    width: 100%;
    max-width: 420px;
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.37);
}
h1{
    background: linear-gradient(90deg, #00dbde, #fc00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align:center;font-size:32px;font-weight:700;margin-bottom:10px;
}
p{
    text-align:center;color:#fff;opacity:0.8;margin-bottom:30px;font-size:14px;
}
input{
    width:100%;padding:15px 20px;background:rgba(0,0,0,0.3);
    border:2px solid rgba(255,255,255,0.2);border-radius:12px;
    color:#fff;font-size:16px;outline:none;margin-bottom:20px;
    transition:0.3s;
}
input:focus{border-color:#00dbde;box-shadow:0 0 15px rgba(0,219,222,0.5)}
input::placeholder{color:rgba(255,255,255,0.5)}
.btn{
    width:100%;padding:15px;background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
    border:none;border-radius:12px;color:#fff;font-size:16px;font-weight:600;
    cursor:pointer;transition:0.3s;margin-bottom:20px;
}
.btn:hover{transform:scale(1.05);box-shadow:0 10px 25px rgba(245,87,108,0.4)}
.btn:disabled{opacity:0.6;cursor:not-allowed;transform:scale(1)}
.result{
    background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;display:none;
    border:1px solid rgba(255,255,255,0.2);
}
.result.show{display:block;animation:fadeIn 0.5s}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.code{
    background:#000;padding:15px;border-radius:8px;color:#00ff88;
    font-size:24px;font-weight:700;text-align:center;letter-spacing:3px;
    margin:15px 0;border:2px dashed #00ff88;
}
.copy-btn{
    width:100%;padding:12px;background:transparent;border:2px solid #00dbde;
    border-radius:8px;color:#00dbde;font-weight:600;cursor:pointer;
}
.copy-btn:hover{background:#00dbde;color:#000}
.label{display:flex;align-items:center;gap:8px;color:#00dbde;margin-bottom:10px;font-weight:600}
</style>
</head>
<body>
<div class="box">
    <h1>TOM PRIME X</h1>
    <p>Enter Your WhatsApp Number With Country Code</p>
    
    <input type="tel" id="number" placeholder="+8801XXXXXXXXX" maxlength="15">
    <button class="btn" id="genBtn" onclick="getCode()">GENERATE PAIR CODE</button>
    
    <div class="result" id="result">
        <div class="label">🔑 PAIRING CODE GENERATED</div>
        <div class="code" id="codeBox">LOADING...</div>
        <button class="copy-btn" onclick="copyCode()">📋 COPY CODE</button>
    </div>
</div>

<script>
async function getCode(){
    const num = document.getElementById('number').value.trim();
    const btn = document.getElementById('genBtn');
    const result = document.getElementById('result');
    const codeBox = document.getElementById('codeBox');
    
    if(!num || !num.startsWith('+')){
        alert('Country code সহ নাম্বার দাও। Ex: +8801914388961');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'GENERATING...';
    result.classList.remove('show');
    codeBox.textContent = 'LOADING...';
    
    try{
        const res = await fetch('/pair?number=' + encodeURIComponent(num));
        const data = await res.json();
        
        if(data.code){
            codeBox.textContent = data.code;
            result.classList.add('show');
            btn.textContent = 'GENERATE PAIR CODE';
        } else {
            alert(data.error || 'Error হইছে ভাই');
            btn.textContent = 'GENERATE PAIR CODE';
        }
    } catch(e){
        alert('Server error');
        btn.textContent = 'GENERATE PAIR CODE';
    }
    btn.disabled = false;
}

function copyCode(){
    const code = document.getElementById('codeBox').textContent;
    navigator.clipboard.writeText(code);
    alert('Code copied: ' + code);
}
</script>
</body>
</html>
    `);
});

// Pair API - ফিক্স করা ভার্সন
app.get('/pair', async (req, res) => {
    let { number } = req.query;
    if(!number) return res.json({error: 'Number লাগবে'});
    
    number = number.replace(/[^0-9+]/g, '');
    const id = 'user_' + Date.now();
    const sessionDir = path.join(sessionsPath, id);
    fs.mkdirSync(sessionDir, { recursive: true });
    
    try{
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: require('pino')({level: 'silent'})
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        await delay(3000);
        const code = await sock.requestPairingCode(number);
        
        // এখানে ফিক্স: ev.once এর বদলে ev.on
        sock.ev.on('connection.update', (update) => {
            const { connection } = update;
            if(connection === 'open'){
                console.log('✅ Connected:', number);
                setTimeout(() => sock.ws.close(), 5000);
            }
        });
        
        setTimeout(() => {
            try { sock.ws.close() } catch(e) {}
        }, 30000);
        
        res.json({code: code});
        
    } catch(e){
        console.error(e);
        res.json({error: e.message});
    }
});

app.listen(PORT, () => console.log('🌐 Server running on port', PORT));
