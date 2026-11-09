const express = require("express");
const rateLimit = require("express-rate-limit");
const { randomBytes, createHash } = require("crypto");
const db = require("../db");
const { autenticar, permitirPapeis } = require("../middleware/auth");
const { buscarFuncionarioPorCodigo, obterPercentualDesconto } = require("../services/descontos");

const router = express.Router();
const admin = [autenticar, permitirPapeis("admin")];
const limitarValidacao = rateLimit({
  windowMs: 15 * 60 * 1000, max: 80, standardHeaders: true, legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente mais tarde." },
});

// Codigo unico para toda a equipe, verificado no servidor.
router.post("/validar", limitarValidacao, (req, res) => {
  const percentual = obterPercentualDesconto();
  if (!percentual) return res.status(400).json({ erro: "Desconto para funcionários desativado." });
  const funcionario = buscarFuncionarioPorCodigo(req.body && req.body.codigo);
  if (!funcionario) return res.status(400).json({ erro: "Código da equipe inválido. Verifique com a administração." });
  res.json({ nome: funcionario.nome, percentual });
});

router.put("/percentual", ...admin, (req, res) => {
  const percentual = Number(req.body && req.body.percentual);
  if (!Number.isInteger(percentual) || percentual < 0 || percentual > 90) {
    return res.status(400).json({ erro: "Informe um percentual inteiro de 0 a 90. Zero desativa o benefício." });
  }
  db.prepare("UPDATE configuracoes SET descontoPercentual = ? WHERE id = 1").run(percentual);
  req.app.get("io").emit("configuracoes:atualizada");
  res.json({ percentual });
});

// Administrador pode ver somente se ha um codigo ativo, nunca o hash nem o codigo em claro.
router.get("/codigo-geral", ...admin, (req, res) => {
  const atual = db.prepare("SELECT descontoCodigoGeralHash FROM configuracoes WHERE id = 1").get();
  res.json({ configurado: !!atual?.descontoCodigoGeralHash });
});

// Emite um unico codigo aleatorio de 16 caracteres hexadecimais (64 bits).
// Novo codigo invalida imediatamente o anterior. O codigo so aparece nesta resposta.
router.post("/codigo-geral/gerar", ...admin, (req, res) => {
  const codigo = randomBytes(8).toString("hex").toUpperCase();
  const hash = createHash("sha256").update(codigo).digest("hex");
  db.prepare("UPDATE configuracoes SET descontoCodigoGeralHash = ? WHERE id = 1").run(hash);
  res.json({ codigo, configurado: true });
});

router.delete("/codigo-geral", ...admin, (req, res) => {
  db.prepare("UPDATE configuracoes SET descontoCodigoGeralHash = NULL WHERE id = 1").run();
  res.json({ configurado: false });
});

module.exports = router;
