// Uso: node scripts/tabela.js [AAAA-MM]
const fs = require('fs');
const path = require('path');
const { calcular } = require('../docs/calc.js');

const dir = path.join(__dirname, '..', 'docs', 'data');
const eventos = JSON.parse(fs.readFileSync(path.join(dir, 'eventos.json'), 'utf8'));
const jogadores = JSON.parse(fs.readFileSync(path.join(dir, 'jogadores.json'), 'utf8'));
const mes = process.argv[2];

const filtrados = mes ? eventos.filter(e => e.data.startsWith(mes)) : eventos;
const r = calcular(filtrados, jogadores);

r.tabela.forEach((l, i) => console.log(`${String(i + 1).padStart(2)}º  ${l.nome.padEnd(20)} ${String(l.desempenho).padStart(3)}  ${l.participacao}`));
if (r.semCadastro.length) console.log('\nSem cadastro em jogadores.json:', r.semCadastro.join(', '));
r.avisos.forEach(a => console.log('Aviso:', a));
