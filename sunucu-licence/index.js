// index.js (Fonksiyon Fabrikası için Doğru Sunucu Kodu)
const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const path = require("path");

app.use(cors());
app.use(express.json());

const validKeys = (process.env.LICENSE_KEYS || "").split(",");

const functionLibrary = {
    addGovernorXp: `
        async function(personId, xpAmount) {
            const params = new URLSearchParams();
            params.append("xjxfun", "useItem");
            params.append("xjxr", Date.now().toString());
            const governorPayload = \`<xjxobj><e><k>governorXp</k><v>S\${xpAmount}</v></e><e><k>personId</k><v>S\${personId}</v></e><e><k>type</k><v>S4</v></e><e><k>tab</k><v>S1</v></e><e><k>realContainerId</k><v>SPalacePersonProfile\${personId}</v></e></xjxobj>\`;
            params.append("xjxargs[]", governorPayload);
            params.append("xjxargs[]", \`<xjxobj><e><k>vexok</k><v>Btrue</v></e></xjxobj>\`);
            params.append("xjxargs[]", \`<xjxobj><e><k>isMobileView</k><v>Bfalse</v></e></xjxobj>\`);

            try {
                const response = await fetch("https://www.imperiaonline.org/imperia/game_v6/game/xajax_loader.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Cookie": document.cookie },
                    body: params.toString()
                });
                if (!response.ok) throw new Error("Imperia sunucu hatası: " + response.status);
                console.log("✅ Vali XP isteği başarıyla gönderildi.");
            } catch (error) {
                console.error("❌ İstek sırasında bir hata oluştu:", error);
            }
        }
    `
};


app.get("/get-function", (req, res) => {
    const { licenseKey, functionName } = req.query;

    if (!licenseKey || !validKeys.includes(licenseKey)) {
        return res.status(403).send("Error: Geçersiz Lisans.");
    }

    // 2. İstenen Fonksiyonu Kütüphaneden Bulma
    const functionCode = functionLibrary[functionName];
    if (functionCode) {
        res.setHeader('Content-Type', 'application/javascript');
        res.send(functionCode);
    } else {
        res.status(404).send("Error: Fonksiyon bulunamadı.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Fonksiyon Fabrikası sunucusu ${PORT} portunda çalışıyor.`);
});