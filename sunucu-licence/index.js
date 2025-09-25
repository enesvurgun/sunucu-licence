const express = require("express");
const { Pool } = require('pg'); 
const bcrypt = require('bcryptjs');
const cors = require('cors'); // <-- HATA BURADAYDI, BU SATIR EKSİKTİ
const app = express();

app.use(cors()); // <-- ARTIK BU SATIR DOĞRU ÇALIŞACAK
app.use(express.json());

// Render'ın bize verdiği PostgreSQL bağlantı URL'sini Environment Variables'dan alıyoruz
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// C# uygulamasından gelen giriş ve lisans kontrolü adresi
app.post("/login", async (req, res) => {
    const { username, password, hwid } = req.body;
    if (!username || !password || !hwid) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    let client;
    try {
        client = await pool.connect();
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await client.query(query, [username]);
        const user = result.rows[0];

        // 1. Kullanıcıyı bul
        if (!user) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        // 2. Şifreyi kontrol et
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        }

        // 3. Lisans süresini kontrol et
        if (new Date() > new Date(user.expiry_date)) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }

        // 4. Donanım ID (HWID) kontrolü
        if (user.hwid && user.hwid !== hwid) {
            return res.status(403).json({ success: false, message: "Bu lisans başka bir bilgisayara kayıtlı." });
        }

        // 5. Eğer ilk girişi ise, HWID'yi kaydet
        if (!user.hwid) {
            await client.query('UPDATE users SET hwid = $1 WHERE id = $2', [hwid, user.id]);
            console.log(`İlk giriş için HWID kaydedildi: ${username}`);
        }

        res.status(200).json({ success: true, message: "Giriş başarılı." });

    } catch (error) {
        console.error("Veritabanı hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) {
            client.release(); // Bağlantıyı havuza geri bırak
        }
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`PostgreSQL lisans sunucusu çalışıyor.`));