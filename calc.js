/* Cálculo do Líder de Ginásio XTCG.
   Regra: pontos de desempenho = jogadores - colocação + 1; participação = 1 por semanal.
   Funciona no navegador (window.XTCG) e no Node (require). */
(function (root) {
  function norm(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function montarIndice(jogadores) {
    const idx = new Map();
    for (const j of jogadores) {
      idx.set(norm(j.nome), j);
      for (const a of j.aliases || []) idx.set(norm(a), j);
    }
    return idx;
  }

  function calcular(eventos, jogadores, opcoes) {
    const o = Object.assign({ pontosParticipacao: 1 }, opcoes);
    const idx = montarIndice(jogadores);
    const acc = new Map();
    const semCadastro = new Set();
    const avisos = [];
    let ordem = 0;

    const ordenados = [...eventos].sort((a, b) => a.data.localeCompare(b.data));
    for (const ev of ordenados) {
      const n = ev.jogadores.length;
      const vistos = new Set();
      ev.jogadores.forEach((nomeImpresso, i) => {
        const pos = i + 1;
        const cadastro = idx.get(norm(nomeImpresso));
        const base = cadastro || { nome: nomeImpresso };
        if (!cadastro) semCadastro.add(nomeImpresso);
        if (base.pontua === false) return;

        const chave = norm(base.nome);
        if (vistos.has(chave)) avisos.push(`${base.nome} aparece duas vezes em ${ev.data}.`);
        vistos.add(chave);

        if (!acc.has(chave)) {
          acc.set(chave, { nome: base.nome, nota: base.nota || '', desempenho: 0, participacao: 0, detalhes: [], ordem: ordem++ });
        }
        const r = acc.get(chave);
        const pontos = n - pos + 1;
        r.desempenho += pontos;
        r.participacao += o.pontosParticipacao;
        r.detalhes.push({ data: ev.data, evento: ev.nome, pos, de: n, pontos });
      });
    }

    const tabela = [...acc.values()].sort((a, b) =>
      b.desempenho - a.desempenho || b.participacao - a.participacao || a.ordem - b.ordem);
    return { tabela, semCadastro: [...semCadastro], avisos, eventos: ordenados };
  }

  const API = { calcular, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.XTCG = API;
})(typeof window !== 'undefined' ? window : globalThis);
