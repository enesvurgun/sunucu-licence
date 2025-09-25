const express = require("express");
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    try {
        if (username !== process.env.APP_USERNAME) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        if (password !== process.env.APP_PASSWORD) {
            return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        }

        const expiryDate = new Date(process.env.APP_EXPIRY_DATE);
        if (new Date() > expiryDate) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }

        // --- YENİ EKLENEN BÖLÜM ---

        // Kalan gün sayısını hesapla
        const currentDate = new Date();
        const timeDiff = expiryDate.getTime() - currentDate.getTime();
        // Math.ceil kullanarak günü yukarı yuvarla (örn: 2.1 gün kaldıysa 3 gün göstersin)
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Tarihi GG-AA-YYYY formatına çevir
        const day = String(expiryDate.getDate()).padStart(2, '0');
        const month = String(expiryDate.getMonth() + 1).padStart(2, '0'); // getMonth() 0-11 arası değer verir, o yüzden +1 ekliyoruz.
        const year = expiryDate.getFullYear();
        const formattedExpiryDate = `${day}-${month}-${year}`;

        // --- YENİ BÖLÜM SONU ---

        // Başarılı yanıtı yeni bilgilerle birlikte gönder
        res.status(200).json({ 
            success: true, 
            message: "Giriş başarılı.",
            expiryDate: formattedExpiryDate, // Son kullanma tarihi (GG-AA-YYYY)
            daysRemaining: daysRemaining     // Kalan gün sayısı
        });

    } catch (error) {
        console.error("Sunucu hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`Basit lisans sunucusu çalışıyor.`));