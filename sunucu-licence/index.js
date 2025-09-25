const express = require("express");
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post("/login", (req, res) => {
    // C# uygulamasından sadece username ve password bekleniyor.
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    try {
        // 1. Kullanıcı adını Environment'dan gelenle karşılaştır
        if (username !== process.env.APP_USERNAME) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        // 2. Şifreyi doğrudan karşılaştır
        if (password !== process.env.APP_PASSWORD) {
            return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        }

        // 3. Lisans süresini GÜN-AY-YIL formatına göre kontrol et
        const dateParts = process.env.APP_EXPIRY_DATE.split('-'); // "31-12-2025" -> ["31", "12", "2025"]
        // Format: new Date(YIL, AY-1, GÜN)
        const expiryDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); 

        if (new Date() > expiryDate) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }
        
        // C# tarafına göndermek için tarihi direkt Environment'dan geldiği gibi yolluyoruz.
        const formattedExpiryDate = process.env.APP_EXPIRY_DATE;

        // Tüm kontrollerden geçtiyse başarılı yanıtı gönder
        res.status(200).json({ 
            success: true, 
            message: "Giriş başarılı.",
            expiryDate: formattedExpiryDate
        });

    } catch (error) {
        console.error("Sunucu hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`Basit lisans sunucusu çalışıyor.`));