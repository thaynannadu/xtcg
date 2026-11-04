(function () {
  const $ = (id) => document.getElementById(id);
  const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let eventos = [], jogadores = [], linhasDe = new Map(), tudoAberto = false;
  let cfgDecks = { iconesBase: '', iconesExt: '.png' }, registro = [], decksPorData = new Map();

  const { nomeMes, plural, dataCurta, json, mesDe } = Util;
  const pct = (x) => (typeof x === 'number' ? x.toFixed(2).replace('.', ',') + '%' : '—');
  const num = (x) => (typeof x === 'number' ? String(x) : '—');

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function eventosDoMes() {
    const mes = $('mes').value;
    return eventos.slice().sort((a, b) => b.data.localeCompare(a.data))
      .filter((e) => mes === 'todos' || mesDe(e.data) === mes);
  }

  function cartao(e, aberto) {
    const linhas = linhasDe.get(e);
    const li = el('li');
    const det = el('details', 'evento');
    det.open = aberto;

    const sum = el('summary');
    const [, mm, dd] = e.data.split('-');
    const data = el('span', 'data');
    data.append(el('span', 'dia', String(Number(dd))), el('span', 'mes-curto', MES_CURTO[Number(mm) - 1]));

    const info = el('span', 'info');
    info.append(el('span', 'titulo', e.nome), el('span', 'quantos', plural(linhas.length, 'jogador', 'jogadores')));
    const top = el('span', 'top3');
    linhas.slice(0, 3).forEach((l) => {
      const chip = el('span', 'chip');
      chip.append(el('span', `medalha p${l.pos}`, String(l.pos)), l.nome);
      top.append(chip);
    });
    info.append(top);
    sum.append(data, info, el('span', 'seta'));

    const corpo = el('div', 'corpo');
    const rol = el('div', 'rolagem');
    const tab = el('table', 'mini');
    const cab = el('thead'); const trc = el('tr');
    const mapaDecks = decksPorData.get(e.data);
    const chave = XTCG.criarChave(jogadores);
    const temDeck = !!(mapaDecks && mapaDecks.size);
    [['Posição', '', ''], ['Nome', 'esq', ''], ...(temDeck ? [['Deck', 'esq', '']] : []), ['V', '', 'Vitórias'], ['D', '', 'Derrotas'], ['E', '', 'Empates'], ['Opp Win', '', "Opponents' Win %"]].forEach(([t, c, titulo]) => {
      const th = el('th', c, t); th.scope = 'col'; if (titulo) th.title = titulo; trc.append(th);
    });
    cab.append(trc);
    const tb = el('tbody');
    linhas.forEach((l, i) => {
      const tr = el('tr', 'linha' + (i % 2 ? ' alt' : ''));
      const pos = el('td', l.pos <= 3 ? `pos-medalha p${l.pos}` : '', `${l.pos}º`);
      const nome = el('td', 'nome-simples');
      nome.append(el('span', null, l.nome));
      tr.append(pos, nome, ...(temDeck ? [celulaDeck(mapaDecks.get(chave(l.impresso)))] : []), el('td', 'num', num(l.v)), el('td', 'num', num(l.d)), el('td', 'num', num(l.e)), el('td', 'num ow', pct(l.ow)));
      tb.append(tr);
    });
    tab.append(cab, tb);
    rol.append(tab); corpo.append(rol);

    det.append(sum, corpo);
    li.append(det);
    return li;
  }

  function render() {
    const itens = eventosDoMes();
    const mes = $('mes').value;
    const ul = $('eventos'); ul.replaceChildren();
    itens.forEach((e, i) => ul.append(cartao(e, tudoAberto || i === 0)));

    $('subtitulo').textContent = plural(itens.length, 'semanal registrado', 'semanais registrados');
    const vazio = $('vazio');
    vazio.hidden = itens.length > 0;
    if (!itens.length) vazio.textContent = `Nenhum semanal em ${mes === 'todos' ? 'nenhum mês' : nomeMes(mes)}. Escolha outro mês na lista acima.`;
    $('alternar').disabled = itens.length === 0;
    $('alternar').textContent = tudoAberto ? 'Recolher tudo' : 'Expandir tudo';
  }

  async function textoOpcional(url) {
    try { const r = await fetch(url); return r.ok ? await r.text() : ''; } catch (e) { return ''; }
  }

  // Lê decks.json (lista de decks) e decks.txt (o que foi escrito à mão) e casa tudo com os semanais.
  async function carregarDecks() {
    const avisos = [];
    try { cfgDecks = Object.assign(cfgDecks, await json('data/decks.json')); } catch (e) { avisos.push('Não consegui ler data/decks.json: os decks não serão exibidos.'); }
    registro = Decks.montarRegistro(cfgDecks.decks || []);
    const { blocos, erros } = Decks.lerTexto(await textoOpcional('data/decks.txt'));
    avisos.push(...erros);

    const chave = XTCG.criarChave(jogadores);
    const desconhecidos = new Set();
    blocos.forEach((b) => {
      const ev = eventos.find((e) => e.data === b.data);
      if (!ev) { avisos.push(`Em decks.txt há decks para ${b.data}, mas não existe semanal nessa data.`); return; }
      const presentes = new Set(linhasDe.get(ev).map((l) => chave(l.impresso)));
      const mapa = decksPorData.get(b.data) || new Map();
      b.linhas.forEach((l) => {
        const k = chave(l.jogador);
        if (!presentes.has(k)) { avisos.push(`${l.jogador} não aparece no semanal de ${dataCurta(b.data)}.`); return; }
        const deck = Decks.identificar(l.deck, registro);
        if (!deck) desconhecidos.add(l.deck);
        mapa.set(k, { texto: l.deck, deck });
      });
      decksPorData.set(b.data, mapa);
    });
    if (desconhecidos.size) avisos.push(`Deck não reconhecido (cadastre em data/decks.json): ${[...desconhecidos].join('; ')}.`);

    const av = $('avisos'); av.replaceChildren();
    avisos.forEach((t) => av.append(el('p', null, t)));
    // Avisos de dados são para quem administra: aparecem só em semanais.html?avisos
    av.hidden = avisos.length === 0 || !new URLSearchParams(location.search).has('avisos');
  }


  function celulaDeck(info) {
    const td = el('td', 'deck-cel');
    if (!info) { td.textContent = '—'; return td; }
    const box = el('span', 'deck');
    if (info.deck) {
      const ic = el('span', 'icones');
      info.deck.icones.forEach((slug) => ic.append(Util.iconeImg(cfgDecks, slug)));
      box.append(ic, el('span', 'deck-nome', info.deck.nome));
      box.title = info.deck.nome;
    } else {
      box.append(el('span', 'deck-livre', info.texto));
      box.title = 'Deck não reconhecido';
    }
    td.append(box);
    return td;
  }

  async function iniciar() {
    Util.avisarSeSemEstilo();
    try {
      [eventos, jogadores] = await Promise.all([json('data/eventos.json'), json('data/jogadores.json')]);
    } catch (e) {
      const v = $('vazio'); v.hidden = false; v.textContent = e.message + ' Abra a página por um servidor (veja o README), não direto pelo arquivo.';
      return;
    }
    eventos.forEach((e) => linhasDe.set(e, XTCG.detalharEvento(e, jogadores)));
    await carregarDecks();

    // Só aparecem meses que têm semanal registrado.
    const meses = Util.mesesComDados(eventos);
    const sel = $('mes');
    meses.forEach((m) => { const o = el('option', null, `${nomeMes(m)} ${m.slice(0, 4)}`); o.value = m; sel.append(o); });
    const todos = el('option', null, 'Todos os meses'); todos.value = 'todos'; sel.append(todos);
    sel.value = meses.length ? Util.mesPadrao(meses, Util.mesAtual()) : 'todos';

    sel.addEventListener('change', render);
    $('alternar').addEventListener('click', () => {
      tudoAberto = !tudoAberto;
      document.querySelectorAll('#eventos details').forEach((d) => { d.open = tudoAberto; });
      $('alternar').textContent = tudoAberto ? 'Recolher tudo' : 'Expandir tudo';
    });
    render();
  }
  iniciar();
})();
