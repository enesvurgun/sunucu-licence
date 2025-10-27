const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Çok fazla hatalı giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin." },
    standardHeaders: true,
    legacyHeaders: false,
});
const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Çok fazla şifre değiştirme denemesi. Lütfen 15 dakika sonra tekrar deneyin." },
    standardHeaders: true,
    legacyHeaders: false,
});

const JWT_SECRET = process.env.JWT_SECRET || "REPLACE_ME_JWT_SECRET";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || "30", 10);
const SHARED_KEY = process.env.SERVER_SHARED_KEY || "dev-shared-key-change-me";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function genRandomToken(len = 48) {
    return crypto.randomBytes(len).toString("hex");
}
function sha256hex(input) {
    return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
function createAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}
function formatExpiryForClient(expiryDateFromDb) {
    if (!expiryDateFromDb) return null;
    try {
        const expiry = new Date(expiryDateFromDb);
        const day = String(expiry.getUTCDate()).padStart(2, '0');
        const month = String(expiry.getUTCMonth() + 1).padStart(2, '0');
        const year = expiry.getUTCFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return null;
    }
}
function verifySharedKey(req, res, next) {
    const incoming = req.header("X-Server-Key");
    if (!incoming || incoming !== SHARED_KEY) {
        return res.status(403).json({ success: false, message: "Yetkisiz kaynak." });
    }
    next();
}
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Token gerekli." });
    }
    const token = auth.slice(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ success: false, message: "Geçersiz veya süresi dolmuş token." });
    }
}
async function ensureRefreshTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash VARCHAR(128) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        `);
    } finally {
        client.release();
    }
}
ensureRefreshTable().catch(err => console.error("refresh_tokens tablosu oluşturulamadı:", err));

app.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "license-server" }));

app.post("/login", verifySharedKey, loginLimiter, async (req, res) => {
    const ip = req.ip;
    const { username, password, hwid } = req.body;
    if (!username || !password || !hwid) return res.status(400).json({ success: false, message: "Eksik bilgi." });
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        if (password !== user.password) return res.status(401).json({ success: false, message: "Geçersiz şifre." });
        if (user.expiry_date && new Date() > new Date(user.expiry_date)) return res.status(403).json({ success: false, message: "Lisans süresi dolmuş." });
        if (user.hwid && user.hwid !== hwid) return res.status(403).json({ success: false, message: "Bu lisans başka bir bilgisayara kayıtlı." });
        if (!user.hwid) await client.query('UPDATE users SET hwid = $1 WHERE id = $2', [hwid, user.id]);
        const accessPayload = { userId: user.id, username: user.username, hwid };
        const accessToken = createAccessToken(accessPayload);
        const refreshTokenPlain = genRandomToken(48);
        const refreshTokenHash = sha256hex(refreshTokenPlain);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        await client.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`, [user.id, refreshTokenHash, expiresAt]);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        const decryptionKey = process.env.DECRYPTION_KEY || null;
        const formattedExpiryDate = formatExpiryForClient(user.expiry_date);
        return res.status(200).json({
            success: true,
            message: "Giriş başarılı.",
            expiryDate: formattedExpiryDate,
            decryptionKey,
            accessToken,
            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
            refreshToken: refreshTokenPlain,
            refreshTokenExpiresAt: expiresAt.toISOString()
        });
    } catch (error) {
        console.error(`[IP: ${ip}] /login hata:`, error.message || error);
        return res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) client.release();
    }
});

app.post("/token", verifySharedKey, async (req, res) => {
    const { refreshToken, hwid } = req.body;
    if (!refreshToken || !hwid) return res.status(400).json({ success: false, message: "Eksik bilgi." });
    const tokenHash = sha256hex(refreshToken);
    let client;
    try {
        client = await pool.connect();
        const q = await client.query(
            `SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at, u.username, u.hwid AS db_hwid
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1`, [tokenHash]);
        const row = q.rows[0];
        if (!row) return res.status(401).json({ success: false, message: "Geçersiz refresh token." });
        if (new Date() > new Date(row.expires_at)) {
            await client.query(`DELETE FROM refresh_tokens WHERE id = $1`, [row.id]);
            return res.status(401).json({ success: false, message: "Refresh token süresi dolmuş." });
        }
        if (row.db_hwid && row.db_hwid !== hwid) return res.status(403).json({ success: false, message: "Refresh token cihazla eşleşmiyor." });
        const newAccessPayload = { userId: row.user_id, username: row.username, hwid };
        const newAccessToken = createAccessToken(newAccessPayload);
        const newRefreshPlain = genRandomToken(48);
        const newRefreshHash = sha256hex(newRefreshPlain);
        const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        await client.query(
            `UPDATE refresh_tokens SET token_hash = $1, expires_at = $2, created_at = now() WHERE id = $3`,
            [newRefreshHash, newExpiresAt, row.id]
        );
        return res.status(200).json({
            success: true,
            accessToken: newAccessToken,
            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
            refreshToken: newRefreshPlain,
            refreshTokenExpiresAt: newExpiresAt.toISOString()
        });
    } catch (err) {
        console.error("/token hata:", err.message || err);
        return res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) client.release();
    }
});

app.post("/logout", verifySharedKey, async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: "Eksik bilgi." });
    const tokenHash = sha256hex(refreshToken);
    let client;
    try {
        client = await pool.connect();
        await client.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
        return res.status(200).json({ success: true, message: "Çıkış yapıldı." });
    } catch (err) {
        console.error("/logout hata:", err.message || err);
        return res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) client.release();
    }
});

app.post("/change-password", verifySharedKey, changePasswordLimiter, async (req, res) => {
    const ip = req.ip;
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) return res.status(400).json({ success: false, message: "Eksik bilgi." });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: "Yeni şifre en az 6 karakter olmalıdır." });
    let client;
    try {
        client = await pool.connect();
        const q = await client.query('SELECT id, password FROM users WHERE username = $1', [username]);
        const user = q.rows[0];
        if (!user) return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
        if (user.password !== currentPassword) return res.status(401).json({ success: false, message: "Mevcut şifre yanlış." });
        await client.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, user.id]);
        return res.status(200).json({ success: true, message: "Şifre başarıyla değiştirildi." });
    } catch (error) {
        console.error(`/change-password hata:`, error.message || error);
        return res.status(500).json({ success: false, message: "Sunucu hatası." });
    } finally {
        if (client) client.release();
    }
});

app.get("/me", authMiddleware, async (req, res) => res.status(200).json({ success: true, user: req.user }));

app.listen(process.env.PORT || 3001, () => console.log("Lisans sunucusu çalışıyor."));
