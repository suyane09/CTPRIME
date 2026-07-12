const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    return res.status(400).json({ erro: "Informe e-mail e senha." });
  }

  const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email.trim().toLowerCase());
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: "E-mail ou senha incorretos." });
  }
  if (!usuario.ativo) {
    return res.status(403).json({ erro: "Este usuário está inativo no sistema." });
  }

  const token = jwt.sign(
    { id: usuario.id, papel: usuario.papel },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  const { senha_hash, ...usuarioSemSenha } = usuario;
  res.json({ token, usuario: usuarioSemSenha });
});

router.get("/me", autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;
