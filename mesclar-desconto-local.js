// Mescla as mudancas de desconto da main preservando modificacoes locais.
// Nao escreve em C:\CTPRIME: gera apenas arquivos em uma pasta temporaria.
// Uso: node mesclar-desconto-local.js <base> <novo> <local> <stage>
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const [baseDir, novoDir, localDir, stageDir] = process.argv.slice(2);
if (![baseDir, novoDir, localDir, stageDir].every(Boolean)) {
  console.error("Informe base, novo, local e stage."); process.exit(2);
}
const antigos = [
  "db.js", "server.js", "routes/pedidos.js",
  "public/index.html", "public/cardapio.html", "public/sw.js"
];
const novos = ["routes/descontos.js", "services/descontos.js"];
const make = (dir, name) => path.join(dir, ...name.split("/"));
const lines = text => text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
const equals = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// LCS exato, com prefixo/sufixo comum removidos para acelerar arquivos HTML grandes.
function changes(base, target) {
  let prefix = 0;
  while (prefix < base.length && prefix < target.length && base[prefix] === target[prefix]) prefix++;
  let suffix = 0;
  while (suffix < base.length - prefix && suffix < target.length - prefix &&
         base[base.length - suffix - 1] === target[target.length - suffix - 1]) suffix++;
  const A = base.slice(prefix, base.length - suffix);
  const B = target.slice(prefix, target.length - suffix);
  const n = A.length, m = B.length;
  if (n === 0 && m === 0) return [];
  if (n === 0 || m === 0) return [{ start: prefix, end: prefix + n, lines: B }];
  const cells = (n + 1) * (m + 1);
  if (cells > 45_000_000) throw new Error("Arquivo alterado demais para mescla segura");
  const dp = Array.from({length: n + 1}, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i], below = dp[i + 1];
    for (let j = m - 1; j >= 0; j--) {
      row[j] = A[i] === B[j] ? below[j + 1] + 1
                           : Math.max(below[j], row[j + 1]);
    }
  }
  let i = 0, j = 0;
  const matches = [];
  while (i < n && j < m) {
    if (A[i] === B[j]) { matches.push([i, j]); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) i++;
    else j++;
  }
  matches.push([n, m]);
  const edits = [];
  let pa = 0, pb = 0;
  for (const [ai, bi] of matches) {
    if (pa !== ai || pb !== bi) {
      edits.push({ start: prefix + pa, end: prefix + ai, lines: B.slice(pb, bi) });
    }
    pa = ai + 1;
    pb = bi + 1;
  }
  return edits;
}

function conflicts(a, b) {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  if (a.start === a.end) return b.start < a.start && a.start < b.end;
  if (b.start === b.end) return a.start < b.start && b.start < a.end;
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

function merge(base, novo, local, fileName) {
  if (equals(local, base)) return novo;
  if (equals(novo, base)) return local;
  if (equals(local, novo)) return local;
  let fromNew = changes(base, novo).map(x=>({ ...x, src:"funcao" }));
  let fromLocal = changes(base, local).map(x=>({ ...x, src:"local" }));
  const kept = [...fromLocal];
  for (const f of fromNew) {
    const overlaps = kept.filter(l => conflicts(l, f));
    if (!overlaps.length) { kept.push(f); continue; }
    if (overlaps.length === 1) {
      const l = overlaps[0];
      if (l.start === f.start && l.end === f.end && equals(l.lines, f.lines)) continue;
    }
    throw new Error(fileName + ": modificacoes na mesma regiao da linha " + (f.start + 1)
      + "; mescla interrompida sem alterar arquivos.");
  }
  kept.sort((a,b)=>a.start-b.start || a.end-b.end);
  let output = [], pos=0;
  for (const e of kept) {
    if (e.start < pos) throw new Error(fileName + ": sobreposicao de alteracoes");
    output.push(...base.slice(pos, e.start), ...e.lines);
    pos = e.end;
  }
  output.push(...base.slice(pos));
  return output;
}

let changedFiles = 0;
for (const name of antigos) {
  const loc = make(localDir, name);
  const bef = make(baseDir, name);
  const aft = make(novoDir, name);
  if (![loc,bef,aft].every(x=>fs.existsSync(x))) throw new Error("Arquivo ausente: " + name);
  const raw = fs.readFileSync(loc, "utf8");
  const output = merge(lines(fs.readFileSync(bef, "utf8")),
                       lines(fs.readFileSync(aft, "utf8")), lines(raw), name);
  const linebreak = raw.includes("\r\n") ? "\r\n" : "\n";
  const bom = raw.charCodeAt(0) === 0xfeff ? "\uFEFF" : "";
  const dest = make(stageDir, name);
  fs.mkdirSync(path.dirname(dest), {recursive:true});
  fs.writeFileSync(dest, bom + output.join(linebreak), "utf8");
  if (!equals(lines(raw), output)) changedFiles++;
  console.log("MESCLADO: " + name);
}
for (const name of novos) {
  const dest = make(stageDir, name);
  if (fs.existsSync(make(localDir,name))) throw new Error("Arquivo ja existe no computador: " + name);
  fs.mkdirSync(path.dirname(dest), {recursive:true});
  fs.copyFileSync(make(novoDir,name), dest);
  console.log("NOVO: " + name);
}
for (const name of [...antigos, ...novos]) {
  const dest = make(stageDir,name);
  const source = fs.readFileSync(dest,"utf8");
  if (name.endsWith(".js")) {
    new vm.Script(source, { filename:name });
  } else if (name.endsWith(".html")) {
    const scripts = source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
    for (const script of scripts) {
      if (script[1].trim()) new vm.Script(script[1], {filename:name+" script"});
    }
  }
}
console.log("VALIDADO: arquivos mesclados e sintaxe JavaScript. Mudancas: " + changedFiles);
