(function () {
  const $ = (id) => document.getElementById(id);
  const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let eventos = [], jogadores = [], linhasDe = new Map(), tudoAberto = false;

  const nomeMes = (ym) => {
    const [a, m] = ym.split('-').map(Number);
    const n = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const pct = (x) => (typeof x === 'number' ? x.toFixed(2).replace('.', ',') + '%' : '—');
  const num = (x) => (typeof x === 'number' ? String(x) : '—');

  function avisarSeSemEstilo() {
    if (getComputedStyle(document.documentElement).getPropertyValue('--preto').trim()) return;
    const p = document.createElement('p');
    p.setAttribute('style', 'background:#fff3c4;color:#000;padding:12px;margin:0;font:16px sans-serif');
    p.textContent = 'O arquivo style.css não foi carregado. Confira se ele está na mesma pasta do index.html e do semanais.html, com esse nome exato (sem "(1)" no final).';
    document.body.prepend(p);
  }

  async function json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Não consegui carregar ${url} (${r.status}).`);
    return r.json();
  }

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function eventosDoMes() {
    const mes = $('mes').value;
    return eventos.slice().sort((a, b) => b.data.localeCompare(a.data))
      .filter((e) => mes === 'todos' || e.data.startsWith(mes));
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
    [['Posição', '', ''], ['Nome', 'esq', ''], ['V', '', 'Vitórias'], ['E', '', 'Empates'], ['D', '', 'Derrotas'], ['Opp Win', '', "Opponents' Win %"]].forEach(([t, c, titulo]) => {
      const th = el('th', c, t); th.scope = 'col'; if (titulo) th.title = titulo; trc.append(th);
    });
    cab.append(trc);
    const tb = el('tbody');
    linhas.forEach((l, i) => {
      const tr = el('tr', 'linha' + (i % 2 ? ' alt' : ''));
      const pos = el('td', l.pos <= 3 ? `pos-medalha p${l.pos}` : '', `${l.pos}º`);
      const nome = el('td', 'nome-simples');
      nome.append(el('span', null, l.nome));
      if (!l.pontua) nome.append(' ', el('small', null, '(dono da loja)'));
      tr.append(pos, nome, el('td', 'num', num(l.v)), el('td', 'num', num(l.e)), el('td', 'num', num(l.d)), el('td', 'num ow', pct(l.ow)));
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
    if (!itens.length) vazio.textContent = `Nenhum semanal em ${mes === 'todos' ? 'nenhum mês' : nomeMes(mes)}. Adicione um em docs/data/eventos.json.`;
    $('alternar').disabled = itens.length === 0;
    $('alternar').textContent = tudoAberto ? 'Recolher tudo' : 'Expandir tudo';
  }

  async function iniciar() {
    avisarSeSemEstilo();
    try {
      [eventos, jogadores] = await Promise.all([json('data/eventos.json'), json('data/jogadores.json')]);
    } catch (e) {
      const v = $('vazio'); v.hidden = false; v.textContent = e.message + ' Abra a página por um servidor (veja o README), não direto pelo arquivo.';
      return;
    }
    eventos.forEach((e) => linhasDe.set(e, XTCG.detalharEvento(e, jogadores)));

    const hoje = new Date();
    const atual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const meses = [...new Set([...eventos.map((e) => e.data.slice(0, 7)), atual])].sort().reverse();
    const sel = $('mes');
    meses.forEach((m) => { const o = el('option', null, `${nomeMes(m)} ${m.slice(0, 4)}`); o.value = m; sel.append(o); });
    const todos = el('option', null, 'Todos os meses'); todos.value = 'todos'; sel.append(todos);
    sel.value = atual;

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
