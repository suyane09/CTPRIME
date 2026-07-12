const jwt = require("jsonwebtoken");
const db = require("../db");

function autenticar(req, res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Token de autenticação ausente." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = db.prepare("SELECT id, nome, email, papel, ativo FROM usuarios WHERE id = ?").get(payload.id);

    if (!usuario) return res.status(401).json({ erro: "Usuário não encontrado." });
    if (!usuario.ativo) return res.status(403).json({ erro: "Este usuário está inativo no sistema." });

    req.usuario = usuario;
    next();
  } catch (erro) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

function permitirPapeis(...papeis) {
  return (req, res, next) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: "Você não tem permissão para executar esta ação." });
    }
    next();
  };
}

module.exports = { autenticar, permitirPapeis };
