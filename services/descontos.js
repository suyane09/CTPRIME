const { createHash, timingSafeEqual } = require("crypto");
const db = require("../db");

function normalizarCodigo(codigo) {
  return typeof codigo === "string" ? codigo.trim().toUpperCase().replace(/[\s-]/g, "") : "";
}

function buscarFuncionarioPorCodigo(codigo) {
  const codigoNormalizado = normalizarCodigo(codigo);
  // Codigo atual: 5 digitos numericos. Formato anterior aceito ate ser substituido.
  if (!/^(?:\d{5}|[A-F0-9]{16})$/.test(codigoNormalizado)) return null;
  const config = db.prepare("SELECT descontoCodigoGeralHash FROM configuracoes WHERE id = 1").get();
  if (!config?.descontoCodigoGeralHash || !/^[a-f0-9]{64}$/i.test(config.descontoCodigoGeralHash)) return null;
  const esperado = Buffer.from(config.descontoCodigoGeralHash, "hex");
  const recebido = createHash("sha256").update(codigoNormalizado).digest();
  if (!timingSafeEqual(esperado, recebido)) return null;
  return { id: "equipe", nome: "Equipe CT Prime" };
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
