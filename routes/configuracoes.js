const express = require("express");
const db = require("../db");
const { autenticar, permitirPapeis } = require("../middleware/auth");

const router = express.Router();

// Pública — o cardápio do cliente precisa do nome da loja
router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM configuracoes WHERE id = 1").get());
});

router.put("/", autenticar, permitirPapeis("admin"), (req, res) => {
  const { nomeLoja, cnpj, telefone, email } = req.body || {};
  db.prepare(`
    UPDATE configuracoes SET nomeLoja=?, cnpj=?, telefone=?, email=? WHERE id = 1
  `).run(nomeLoja || "", cnpj || "", telefone || "", email || "");

  const config = db.prepare("SELECT * FROM configuracoes WHERE id = 1").get();
  req.app.get("io").emit("configuracoes:atualizada", config);
  res.json(config);
});

module.exports = router;
