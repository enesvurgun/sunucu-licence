const express = require("express");
const app = express();
const cors = require("cors");
const crypto = require('crypto'); 

app.use(cors());
app.use(express.json());

const validKeys = (process.env.LICENSE_KEYS || "").split(",");
const sessionKeys = new Map(); 
const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16;

function encrypt(text, key) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

const functionLibrary = {
    sendArmyMoveRequest: `
        async function() {
            const params = new URLSearchParams();
            params.append("xjxfun", "doArmyMove");
            params.append("xjxr", Date.now().toString());
            params.append("xjxargs[]", "SArmyDeployment");
            const armyPayload = String.raw\`<xjxobj><e><k>formData</k><v><xjxobj><e><k>army</k><v><xjxobj><e><k>P1</k><v>S</v></e><e><k>S1</k><v>S1</v></e><e><k>M1</k><v>S</v></e><e><k>K1</k><v>S</v></e><e><k>KS</k><v>S</v></e></xjxobj></v></e><e><k>holding</k><v><xjxobj><e><k>2</k><v><xjxobj><e><k>0</k><v>S24595</v></e></xjxobj></v></e></xjxobj></v></e><e><k>button</k><v>S<![CDATA[Move to field]]></v></e></xjxobj></v></e><e><k>moveArmyToGarrison</k><v>Bfalse</v></e><e><k>vexok</k><v>Btrue</v></e></xjxobj>\`;
            const mobilePayload = String.raw\`<xjxobj><e><k>isMobileView</k><v>Bfalse</v></e></xjxobj>\`;
            params.append("xjxargs[]", armyPayload);
            params.append("xjxargs[]", mobilePayload);
            try {
                const response = await fetch("https://www.imperiaonline.org/imperia/game_v6/game/xajax_loader.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                    body: params.toString()
                });
                if (!response.ok) throw new Error("Imperia sunucu hatası: " + response.status);
                console.log("Ordu taşıma isteği başarıyla gönderildi.");
            } catch (error) {
                console.error("İstek sırasında bir hata oluştu:", error);
            }
        }
    `,
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
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                    body: params.toString()
                });
                if (!response.ok) throw new Error("Imperia sunucu hatası: " + response.status);
                console.log("Vali XP isteği başarıyla gönderildi.");
            } catch (error) {
                console.error("İstek sırasında bir hata oluştu:", error);
            }
        }
    `
};

app.get("/handshake", (req, res) => {
    const { licenseKey } = req.query;
    if (!licenseKey || !validKeys.includes(licenseKey)) {
        return res.status(403).send("Error: Geçersiz Lisans.");
    }
    const sessionKey = crypto.randomBytes(32).toString('hex');
    sessionKeys.set(licenseKey, sessionKey);
    console.log(`Geçici anahtar oluşturuldu: ${licenseKey}`);
    res.status(200).json({ sessionKey: sessionKey });
});

app.get("/get-function", (req, res) => {
    const { licenseKey, functionName } = req.query;
    const sessionKey = sessionKeys.get(licenseKey);
    if (!sessionKey) {
        return res.status(401).send("Error: Oturum anahtarı bulunamadı. Önce /handshake yapın.");
    }
    const functionCode = functionLibrary[functionName];
    if (functionCode) {
        const encryptedCode = encrypt(functionCode, sessionKey);
        res.setHeader('Content-Type', 'text/plain');
        res.send(encryptedCode);
    } else {
        res.status(404).send("Error: Fonksiyon bulunamadı.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Şifreli Fonksiyon Fabrikası sunucusu ${PORT} portunda çalışıyor.`);
});