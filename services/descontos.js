const { createHash } = require("crypto");
const db = require("../db");

function normalizarCodigo(codigo) {
  return typeof codigo === "string" ? codigo.trim().toUpperCase().replace(/[\s-]/g, "") : "";
}

function buscarFuncionarioPorCodigo(codigo) {
  const codigoNormalizado = normalizarCodigo(codigo);
  if (!/^[A-F0-9]{16}$/.test(codigoNormalizado)) return null;
  const hash = createHash("sha256").update(codigoNormalizado).digest("hex");
  return db.prepare("SELECT id, nome FROM funcionarios_desconto WHERE codigo_hash = ? AND ativo = 1").get(hash) || null;
}

function obterPercentualDesconto() {
  const config = db.prepare("SELECT descontoPercentual FROM configuracoes WHERE id = 1").get();
  const percentual = Number(config && config.descontoPercentual);
  return Number.isFinite(percentual) && percentual >= 0 && percentual <= 90 ? percentual : 0;
}

// Calcula inteiramente em centavos para o total cobrado coincidir com o caixa.
function calcularValores(subtotal, percentual) {
  const centavos = Math.round(Number(subtotal) * 100);
  const descontoCentavos = Math.round(centavos * percentual / 100);
  return {
    subtotal: centavos / 100,
    desconto: descontoCentavos / 100,
    total: (centavos - descontoCentavos) / 100,
  };
}

module.exports = { normalizarCodigo, buscarFuncionarioPorCodigo, obterPercentualDesconto, calcularValores };
