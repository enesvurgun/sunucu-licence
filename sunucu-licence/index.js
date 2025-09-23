// Gerekli kütüphaneleri ve temel ayarları yapıyoruz
const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json()); // Eklentiden gelebilecek JSON verileri için hazırlık

// Lisans anahtarlarını Render panelindeki "Environment Variables" bölümünden alıyoruz
const validKeys = (process.env.LICENSE_KEYS || "").split(",");

// =================================================================
// === FONKSİYON KÜTÜPHANESİ (SUNUCUDA GİZLİ KALACAK KODLAR) ===
// =================================================================
// Burası mimarimizin kalbidir.
// Eklentide gizli kalmasını istediğin tüm fetch fonksiyonlarını
// buraya, metin (string) olarak eklersin.
const functionLibrary = {

    // Ordu Taşıma Fonksiyonu
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
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Cookie": document.cookie },
                    body: params.toString()
                });
                if (!response.ok) throw new Error("Imperia sunucu hatası: " + response.status);
                console.log("✅ Ordu taşıma isteği başarıyla gönderildi.");
            } catch (error) {
                console.error("❌ İstek sırasında bir hata oluştu:", error);
            }
        }
    `,

    // Vali XP Ekleme Fonksiyonu
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
    `,

    // Araştırma Puanı Ekleme Fonksiyonu
    addResearchPoints: `
        async function(quantity) {
            const params = new URLSearchParams();
            params.append("xjxfun", "useItem");
            params.append("xjxr", Date.now().toString());
            const researchPayload = \`<xjxobj><e><k>type</k><v>S10</v></e><e><k>developmentType</k><v>Sresearch</v></e><e><k>purposeType</k><v>Seconomic</v></e><e><k>quantity</k><v>S\${quantity}</v></e><e><k>science</k><v>S0</v></e><e><k>containerId</k><v>SdevelopmentResearch</v></e></xjxobj>\`;
            params.append("xjxargs[]", researchPayload);
            params.append("xjxargs[]", \`<xjxobj><e><k>vexok</k><v>Btrue</v></e></xjxobj>\`);
            params.append("xjxargs[]", \`<xjxobj><e><k>isMobileView</k><v>Bfalse</v></e></xjxobj>\`);
            try {
                const response = await fetch("https://www.imperiaonline.org/imperia/game_v6/game/xajax_loader.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Cookie": document.cookie },
                    body: params.toString()
                });
                if (!response.ok) throw new Error("Imperia sunucu hatası: " + response.status);
                console.log("✅ Araştırma isteği başarıyla gönderildi.");
            } catch (error) {
                console.error("❌ İstek sırasında bir hata oluştu:", error);
            }
        }
    `
};

// =================================================================
// === API ENDPOINT (EKLENTİNİN İLETİŞİM KURACAĞI TEK KAPI) ===
// =================================================================
app.get("/get-function", (req, res) => {
    const { licenseKey, functionName } = req.query;

    // Adım 1: Lisans Anahtarını Doğrula
    if (!licenseKey || !validKeys.includes(licenseKey)) {
        return res.status(403).send("Error: Geçersiz Lisans.");
    }

    // Adım 2: İstenen Fonksiyonu Kütüphaneden Bul
    const functionCode = functionLibrary[functionName];

    // Adım 3: Fonksiyonu Gönder veya Hata Döndür
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