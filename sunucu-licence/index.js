const express = require("express");
const app = express();
const cors = require("cors");
const crypto = require('crypto');

app.use(cors());
app.use(express.json());

// Daha güvenli anahtar yönetimi
const validKeys = (process.env.LICENSE_KEYS || "").split(",").filter(Boolean);
const sessionKeys = new Map();
const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16;

// Gelişmiş şifreleme fonksiyonu
function encrypt(text, key) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const keyBuffer = crypto.createHash('sha256').update(key).digest();
        const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
        console.error('Şifreleme hatası:', error);
        return null;
    }
}

// Fonksiyon kütüphanesi - OBFUSCATE EDİLMİŞ VERSİYON
const functionLibrary = {
    sendArmyMoveRequest: `
        (function(){
            return async function(){
                var t=new URLSearchParams;
                t.append("xjxfun","doArmyMove"),
                t.append("xjxr",Date.now().toString()),
                t.append("xjxargs[]","SArmyDeployment");
                var e=String.raw\\\`<xjxobj><e><k>formData</k><v><xjxobj><e><k>army</k><v><xjxobj><e><k>P1</k><v>S</v></e><e><k>S1</k><v>S1</v></e><e><k>M1</k><v>S</v></e><e><k>K1</k><v>S</v></e><e><k>KS</k><v>S</v></e></xjxobj></v></e><e><k>holding</k><v><xjxobj><e><k>2</k><v><xjxobj><e><k>0</k><v>S24595</v></e></xjxobj></v></e></xjxobj></v></e><e><k>button</k><v>S<![CDATA[Move to field]]></v></e></xjxobj></v></e><e><k>moveArmyToGarrison</k><v>Bfalse</v></e><e><k>vexok</k><v>Btrue</v></e></xjxobj>\\\`,
                r=String.raw\\\`<xjxobj><e><k>isMobileView</k><v>Bfalse</v></e></xjxobj>\\\`;
                t.append("xjxargs[]",e),
                t.append("xjxargs[]",r);
                try{
                    var i=await fetch("https://www.imperiaonline.org/imperia/game_v6/game/xajax_loader.php",{
                        method:"POST",
                        headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8"},
                        body:t.toString()
                    });
                    i.ok?console.log("✅ İşlem başarılı."):console.error("❌ Sunucu hatası:",i.status)
                }catch(t){
                    console.error("❌ Hata:",t)
                }
            }
        })()
    `.replace(/\n\s*/g, '') // Minify
};

// Anti-bot koruması
const requestLimiter = new Map();

app.get("/handshake", (req, res) => {
    const { licenseKey } = req.query;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Rate limiting
    const now = Date.now();
    const clientRequests = requestLimiter.get(clientIP) || [];
    const recentRequests = clientRequests.filter(time => now - time < 60000); // 1 dakika
    
    if (recentRequests.length > 10) {
        return res.status(429).send("Too many requests");
    }
    
    requestLimiter.set(clientIP, [...recentRequests, now]);
    
    if (!licenseKey || !validKeys.includes(licenseKey)) {
        return res.status(403).json({ error: "Geçersiz lisans anahtarı" });
    }
    
    const sessionKey = crypto.randomBytes(32).toString('hex');
    sessionKeys.set(licenseKey, { key: sessionKey, timestamp: now });
    
    // Eski oturumları temizle
    cleanupOldSessions();
    
    console.log(`Yeni oturum: ${licenseKey.substring(0, 8)}...`);
    res.json({ sessionKey, timestamp: now });
});

app.get("/get-function", (req, res) => {
    const { licenseKey, functionName, h } = req.query; // h: hash for validation
    
    // Hash doğrulama (tampering protection)
    if (!h || crypto.createHash('md5').update(licenseKey + functionName).digest('hex') !== h) {
        return res.status(400).send("Invalid request");
    }
    
    const sessionData = sessionKeys.get(licenseKey);
    if (!sessionData || Date.now() - sessionData.timestamp > 300000) { // 5 dakika
        return res.status(401).send("Oturum süresi doldu");
    }
    
    const functionCode = functionLibrary[functionName];
    if (!functionCode) {
        return res.status(404).send("Fonksiyon bulunamadı");
    }
    
    const encryptedCode = encrypt(functionCode, sessionData.key);
    if (!encryptedCode) {
        return res.status(500).send("Şifreleme hatası");
    }
    
    res.set('Content-Type', 'text/plain');
    res.send(encryptedCode);
});

// Oturum temizleme
function cleanupOldSessions() {
    const now = Date.now();
    for (let [key, data] of sessionKeys.entries()) {
        if (now - data.timestamp > 300000) { // 5 dakikadan eski
            sessionKeys.delete(key);
        }
    }
}

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok", 
        activeSessions: sessionKeys.size,
        timestamp: Date.now()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🛡️  Güvenli Fonksiyon Sunucusu ${PORT} portunda çalışıyor`);
    console.log(`📊 Aktif lisanslar: ${validKeys.length}`);
});