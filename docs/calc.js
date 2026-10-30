/* Cálculo do Líder de Ginásio XTCG.
   Regra: pontos de desempenho = jogadores - colocação + 1; participação = 1 por semanal.
   Funciona no navegador (window.XTCG) e no Node (require). */
(function (root) {
  function norm(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Cada jogador de um semanal pode ser só o nome (texto) ou um objeto { nome, v, d, e, ow }.
  function nomeDe(item) { return typeof item === 'string' ? item : item.nome; }

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
      ev.jogadores.forEach((item, i) => {
        const nomeImpresso = nomeDe(item);
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

    // Desempate: mais pontos de desempenho, depois mais participações e, por fim, o melhor
    // posicionamento nos semanais (a melhor colocação; se igualar, a segunda melhor, e assim por diante).
    const colocacoes = (r) => r.detalhes.map((d) => d.pos).sort((x, y) => x - y);
    const porColocacao = (a, b) => {
      const pa = colocacoes(a), pb = colocacoes(b);
      for (let i = 0; i < Math.min(pa.length, pb.length); i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
      return 0;
    };
    const tabela = [...acc.values()].sort((a, b) =>
      b.desempenho - a.desempenho || b.participacao - a.participacao || porColocacao(a, b) || a.ordem - b.ordem);
    return { tabela, semCadastro: [...semCadastro], avisos, eventos: ordenados };
  }

  // Lista um semanal com a colocação, o nome na tabela e os pontos de desempenho de cada jogador.
  function detalharEvento(ev, jogadores) {
    const idx = montarIndice(jogadores);
    const n = ev.jogadores.length;
    return ev.jogadores.map((item, i) => {
      const impresso = nomeDe(item);
      const cad = idx.get(norm(impresso));
      const pontua = !cad || cad.pontua !== false;
      return { pos: i + 1, de: n, impresso, nome: cad ? cad.nome : impresso, pontua, semCadastro: !cad, pontos: pontua ? n - i : null,
        v: item.v, d: item.d, e: item.e, ow: item.ow };
    });
  }

  // Devolve uma função que transforma qualquer nome ou apelido na chave do jogador cadastrado.
  function criarChave(jogadores) {
    const idx = montarIndice(jogadores);
    return (nome) => norm((idx.get(norm(nome)) || { nome }).nome);
  }

  const API = { calcular, detalharEvento, criarChave, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.XTCG = API;
})(typeof window !== 'undefined' ? window : globalThis);
