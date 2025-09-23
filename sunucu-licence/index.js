const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());


const validKeys = (process.env.LICENSE_KEYS || "").split(",");

app.get("/validate", (req, res) => {
  const providedKey = req.query.license;

  if (!providedKey) {
    return res.status(400).json({ status: "error", message: "No license key provided." });
  }

  if (validKeys.includes(providedKey)) {
    return res.status(200).json({ status: "success", message: "License is valid." });
  } else {
    return res.status(403).json({ status: "error", message: "Invalid license key." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});