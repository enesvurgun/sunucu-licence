const express = require("express");
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// C# uygulamasından gelen giriş ve lisans kontrolü adresi
app.post("/login", (req, res) => {
    // C# uygulamasından sadece username ve password bekleniyor, hwid yok.
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    try {
        // 1. Kullanıcı adını Environment'dan gelenle karşılaştır
        if (username !== process.env.APP_USERNAME) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        // 2. Şifreyi DOĞRUDAN karşılaştır (GÜVENLİ DEĞİL!)
        if (password !== process.env.APP_PASSWORD) {
            return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        }

        // 3. Lisans süresini kontrol et
        const expiryDate = new Date(process.env.APP_EXPIRY_DATE);
        if (new Date() > expiryDate) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }

        // Tüm kontrollerden geçtiyse başarılı yanıtı gönder
        res.status(200).json({ success: true, message: "Giriş başarılı." });

    } catch (error) {
        console.error("Sunucu hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`Basit lisans sunucusu çalışıyor.`));