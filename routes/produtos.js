const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db");
const { autenticar, permitirPapeis } = require("../middleware/auth");

const router = express.Router();

function paraSaida(p) {
  return { ...p, ativo: !!p.ativo };
}

// Pública — o cardápio do cliente também consome esta rota
router.get("/", (req, res) => {
  const lista = db.prepare("SELECT * FROM produtos ORDER BY criadoEm DESC").all();
  res.json(lista.map(paraSaida));
});

router.post("/", autenticar, permitirPapeis("admin", "gerente"), (req, res) => {
  const { nome, categoria, preco, imagemUrl, ativo, calorias, porcaoGramas, proteinas, carboidratos, gorduras } = req.body || {};
  if (!nome || !preco) {
    return res.status(400).json({ erro: "Informe nome e preço do produto." });
  }
  const id = randomUUID();
  db.prepare(`
    INSERT INTO produtos (id, nome, categoria, preco, imagemUrl, ativo, calorias, porcaoGramas, proteinas, carboidratos, gorduras)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, nome, categoria || null, Number(preco), imagemUrl || null, ativo === false ? 0 : 1,
    calorias ?? null, porcaoGramas ?? null, proteinas ?? null, carboidratos ?? null, gorduras ?? null
  );

  const produto = paraSaida(db.prepare("SELECT * FROM produtos WHERE id = ?").get(id));
  req.app.get("io").emit("produtos:atualizado");
  res.status(201).json(produto);
});

router.patch("/:id", autenticar, permitirPapeis("admin", "gerente"), (req, res) => {
  const existente = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ erro: "Produto não encontrado." });

  const dados = {
    nome: req.body.nome ?? existente.nome,
    categoria: req.body.categoria ?? existente.categoria,
    preco: req.body.preco !== undefined ? Number(req.body.preco) : existente.preco,
    imagemUrl: req.body.imagemUrl ?? existente.imagemUrl,
    ativo: req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : existente.ativo,
    calorias: req.body.calorias !== undefined ? req.body.calorias : existente.calorias,
    porcaoGramas: req.body.porcaoGramas !== undefined ? req.body.porcaoGramas : existente.porcaoGramas,
    proteinas: req.body.proteinas !== undefined ? req.body.proteinas : existente.proteinas,
    carboidratos: req.body.carboidratos !== undefined ? req.body.carboidratos : existente.carboidratos,
    gorduras: req.body.gorduras !== undefined ? req.body.gorduras : existente.gorduras,
  };

  db.prepare(`
    UPDATE produtos SET nome=?, categoria=?, preco=?, imagemUrl=?, ativo=?,
      calorias=?, porcaoGramas=?, proteinas=?, carboidratos=?, gorduras=?
    WHERE id=?
  `).run(
    dados.nome, dados.categoria, dados.preco, dados.imagemUrl, dados.ativo,
    dados.calorias, dados.porcaoGramas, dados.proteinas, dados.carboidratos, dados.gorduras,
    req.params.id
  );

  const produto = paraSaida(db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id));
  req.app.get("io").emit("produtos:atualizado");
  res.json(produto);
});

router.delete("/:id", autenticar, permitirPapeis("admin", "gerente"), (req, res) => {
  const info = db.prepare("DELETE FROM produtos WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: "Produto não encontrado." });
  req.app.get("io").emit("produtos:atualizado");
  res.status(204).send();
});

module.exports = router;