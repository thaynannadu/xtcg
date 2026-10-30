// Uso: node scripts/baixar-icones.js [--listar]
// Baixa para docs/assets/pokemon/ os ícones usados em docs/data/decks.json (Node 18 ou mais novo).
// Depois, em decks.json, troque "iconesBase" para "assets/pokemon/" e o site passa a usar as cópias locais.
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'data', 'decks.json'), 'utf8'));
const slugs = [...new Set(cfg.decks.flatMap((d) => d.icones || []))].sort();
const ext = cfg.iconesExt || '.png';

if (process.argv.includes('--listar')) { console.log(slugs.join('\n')); process.exit(0); }

const saida = path.join(__dirname, '..', 'docs', 'assets', 'pokemon');
fs.mkdirSync(saida, { recursive: true });

(async () => {
  let ok = 0, falhas = [];
  for (const slug of slugs) {
    try {
      const r = await fetch(cfg.iconesOrigem + slug + ext);
      if (!r.ok) throw new Error(r.status);
      fs.writeFileSync(path.join(saida, slug + ext), Buffer.from(await r.arrayBuffer()));
      ok++;
    } catch (e) { falhas.push(`${slug} (${e.message})`); }
  }
  console.log(`${ok} de ${slugs.length} ícones baixados em ${saida}`);
  if (falhas.length) console.log('Falharam:', falhas.join(', '));
  console.log('Agora troque "iconesBase" em docs/data/decks.json para "assets/pokemon/".');
})();
