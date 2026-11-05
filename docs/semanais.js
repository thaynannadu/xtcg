(function () {
  const $ = (id) => document.getElementById(id);
  const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MODO = document.body.dataset.modo === 'especiais' ? 'especiais' : 'semanais';
  let tipoAtual = 'todos', todosEv = [], eventos = [], jogadores = [], linhasDe = new Map(), tudoAberto = false;
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
      .filter((e) => mes === 'todos' || mesDe(e.data) === mes)
      .filter((e) => MODO !== 'especiais' || tipoAtual === 'todos' || XTCG.tipoDe(e) === tipoAtual);
  }

  // Iniciais para o chip no mobile: primeira letra do primeiro e do último nome ("Matheus Mendes" → "MM").
  function iniciais(nome) {
    const p = String(nome).trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '';
    const letra = (s) => s.charAt(0).toUpperCase();
    return p.length === 1 ? p[0].slice(0, 2).charAt(0).toUpperCase() + p[0].slice(1, 2).toLowerCase() : letra(p[0]) + letra(p[p.length - 1]);
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
    const titulo = el('span', 'titulo', e.nome);
    if (MODO === 'especiais') titulo.append(el('span', `tag tag-${XTCG.tipoDe(e)}`, XTCG.TIPOS[XTCG.tipoDe(e)] || XTCG.tipoDe(e)));
    info.append(titulo, el('span', 'quantos', plural(linhas.length, 'jogador', 'jogadores')));
    const top = el('span', 'top3');
    linhas.slice(0, 3).forEach((l) => {
      const chip = el('span', `chip chip-p${l.pos}`);
      const nome = el('span', 'chip-nome', l.nome);
      const ini = el('span', 'chip-ini', iniciais(l.nome)); ini.setAttribute('aria-hidden', 'true');
      chip.title = l.nome;
      chip.append(el('span', `medalha p${l.pos}`, String(l.pos)), nome, ini);
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

    $('subtitulo').textContent = MODO === 'especiais' ? `${plural(itens.length, 'evento registrado', 'eventos registrados')} · não pontuam no Ginásio` : plural(itens.length, 'semanal registrado', 'semanais registrados');
    const vazio = $('vazio');
    vazio.hidden = itens.length > 0;
    if (!itens.length) vazio.textContent = MODO === 'especiais' && !todosEv.some((e) => !XTCG.ehSemanal(e)) ? 'Ainda não há eventos especiais, cups ou challenges registrados.' : `Nenhum ${MODO === 'especiais' ? 'evento' : 'semanal'} em ${mes === 'todos' ? 'nenhum mês' : nomeMes(mes)}. Escolha outro filtro na lista acima.`;
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
      const ev = todosEv.find((e) => e.data === b.data);
      if (!ev) { avisos.push(`Em decks.txt há decks para ${b.data}, mas não existe evento nessa data.`); return; }
      const presentes = new Set(linhasDe.get(ev).map((l) => chave(l.impresso)));
      const mapa = decksPorData.get(b.data) || new Map();
      b.linhas.forEach((l) => {
        const k = chave(l.jogador);
        if (!presentes.has(k)) { avisos.push(`${l.jogador} não aparece no evento de ${dataCurta(b.data)}.`); return; }
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
      (info.deck.icones.length ? info.deck.icones : ['']).forEach((slug) => ic.append(Util.iconeImg(cfgDecks, slug, info.deck.nome)));
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
      [todosEv, jogadores] = await Promise.all([json('data/eventos.json'), json('data/jogadores.json')]);
    } catch (e) {
      const v = $('vazio'); v.hidden = false; v.textContent = e.message + ' Abra a página por um servidor (veja o README), não direto pelo arquivo.';
      return;
    }
    todosEv.forEach((e) => linhasDe.set(e, XTCG.detalharEvento(e, jogadores)));
    eventos = todosEv.filter((e) => (MODO === 'especiais' ? !XTCG.ehSemanal(e) : XTCG.ehSemanal(e)));
    await carregarDecks();

    // Só aparecem meses que têm semanal registrado.
    const meses = Util.mesesComDados(eventos);
    const sel = $('mes');
    meses.forEach((m) => { const o = el('option', null, `${nomeMes(m)} ${m.slice(0, 4)}`); o.value = m; sel.append(o); });
    const todos = el('option', null, 'Todos os meses'); todos.value = 'todos'; sel.append(todos);
    sel.value = meses.length ? Util.mesPadrao(meses, Util.mesAtual()) : 'todos';

    document.querySelectorAll('.subnav [data-tipo]').forEach((b) => b.addEventListener('click', () => {
      tipoAtual = b.dataset.tipo;
      document.querySelectorAll('.subnav [data-tipo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    }));
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
