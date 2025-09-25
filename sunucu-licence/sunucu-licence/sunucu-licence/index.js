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

        // --- BURASI İSTEDİĞİN FORMATA GÖRE DÜZENLENDİ ---
        // GÜN-AY-YIL formatını okumak için tarihi manuel olarak parçalıyoruz.
        const dateParts = process.env.APP_EXPIRY_DATE.split('-'); // "31-12-2025" -> ["31", "12", "2025"]
        // new Date() ay parametresini 0'dan başlattığı için (Ocak=0), aydan 1 çıkarıyoruz.
        // Format: new Date(YIL, AY-1, GÜN)
        const expiryDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); 
        // --- DEĞİŞİKLİK SONU ---

        if (new Date() > expiryDate) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }
        
        // C# tarafına göndermek için tarihi direkt Environment'dan geldiği gibi yolluyoruz.
        const formattedExpiryDate = process.env.APP_EXPIRY_DATE;

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