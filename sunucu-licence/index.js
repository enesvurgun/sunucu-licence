const express = require("express");
const app = express();
const cors = require("cors");
const crypto = require('crypto'); // Şifreleme için Node.js'in kendi modülü

app.use(cors());
app.use(express.json());

const validKeys = (process.env.LICENSE_KEYS || "").split(",");
const sessionKeys = new Map(); // Geçici oturum anahtarlarını saklamak için
const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16;

// Şifreleme fonksiyonu
function encrypt(text, key) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// --- Fonksiyon Kütüphanesi (Değişiklik yok) ---
const functionLibrary = { /* ... Önceki cevaptaki fonksiyonların tamamı buraya gelecek ... */ };

// --- YENİ ADRES: El Sıkışma (Handshake) ---
app.get("/handshake", (req, res) => {
    const { licenseKey } = req.query;
    if (!licenseKey || !validKeys.includes(licenseKey)) {
        return res.status(403).send("Error: Geçersiz Lisans.");
    }
    // Bu lisans için geçici ve güvenli bir oturum anahtarı oluştur
    const sessionKey = crypto.randomBytes(32).toString('hex');
    sessionKeys.set(licenseKey, sessionKey); // Anahtarı lisansla ilişkilendirerek sakla

    console.log(`Anahtar oluşturuldu: ${licenseKey}`);
    res.status(200).json({ sessionKey: sessionKey });
});

// --- GÜNCELLENMİŞ ADRES: Şifreli Fonksiyon Gönderme ---
app.get("/get-function", (req, res) => {
    const { licenseKey, functionName } = req.query;
    const sessionKey = sessionKeys.get(licenseKey);

    // 1. Önce oturum anahtarı var mı diye kontrol et (Handshake yapılmış mı?)
    if (!sessionKey) {
        return res.status(401).send("Error: Oturum anahtarı bulunamadı. Önce /handshake yapın.");
    }

    const functionCode = functionLibrary[functionName];
    if (functionCode) {
        // 2. Fonksiyon kodunu oturum anahtarıyla şifrele
        const encryptedCode = encrypt(functionCode, sessionKey);
        res.setHeader('Content-Type', 'text/plain');
        res.send(encryptedCode); // Şifreli veriyi gönder
    } else {
        res.status(404).send("Error: Fonksiyon bulunamadı.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Şifreli Fonksiyon Fabrikası sunucusu ${PORT} portunda çalışıyor.`);
});