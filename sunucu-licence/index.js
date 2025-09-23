const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json()); // Gelen JSON verilerini okumak için bu gerekli!

const IMPERIA_ENDPOINT = "https://www.imperiaonline.org/imperia/game_v6/game/xajax_loader.php";
const validKeys = (process.env.LICENSE_KEYS || "").split(",");

// Bu fonksiyon, Imperia sunucusuna asıl isteği gönderir
async function sendImperiaRequest(cookie, body) {
    try {
        const response = await fetch(IMPERIA_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Cookie": cookie // Eklentiden gelen cookie'yi kullanıyoruz
            },
            body: body.toString()
        });
        if (!response.ok) {
            throw new Error(`Imperia sunucusu hatası: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        throw error;
    }
}

// Eklentinin iletişim kuracağı tek adres
app.post("/api", async (req, res) => {
    const { licenseKey, functionName, args, cookie } = req.body;

    // 1. Lisans Kontrolü
    if (!licenseKey || !validKeys.includes(licenseKey)) {
        return res.status(403).json({ success: false, message: "Geçersiz Lisans." });
    }

    const params = new URLSearchParams();
    params.append("xjxr", Date.now().toString());
    params.append("xjxargs[]", `<xjxobj><e><k>vexok</k><v>Btrue</v></e></xjxobj>`);
    params.append("xjxargs[]", `<xjxobj><e><k>isMobileView</k><v>Bfalse</v></e></xjxobj>`);

    try {
        let responseText = "";
        // 2. Gelen komuta göre doğru payload'ı oluştur
        switch (functionName) {
            case 'addGovernorXp':
                const [personId, xpAmount] = args;
                params.append("xjxfun", "useItem");
                const governorPayload = `<xjxobj><e><k>governorXp</k><v>S${xpAmount}</v></e><e><k>personId</k><v>S${personId}</v></e><e><k>type</k><v>S4</v></e><e><k>tab</k><v>S1</v></e><e><k>realContainerId</k><v>SPalacePersonProfile${personId}</v></e></xjxobj>`;
                params.append("xjxargs[]", governorPayload);
                responseText = await sendImperiaRequest(cookie, params);
                break;

            // ... Gelecekte buraya yeni fonksiyonlar ekleyebilirsin ...

            default:
                return res.status(400).json({ success: false, message: "Bilinmeyen fonksiyon adı." });
        }
        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Vekil sunucusu ${PORT} portunda çalışıyor.`);
});