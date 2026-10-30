const test = require('node:test');
const assert = require('node:assert/strict');
const XTCG = require('../docs/calc.js');

test('pontua desempenho e participação', () => {
  const r = XTCG.calcular([{ data: '2026-10-01', nome: 'Teste', jogadores: ['Ana', 'Bia', 'Caio'] }], []);
  assert.equal(r.tabela[0].desempenho, 3);
  assert.equal(r.tabela[0].participacao, 1);
  assert.equal(r.tabela[2].desempenho, 1);
});

test('ignora um evento inteiro quando há jogador duplicado', () => {
  const r = XTCG.calcular([{ data: '2026-10-01', nome: 'Teste', jogadores: ['Ana', 'Bia', 'Ana'] }], []);
  assert.equal(r.tabela.length, 0);
  assert.match(r.avisos[0], /evento foi ignorado no cálculo/);
});

test('consolida apelidos no cadastro oficial', () => {
  const jogadores = [{ nome: 'Ana Silva', aliases: ['Aninha'] }];
  const eventos = [
    { data: '2026-10-01', nome: 'Teste 1', jogadores: ['Ana Silva', 'Bia'] },
    { data: '2026-10-08', nome: 'Teste 2', jogadores: ['Aninha', 'Bia'] },
  ];
  const r = XTCG.calcular(eventos, jogadores);
  assert.equal(r.tabela.find((x) => x.nome === 'Ana Silva').participacao, 2);
  assert.equal(r.avisos.length, 0);
});

test('ordena por desempenho, participações e melhor colocação', () => {
  const eventos = [{ data: '2026-10-01', nome: 'Teste', jogadores: ['Ana', 'Bia', 'Caio'] }];
  const r = XTCG.calcular(eventos, []);
  assert.deepEqual(r.tabela.map((x) => x.nome), ['Ana', 'Bia', 'Caio']);
});
