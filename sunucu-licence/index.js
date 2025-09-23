// index.js (Kale Mimarisi - Sunucu Kodu)

const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs"); // Dosya okumak için 'fs' (File System) modülünü ekliyoruz
const path = require("path");

app.use(cors());

// ÖNEMLİ: Lisans anahtarlarını Render panelindeki "Environment Variables" bölümüne eklemeyi unutma!
// Key: LICENSE_KEYS, Value: ANAHTAR1,ANAHTAR2,ANAHTAR3
const validKeys = (process.env.LICENSE_KEYS || "").split(",");

// Sunucunun göndereceği zırhlı kodun dosya yolunu belirliyoruz
const payloadPath = path.join(__dirname, 'payload.js');

// Eklentinin iletişim kuracağı tek kapı.
// Bu adres, lisansı doğrulayıp başarılıysa payload'u gönderir.
app.get("/validate", (req, res) => {
    
    // 1. Adım: Eklentiden gelen lisans anahtarını al
    const licenseKey = req.query.license;

    // 2. Adım: Lisans Anahtarını Doğrula
    if (!licenseKey || !validKeys.includes(licenseKey)) {
        // Eğer lisans geçersizse, işlemi hemen durdur ve hata gönder.
        return res.status(403).send("Error: Geçersiz Lisans.");
    }

    // 3. Adım: Lisans geçerliyse, payload.js dosyasını oku
    fs.readFile(payloadPath, 'utf8', (err, data) => {
        // Dosya okunamadıysa (örn: silinmişse) sunucu hatası ver
        if (err) {
            console.error("Payload dosyası okunamadı:", err);
            return res.status(500).send("Server Error: Payload okunamadı.");
        }
        
        // 4. Adım: Her şey yolundaysa, dosyanın içeriğini (zırhlı kodu) gönder
        res.setHeader('Content-Type', 'application/javascript');
        res.send(data);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Kale Sunucusu ${PORT} portunda çalışıyor.`);
});