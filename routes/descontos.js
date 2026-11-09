const express = require("express");
const rateLimit = require("express-rate-limit");
const { randomUUID, randomBytes, createHash } = require("crypto");
const db = require("../db");
const { autenticar, permitirPapeis } = require("../middleware/auth");
const { buscarFuncionarioPorCodigo, obterPercentualDesconto } = require("../services/descontos");

const router = express.Router();
const admin = [autenticar, permitirPapeis("admin")];
const limitarValidacao = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente mais tarde." },
});

// Cardápio: verifica o código sem confiar na porcentagem enviada pelo navegador.
router.post("/validar", limitarValidacao, (req, res) => {
  const percentual = obterPercentualDesconto();
  if (!percentual) return res.status(400).json({ erro: "Desconto para funcionários desativado." });
  const funcionario = buscarFuncionarioPorCodigo(req.body && req.body.codigo);
  if (!funcionario) return res.status(400).json({ erro: "Código de funcionário inválido ou desativado." });
  res.json({ nome: funcionario.nome, percentual });
});

// Administração: controle de percentual e dos códigos dos funcionários.
router.put("/percentual", ...admin, (req, res) => {
  const percentual = Number(req.body && req.body.percentual);
  if (!Number.isInteger(percentual) || percentual < 0 || percentual > 90) {
    return res.status(400).json({ erro: "Informe um percentual inteiro de 0 a 90. Zero desativa o benefício." });
  }
  db.prepare("UPDATE configuracoes SET descontoPercentual = ? WHERE id = 1").run(percentual);
  req.app.get("io").emit("configuracoes:atualizada");
  res.json({ percentual });
});

router.get("/funcionarios", ...admin, (req, res) => {
  const lista = db.prepare("SELECT id, nome, ativo, criadoEm FROM funcionarios_desconto ORDER BY nome").all();
  res.json(lista.map((f) => ({ ...f, ativo: !!f.ativo })));
});

router.post("/funcionarios", ...admin, (req, res) => {
  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  if (nome.length < 2 || nome.length > 80) return res.status(400).json({ erro: "Informe o nome do funcionário (2 a 80 caracteres)." });
  const codigo = randomBytes(8).toString("hex").toUpperCase();
  const hash = createHash("sha256").update(codigo).digest("hex");
  const id = randomUUID();
  db.prepare("INSERT INTO funcionarios_desconto (id, nome, codigo_hash) VALUES (?, ?, ?)").run(id, nome, hash);
  // Só a criação/renovação mostra o código. Banco armazena apenas o hash.
  res.status(201).json({ id, nome, ativo: true, codigo });
});

router.patch("/funcionarios/:id", ...admin, (req, res) => {
  const atual = db.prepare("SELECT id FROM funcionarios_desconto WHERE id = ?").get(req.params.id);
  if (!atual) return res.status(404).json({ erro: "Funcionário não encontrado." });
  if (typeof req.body?.ativo !== "boolean") return res.status(400).json({ erro: "Informe o estado ativo." });
  db.prepare("UPDATE funcionarios_desconto SET ativo = ? WHERE id = ?").run(req.body.ativo ? 1 : 0, req.params.id);
  res.json({ id: req.params.id, ativo: req.body.ativo });
});

router.post("/funcionarios/:id/renovar", ...admin, (req, res) => {
  const atual = db.prepare("SELECT id, nome FROM funcionarios_desconto WHERE id = ?").get(req.params.id);
  if (!atual) return res.status(404).json({ erro: "Funcionário não encontrado." });
  const codigo = randomBytes(8).toString("hex").toUpperCase();
  const hash = createHash("sha256").update(codigo).digest("hex");
  db.prepare("UPDATE funcionarios_desconto SET codigo_hash = ? WHERE id = ?").run(hash, req.params.id);
  res.json({ id: atual.id, nome: atual.nome, codigo });
});

module.exports = router;
