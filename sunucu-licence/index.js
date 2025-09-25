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

        const dateParts = process.env.APP_EXPIRY_DATE.split('-'); // "31-12-2025" -> ["31", "12", "2025"]
        const expiryDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); 

        if (new Date() > expiryDate) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }
        
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