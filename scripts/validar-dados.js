// Valida a integridade dos dados antes de publicar o site.
// Uso: node scripts/validar-dados.js
const fs = require('node:fs');
const path = require('node:path');
const XTCG = require('../docs/calc.js');
const Decks = require('../docs/decks.js');

const dir = path.join(__dirname, '..', 'docs', 'data');
const lerJson = (nome) => JSON.parse(fs.readFileSync(path.join(dir, nome), 'utf8'));
const erros = [];
const avisos = [];
let eventos, jogadores, configDecks;

try { eventos = lerJson('eventos.json'); } catch (e) { console.error(`ERRO: eventos.json inválido: ${e.message}`); process.exit(1); }
try { jogadores = lerJson('jogadores.json'); } catch (e) { console.error(`ERRO: jogadores.json inválido: ${e.message}`); process.exit(1); }
try { configDecks = lerJson('decks.json'); } catch (e) { console.error(`ERRO: decks.json inválido: ${e.message}`); process.exit(1); }

const dataValida = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

if (!Array.isArray(eventos)) erros.push('eventos.json deve conter uma lista.');
if (!Array.isArray(jogadores)) erros.push('jogadores.json deve conter uma lista.');
if (!Array.isArray(configDecks.decks)) erros.push('decks.json deve conter uma lista "decks".');

const jogadorPorNome = new Map();
for (const [i, j] of (Array.isArray(jogadores) ? jogadores : []).entries()) {
  if (!j || typeof j.nome !== 'string' || !j.nome.trim()) { erros.push(`jogadores.json: registro ${i + 1} sem nome válido.`); continue; }
  for (const nome of [j.nome, ...(Array.isArray(j.aliases) ? j.aliases : [])]) {
    const k = XTCG.norm(nome);
    if (!k) { erros.push(`jogadores.json: nome/alias vazio em ${j.nome}.`); continue; }
    const anterior = jogadorPorNome.get(k);
    if (anterior && anterior !== j.nome) erros.push(`Nome/alias conflitante "${nome}" entre "${anterior}" e "${j.nome}".`);
    else jogadorPorNome.set(k, j.nome);
  }
}

const datas = new Set();
for (const [i, ev] of (Array.isArray(eventos) ? eventos : []).entries()) {
  const rotulo = `evento ${i + 1}`;
  if (!ev || !dataValida(ev.data)) { erros.push(`${rotulo}: data inválida (${ev && ev.data}). Use AAAA-MM-DD.`); continue; }
  if (datas.has(ev.data)) erros.push(`Data de evento duplicada: ${ev.data}.`);
  datas.add(ev.data);
  if (typeof ev.nome !== 'string' || !ev.nome.trim()) erros.push(`${ev.data}: nome do evento ausente.`);
  if (!Array.isArray(ev.jogadores)) { erros.push(`${ev.data}: jogadores deve ser uma lista.`); continue; }
  const vistos = new Set();
  ev.jogadores.forEach((item, pos) => {
    const nome = typeof item === 'string' ? item : item && item.nome;
    if (typeof nome !== 'string' || !nome.trim()) { erros.push(`${ev.data}: participante ${pos + 1} sem nome válido.`); return; }
    const cadastro = jogadorPorNome.get(XTCG.norm(nome));
    if (!cadastro) avisos.push(`${ev.data}: "${nome}" não tem cadastro em jogadores.json.`);
    const chave = XTCG.norm(cadastro || nome);
    if (vistos.has(chave)) erros.push(`${ev.data}: jogador duplicado "${nome}".`);
    vistos.add(chave);
    if (typeof item === 'object' && item !== null) {
      for (const campo of ['v', 'd', 'e']) {
        if (item[campo] !== undefined && (!Number.isInteger(item[campo]) || item[campo] < 0)) erros.push(`${ev.data}: ${nome} tem valor inválido em "${campo}".`);
      }
      if (item.ow !== undefined && (typeof item.ow !== 'number' || !Number.isFinite(item.ow) || item.ow < 0 || item.ow > 100)) erros.push(`${ev.data}: ${nome} tem valor inválido em "ow".`);
    }
  });
}

const registro = Decks.montarRegistro(configDecks.decks || []);
for (const [i, d] of (configDecks.decks || []).entries()) {
  if (!d || typeof d.nome !== 'string' || !d.nome.trim()) erros.push(`decks.json: deck ${i + 1} sem nome.`);
  if (d && d.icones !== undefined && (!Array.isArray(d.icones) || d.icones.some((x) => typeof x !== 'string' || !x.trim()))) erros.push(`decks.json: ícones inválidos no deck ${d.nome || i + 1}.`);
}
const arquivoDecks = path.join(dir, 'decks.txt');
if (fs.existsSync(arquivoDecks)) {
  const { blocos, erros: errosTexto } = Decks.lerTexto(fs.readFileSync(arquivoDecks, 'utf8'));
  errosTexto.forEach((e) => erros.push(`decks.txt: ${e}`));
  const chaves = XTCG.criarChave(jogadores);
  const eventoPorData = new Map(eventos.map((e) => [e.data, e]));
  const datasBloco = new Set();
  for (const bloco of blocos) {
    if (datasBloco.has(bloco.data)) erros.push(`decks.txt: bloco repetido para ${bloco.data}.`);
    datasBloco.add(bloco.data);
    const ev = eventoPorData.get(bloco.data);
    if (!ev) { erros.push(`decks.txt: não existe evento para ${bloco.data}.`); continue; }
    const presentes = new Set(ev.jogadores.map((item) => chaves(typeof item === 'string' ? item : item.nome)));
    const decksVistos = new Set();
    for (const linha of bloco.linhas) {
      const chave = chaves(linha.jogador);
      if (!presentes.has(chave)) erros.push(`decks.txt (${bloco.data}): jogador "${linha.jogador}" não está no evento.`);
      if (decksVistos.has(chave)) erros.push(`decks.txt (${bloco.data}): jogador "${linha.jogador}" tem mais de um registro de deck.`);
      decksVistos.add(chave);
      if (!Decks.identificar(linha.deck, registro)) avisos.push(`decks.txt (${bloco.data}): deck não reconhecido "${linha.deck}".`);
    }
  }
}

// A execução do cálculo também garante que os avisos de duplicação sejam reportados.
const resultado = XTCG.calcular(eventos, jogadores);
resultado.avisos.forEach((a) => erros.push(`Cálculo: ${a}`));

avisos.forEach((a) => console.warn(`AVISO: ${a}`));
erros.forEach((e) => console.error(`ERRO: ${e}`));
if (erros.length) {
  console.error(`\nValidação reprovada: ${erros.length} erro(s), ${avisos.length} aviso(s).`);
  process.exit(1);
}
console.log(`Validação concluída: ${eventos.length} eventos, ${jogadores.length} jogadores cadastrados, ${registro.length} decks. ${avisos.length} aviso(s).`);
