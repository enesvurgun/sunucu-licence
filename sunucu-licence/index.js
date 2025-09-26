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
    max: 10,
    message: { success: false, message: 'Çok fazla hatalı giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
    standardHeaders: true, 
    legacyHeaders: false, 
});

const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Çok fazla şifre değiştirme denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
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

        if (user.expiry_date && new Date() > new Date(user.expiry_date)) {
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

        let formattedExpiryDate = null;
        if (user.expiry_date) {
            const expiry = new Date(user.expiry_date);
            const day = String(expiry.getDate()).padStart(2, '0');
            const month = String(expiry.getMonth() + 1).padStart(2, '0');
            const year = expiry.getFullYear();
            formattedExpiryDate = `${day}-${month}-${year}`;
        }

        res.status(200).json({ 
            success: true, 
            message: "Giriş başarılı.",
            expiryDate: formattedExpiryDate
        });

    } catch (error) {
        console.error(`[IP: ${ip}] Veritabanı veya sunucu hatası:`, error.message || error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.post("/change-password", changePasswordLimiter, async (req, res) => {
    const ip = req.ip;
    const { username, currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Yeni şifre en az 6 karakter olmalıdır." });
    }

    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT id, password FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            console.log(`[IP: ${ip}] Şifre değiştirme BAŞARISIZ: kullanıcı bulunamadı (${username}).`);
            return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        const stored = user.password; 

        if (stored !== currentPassword) {
            console.log(`[IP: ${ip}] Şifre değiştirme BAŞARISIZ: yanlış mevcut şifre (${username}).`);
            return res.status(401).json({ success: false, message: "Mevcut şifre yanlış." });
        }

        await client.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, user.id]);

        console.log(`[IP: ${ip}] Şifre başarıyla değiştirildi (plaintext): ${username}`);
        return res.status(200).json({ success: true, message: "Şifre başarıyla değiştirildi." });

    } catch (error) {
        console.error(`[IP: ${ip}] change-password hata:`, error.message || error);
        return res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`Çok kullanıcılı lisans sunucusu (IP korumalı) çalışıyor.`));
