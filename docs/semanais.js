(function () {
  const $ = (id) => document.getElementById(id);
  const norm = (s) => XTCG.norm(s);
  const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let eventos = [], jogadores = [], linhasDe = new Map(), tudoAberto = false;

  const nomeMes = (ym) => {
    const [a, m] = ym.split('-').map(Number);
    const n = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  async function json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Não consegui carregar ${url} (${r.status}).`);
    return r.json();
  }

  function filtrar() {
    const mes = $('mes').value, q = norm($('busca').value);
    return eventos.slice().sort((a, b) => b.data.localeCompare(a.data))
      .filter((e) => mes === 'todos' || e.data.startsWith(mes))
      .map((e) => {
        const linhas = linhasDe.get(e);
        const achados = q ? linhas.filter((l) => norm(l.nome).includes(q) || norm(l.impresso).includes(q)) : [];
        return { e, linhas, achados };
      })
      .filter((x) => !q || x.achados.length);
  }

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function cartao({ e, linhas, achados }, aberto) {
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
      const chip = el('span', 'chip' + (l.pontua ? '' : ' fora'));
      chip.append(el('span', `medalha p${l.pos}`, String(l.pos)), l.nome);
      if (!l.pontua) chip.title = 'Dono da loja: não pontua';
      top.append(chip);
    });
    info.append(top);
    sum.append(data, info, el('span', 'seta'));

    const corpo = el('div', 'corpo');
    const rol = el('div', 'rolagem');
    const tab = el('table', 'mini');
    const cab = el('thead'); const trc = el('tr');
    [['Posição', ''], ['Nome', 'esq'], ['Pontos de desempenho', '']].forEach(([t, c]) => { const th = el('th', c, t); th.scope = 'col'; trc.append(th); });
    cab.append(trc);
    const tb = el('tbody');
    const marcados = new Set(achados);
    linhas.forEach((l, i) => {
      const tr = el('tr', 'linha' + (i % 2 ? ' alt' : '') + (marcados.has(l) ? ' achado' : '') + (l.pontua ? '' : ' fora'));
      const pos = el('td', l.pos <= 3 ? `pos-medalha p${l.pos}` : '', `${l.pos}º`);
      const nome = el('td', 'nome-simples');
      nome.append(el('span', null, l.nome));
      if (l.nome !== l.impresso) nome.append(' ', el('small', null, l.impresso));
      if (!l.pontua) nome.append(' ', el('small', null, '(dono da loja, fora da pontuação)'));
      tr.append(pos, nome, el('td', 'des', l.pontua ? String(l.pontos) : '—'));
      tb.append(tr);
    });
    tab.append(cab, tb);
    rol.append(tab); corpo.append(rol);

    det.append(sum, corpo);
    li.append(det);
    return li;
  }

  function render() {
    const itens = filtrar();
    const q = $('busca').value.trim();
    const mes = $('mes').value;
    const ul = $('eventos'); ul.replaceChildren();
    itens.forEach((x, i) => ul.append(cartao(x, q ? true : (tudoAberto || i === 0))));

    $('subtitulo').textContent = q
      ? `${plural(itens.length, 'semanal encontrado', 'semanais encontrados')}`
      : `${plural(itens.length, 'semanal registrado', 'semanais registrados')}`;
    const vazio = $('vazio');
    vazio.hidden = itens.length > 0;
    if (!itens.length) {
      vazio.textContent = q ? 'Nenhum semanal com esse jogador neste período.'
        : `Nenhum semanal em ${mes === 'todos' ? 'nenhum mês' : nomeMes(mes)}. Adicione um em docs/data/eventos.json.`;
    }
    $('alternar').disabled = itens.length === 0;
    $('alternar').textContent = tudoAberto ? 'Recolher tudo' : 'Expandir tudo';
  }

  async function iniciar() {
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
    $('busca').addEventListener('input', render);
    $('alternar').addEventListener('click', () => {
      tudoAberto = !tudoAberto;
      document.querySelectorAll('#eventos details').forEach((d) => { d.open = tudoAberto; });
      $('alternar').textContent = tudoAberto ? 'Recolher tudo' : 'Expandir tudo';
    });
    render();
  }
  iniciar();
})();
