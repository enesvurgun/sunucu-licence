const express = require("express");
const { Pool } = require('pg'); 
const cors = require('cors');
const rateLimit = require('express-rate-limit'); 

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 10, // 
	message: { success: false, message: 'Çok fazla hatalı giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
    standardHeaders: true, 
	legacyHeaders: false, 
});


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.post("/login", loginLimiter, async (req, res) => {
    const ip = req.ip;

    const { username, password, hwid } = req.body;
    if (!username || !password || !hwid) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    let client;
    try {
        client = await pool.connect();
        const user = (await client.query('SELECT * FROM users WHERE username = $1', [username])).rows[0];

        if (!user) {
            console.log(`[IP: ${ip}] Giriş denemesi BAŞARISIZ: '${username}' adında bir kullanıcı bulunamadı.`);
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        if (password !== user.password) {
            console.log(`[IP: ${ip}] Giriş denemesi BAŞARISIZ: '${username}' için geçersiz şifre girildi.`);
            return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        }

        if (new Date() > new Date(user.expiry_date)) {
            console.log(`[IP: ${ip}] Giriş denemesi BAŞARISIZ: '${username}' kullanıcısının lisans süresi dolmuş.`);
            return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        }

        if (user.hwid && user.hwid !== hwid) {
            console.log(`[IP: ${ip}] Giriş denemesi BAŞARISIZ: '${username}' başka bir cihazdan giriş yapmaya çalıştı. Kayıtlı HWID: ${user.hwid}, Denenen HWID: ${hwid}`);
            return res.status(403).json({ success: false, message: "Bu lisans başka bir bilgisayara kayıtlı." });
        }

        if (!user.hwid) {
            await client.query('UPDATE users SET hwid = $1 WHERE id = $2', [hwid, user.id]);
            console.log(`[IP: ${ip}] Yeni cihaz KAYDEDİLDİ: '${username}' kullanıcısı için HWID: ${hwid}`);
        }

        console.log(`[IP: ${ip}] Giriş BAŞARILI: '${username}' kullanıcısı giriş yaptı.`);

        const expiry = new Date(user.expiry_date);
        const day = String(expiry.getDate()).padStart(2, '0');
        const month = String(expiry.getMonth() + 1).padStart(2, '0');
        const year = expiry.getFullYear();
        const formattedExpiryDate = `${day}-${month}-${year}`;

        res.status(200).json({ 
            success: true, 
            message: "Giriş başarılı.",
            expiryDate: formattedExpiryDate
        });

    } catch (error) {
        console.error(`[IP: ${ip}] Veritabanı veya sunucu hatası:`, error.message);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`Çok kullanıcılı lisans sunucusu (IP korumalı) çalışıyor.`));

