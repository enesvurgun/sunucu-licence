const express = require("express");
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs').promises; // Dosya işlemleri için
const path = require('path');     // Dosya yolu işlemleri için

const app = express();
app.use(cors());
app.use(express.json());

// Render'ın kalıcı disk alanı olan /data klasöründe bir lisans dosyası yolu tanımlıyoruz.
const licenseFilePath = path.join('/data', 'license.json');

// C# uygulamasından gelen giriş ve lisans kontrolü adresi
app.post("/login", async (req, res) => {
    const { username, password, hwid } = req.body;
    if (!username || !password || !hwid) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    try {
        // 1. Kullanıcı adını Environment'dan gelenle karşılaştır
        if (username !== process.env.APP_USERNAME) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        // 2. Şifreyi Environment'dan gelen hash ile karşılaştır
        const isPasswordValid = await bcrypt.compare(password, process.env.APP_PASSWORD_HASH);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        }

        // 3. Lisans süresini kontrol et
        const expiryDate = new Date(process.env.APP_EXPIRY_DATE);
        if (new Date() > expiryDate) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }

        // 4. Donanım ID (HWID) kontrolü
        let savedHwid = null;
        try {
            // Lisans dosyasını okumayı dene
            const licenseData = await fs.readFile(licenseFilePath, 'utf8');
            savedHwid = JSON.parse(licenseData).hwid;
        } catch (error) {
            // Eğer dosya yoksa (ilk giriş), hata vermeden devam et.
            if (error.code !== 'ENOENT') throw error; 
        }

        if (savedHwid && savedHwid !== hwid) {
            return res.status(403).json({ success: false, message: "Bu lisans başka bir bilgisayara kayıtlı." });
        }

        // 5. Eğer ilk giriş ise (dosyada HWID yoksa), HWID'yi dosyaya kaydet
        if (!savedHwid) {
            const licenseInfo = { hwid: hwid, registrationDate: new Date().toISOString() };
            await fs.writeFile(licenseFilePath, JSON.stringify(licenseInfo, null, 2));
            console.log(`İlk giriş için HWID kaydedildi: ${username} - ${hwid}`);
        }

        res.status(200).json({ success: true, message: "Giriş başarılı." });

    } catch (error) {
        console.error("Sunucu hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`Dosya tabanlı lisans sunucusu çalışıyor.`));