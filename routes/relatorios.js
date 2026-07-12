const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db");
const { autenticar, permitirPapeis } = require("../middleware/auth");

const router = express.Router();
router.use(autenticar, permitirPapeis("admin"));

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM relatorios ORDER BY geradoEm DESC").all());
});

router.post("/", (req, res) => {
  const { nome, vendasTotais, totalPedidos, ticketMedio, maisVendido } = req.body || {};
  if (!nome) return res.status(400).json({ erro: "Informe o nome do resumo." });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO relatorios (id, nome, vendasTotais, totalPedidos, ticketMedio, maisVendido)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, nome, Number(vendasTotais || 0), Number(totalPedidos || 0), Number(ticketMedio || 0), maisVendido || null);

  res.status(201).json(db.prepare("SELECT * FROM relatorios WHERE id = ?").get(id));
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM relatorios WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: "Relatório não encontrado." });
  res.status(204).send();
});

module.exports = router;
