const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const path = require("path");

app.use(cors());

// ÖNEMLİ: Lisans anahtarlarını Render panelindeki "Environment Variables" kısmına eklemeyi unutma!
// Key: LICENSE_KEYS, Value: ANAHTAR1,ANAHTAR2,ANAHTAR3
const validKeys = (process.env.LICENSE_KEYS || "").split(",");
const payloadPath = path.join(__dirname, 'payload.js'); // Gönderilecek olan ana, zırhlı kod

app.get("/validate", (req, res) => {
  const providedKey = req.query.license;

  if (providedKey && validKeys.includes(providedKey)) {
    fs.readFile(payloadPath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send("Server Error: Payload okunamadı.");
      }
      res.setHeader('Content-Type', 'application/javascript');
      res.send(data);
    });
  } else {
    res.status(403).send("Error: Geçersiz Lisans.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});