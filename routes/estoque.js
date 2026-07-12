const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db");
const { autenticar, permitirPapeis } = require("../middleware/auth");

const router = express.Router();
router.use(autenticar, permitirPapeis("admin", "gerente"));

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM estoque ORDER BY criadoEm DESC").all());
});

router.post("/", (req, res) => {
  const { nome, quantidade, unidade, estoqueMinimo } = req.body || {};
  if (!nome || !unidade || quantidade === undefined || isNaN(Number(quantidade))) {
    return res.status(400).json({ erro: "Informe item, quantidade e unidade." });
  }
  const id = randomUUID();
  db.prepare(`
    INSERT INTO estoque (id, nome, quantidade, unidade, estoqueMinimo)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nome, Number(quantidade), unidade, Number(estoqueMinimo || 0));

  const item = db.prepare("SELECT * FROM estoque WHERE id = ?").get(id);
  req.app.get("io").emit("estoque:atualizado");
  res.status(201).json(item);
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM estoque WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: "Item não encontrado." });
  req.app.get("io").emit("estoque:atualizado");
  res.status(204).send();
});

module.exports = router;
