const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "ctprime.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('admin','gerente','cozinha')),
    ativo INTEGER NOT NULL DEFAULT 1,
    criadoEm TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT,
    preco REAL NOT NULL,
    imagemUrl TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    criadoEm TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS estoque (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    quantidade REAL NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL,
    estoqueMinimo REAL NOT NULL DEFAULT 0,
    criadoEm TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    cliente TEXT NOT NULL,
    itens TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    formaPagamento TEXT,
    trocoPara REAL,
    criadoEm TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS relatorios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    vendasTotais REAL NOT NULL,
    totalPedidos INTEGER NOT NULL,
    ticketMedio REAL NOT NULL,
    maisVendido TEXT,
    geradoEm TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS configuracoes (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nomeLoja TEXT DEFAULT '',
    cnpj TEXT DEFAULT '',
    telefone TEXT DEFAULT '',
    email TEXT DEFAULT ''
  );
`);

// Seed inicial — só roda se as tabelas estiverem vazias
const totalUsuarios = db.prepare("SELECT COUNT(*) AS n FROM usuarios").get().n;
if (totalUsuarios === 0) {
  const inserir = db.prepare(`
    INSERT INTO usuarios (id, nome, email, senha_hash, papel, ativo)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  const senhaPadraoHash = bcrypt.hashSync("123456", 10);
  const seed = db.transaction(() => {
    inserir.run(randomUUID(), "Admin Master", "admin@ctprime.com", senhaPadraoHash, "admin");
    inserir.run(randomUUID(), "Carlos Atendente", "func@ctprime.com", senhaPadraoHash, "gerente");
    inserir.run(randomUUID(), "Equipe Cozinha", "cozinha@ctprime.com", senhaPadraoHash, "cozinha");
  });
  seed();
  console.log("✔ Usuários padrão criados (senha: 123456)");
}

const totalConfig = db.prepare("SELECT COUNT(*) AS n FROM configuracoes").get().n;
if (totalConfig === 0) {
  db.prepare(`INSERT INTO configuracoes (id, nomeLoja, cnpj, telefone, email) VALUES (1, 'CT Prime', '', '', '')`).run();
}

module.exports = db;

