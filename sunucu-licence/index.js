const express = require("express");
const { Pool } = require('pg'); 
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.post("/login", async (req, res) => {
    const { username, password, hwid } = req.body;
    if (!username || !password || !hwid) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    let client;
    try {
        // Veritabanı havuzundan bir bağlantı alıyoruz
        client = await pool.connect();
        
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await client.query(query, [username]);
        const user = result.rows[0]; 

        if (!user) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        if (password !== user.password) {
            return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        }

        if (new Date() > new Date(user.expiry_date)) {
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }

        if (user.hwid && user.hwid !== hwid) {
            return res.status(403).json({ success: false, message: "Bu lisans başka bir bilgisayara kayıtlı." });
        }

       
        if (!user.hwid) {
            await client.query('UPDATE users SET hwid = $1 WHERE id = $2', [hwid, user.id]);
            console.log(`İlk giriş için HWID kaydedildi: Kullanıcı = ${username}, HWID = ${hwid}`);
        }

        const expiry = new Date(user.expiry_date);
        const day = String(expiry.getDate()).padStart(2, '0');
        const month = String(expiry.getMonth() + 1).padStart(2, '0'); // Aylar 0'dan başlar
        const year = expiry.getFullYear();
        const formattedExpiryDate = `${day}-${month}-${year}`;

        res.status(200).json({ 
            success: true, 
            message: "Giriş başarılı.",
            expiryDate: formattedExpiryDate
        });

    } catch (error) {
        console.error("Veritabanı veya sunucu hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`Çok kullanıcılı lisans sunucusu çalışıyor.`));

