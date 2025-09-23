const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const path = require("path");

app.use(cors());

const validKeys = (process.env.LICENSE_KEYS || "").split(",");
const payloadPath = path.join(__dirname, 'payload.js');

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