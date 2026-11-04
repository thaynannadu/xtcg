const test = require('node:test');
const assert = require('node:assert');
const U = require('../docs/util.js');

test('quintas-feiras do mês', () => {
  assert.strictEqual(U.quintasDoMes('2026-10'), 5); // 1, 8, 15, 22, 29
  assert.strictEqual(U.quintasDoMes('2026-09'), 4);
  assert.strictEqual(U.quintasDoMes('2026-08'), 4);
  assert.strictEqual(U.quintasDoMes('2024-02'), 5); // bissexto: 1, 8, 15, 22, 29
});

test('total de semanais usa o maior entre quintas e semanais registrados', () => {
  const extra = ['08', '09', '10', '11', '12', '13'].map((d) => ({ data: `2026-09-${d}` }));
  assert.strictEqual(U.totalSemanais([{ data: '2026-10-01' }], '2026-10'), 5);
  assert.strictEqual(U.totalSemanais(extra, '2026-09'), 6);
});

test('só meses com registro, do mais novo ao mais antigo', () => {
  const ev = [{ data: '2026-08-06' }, { data: '2026-10-01' }, { data: '2026-10-08' }, { data: '2026-09-03' }];
  assert.deepStrictEqual(U.mesesComDados(ev), ['2026-10', '2026-09', '2026-08']);
});

test('mês padrão: o atual, ou o último com registro', () => {
  const meses = ['2026-10', '2026-09'];
  assert.strictEqual(U.mesPadrao(meses, '2026-10'), '2026-10');
  assert.strictEqual(U.mesPadrao(meses, '2026-11'), '2026-10'); // novembro ainda sem semanal
  assert.strictEqual(U.mesPadrao(meses, '2026-09'), '2026-09');
  assert.strictEqual(U.mesPadrao([], '2026-11'), '2026-11');
});

test('formatação de datas e plurais', () => {
  assert.strictEqual(U.dataBarra('2026-10-01'), '01/10');
  assert.strictEqual(U.dataCurta('2026-10-01'), '01.10');
  assert.strictEqual(U.plural(1, 'jogador', 'jogadores'), '1 jogador');
  assert.strictEqual(U.plural(3, 'jogador', 'jogadores'), '3 jogadores');
});
