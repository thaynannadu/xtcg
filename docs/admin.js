(function () {
  const $ = (id) => document.getElementById(id);
  const { Util, XTCG, Decks, AdminLib: A, GH } = window;
  const CHAVE = 'xtcg-admin';

  let cli = null, dados = null, editando = null, linhas = [];
  let decksPend = [], decksEditando = -1;

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function guardar(armazem, k, v) { try { v == null ? window[armazem].removeItem(k) : window[armazem].setItem(k, v); } catch (e) { /* sem armazenamento */ } }
  function ler(armazem, k) { try { return window[armazem].getItem(k); } catch (e) { return null; } }

  let tMsg;
  function aviso(texto, tipo) {
    const m = $('msg');
    m.textContent = texto; m.className = `aviso-admin ${tipo || ''}`; m.hidden = !texto;
    clearTimeout(tMsg);
    if (texto && tipo === 'ok') tMsg = setTimeout(() => { m.hidden = true; }, 12000);
  }
  function ocupado(botao, sim, texto) {
    botao.disabled = sim;
    if (sim) { botao.dataset.t = botao.textContent; botao.textContent = texto; } else if (botao.dataset.t) botao.textContent = botao.dataset.t;
  }

  /* ---------- conexão ---------- */
  function padraoRepo() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/);
    return m ? { owner: m[1], repo: location.pathname.split('/')[1] || '' } : { owner: '', repo: '' };
  }
  function preencherConexao() {
    let salvo = {};
    try { salvo = JSON.parse(ler('localStorage', CHAVE) || '{}'); } catch (e) { /* ignora */ }
    const p = padraoRepo();
    $('c-owner').value = salvo.owner || p.owner;
    $('c-repo').value = salvo.repo || p.repo;
    $('c-branch').value = salvo.branch || 'main';
    const tok = ler('localStorage', CHAVE + '-token') || ler('sessionStorage', CHAVE + '-token') || '';
    $('c-token').value = tok;
    $('c-lembrar').checked = !!ler('localStorage', CHAVE + '-token');
  }

  async function carregarDados() {
    const [ev, jg, dk, dt] = await Promise.all(['eventos.json', 'jogadores.json', 'decks.json', 'decks.txt'].map((n) => cli.ler(n)));
    dados = { eventos: JSON.parse(ev), jogadores: JSON.parse(jg), decksCfg: JSON.parse(dk), jogadoresTxt: jg, decksTxt: dt };
  }

  async function conectar(e) {
    e.preventDefault();
    const cfg = { owner: $('c-owner').value.trim(), repo: $('c-repo').value.trim(), branch: $('c-branch').value.trim(), token: $('c-token').value.trim() };
    const b = $('b-conectar');
    ocupado(b, true, 'Conectando…');
    try {
      cli = GH.criarCliente(cfg);
      await cli.testar();
      await carregarDados();
      guardar('localStorage', CHAVE, JSON.stringify({ owner: cfg.owner, repo: cfg.repo, branch: cfg.branch }));
      guardar('localStorage', CHAVE + '-token', $('c-lembrar').checked ? cfg.token : null);
      guardar('sessionStorage', CHAVE + '-token', cfg.token);
      $('texto-conexao').textContent = `${cfg.owner}/${cfg.repo} · ${cfg.branch}`;
      $('status-conexao').hidden = false; $('conexao').hidden = true; $('painel-admin').hidden = false;
      aviso('');
      iniciarPainel();
    } catch (err) {
      cli = null; dados = null;
      aviso(err.message || String(err), 'erro');
    } finally { ocupado(b, false); }
  }

  function sair() {
    cli = null; dados = null;
    guardar('localStorage', CHAVE + '-token', null); guardar('sessionStorage', CHAVE + '-token', null);
    $('c-token').value = '';
    $('status-conexao').hidden = true; $('conexao').hidden = false; $('painel-admin').hidden = true;
    aviso('');
  }

  /* ---------- painel ---------- */
  function iniciarPainel() {
    preencherListas();
    montarSeletor();
    novoSemanal();
    decksPend = JSON.parse(JSON.stringify(dados.decksCfg.decks || []));
    renderDecks();
  }

  function preencherListas() {
    const j = $('lista-jogadores'); j.replaceChildren();
    dados.jogadores.forEach((p) => { const o = el('option'); o.value = p.nome; j.append(o); });
    const d = $('lista-decks'); d.replaceChildren();
    (dados.decksCfg.decks || []).forEach((x) => { const o = el('option'); o.value = x.nome.trim(); d.append(o); });
  }

  function montarSeletor(valor) {
    const s = $('sel-semanal'); s.replaceChildren();
    const novo = el('option', '', '＋ Novo evento'); novo.value = ''; s.append(novo);
    [...dados.eventos].sort((a, b) => b.data.localeCompare(a.data)).forEach((e) => {
      const tag = XTCG.ehSemanal(e) ? '' : `[${XTCG.TIPOS[XTCG.tipoDe(e)] || e.tipo}] `;
      const o = el('option', '', `${e.data.slice(8, 10)}/${e.data.slice(5, 7)}/${e.data.slice(0, 4)} · ${tag}${e.nome} (${e.jogadores.length})`);
      o.value = e.data; s.append(o);
    });
    s.value = valor || '';
  }

  /* ---------- semanal: formulário ---------- */
  const vazia = () => ({ nome: '', v: '', d: '', e: '', ow: '', deck: '' });
  const txt = (x) => (x === undefined || x === null ? '' : String(x));

  const rotuloPublicar = () => (editando ? 'Salvar alterações' : $('s-tipo').value === 'semanal' ? 'Publicar semanal' : 'Publicar evento');

  function novoSemanal() {
    editando = null;
    const data = A.quintaSugerida(dados.eventos);
    $('s-tipo').value = 'semanal';
    $('s-data').value = data; $('s-nome').value = A.nomePadrao(data, 'semanal'); $('s-nome').dataset.auto = '1';
    $('s-texto').value = ''; $('colar').open = true; $('b-excluir').hidden = true; $('b-publicar').textContent = rotuloPublicar();
    linhas = []; renderLinhas(); atualizar();
  }

  function carregarSemanal(data) {
    const ev = dados.eventos.find((e) => e.data === data);
    if (!ev) return novoSemanal();
    editando = data;
    $('s-tipo').value = XTCG.tipoDe(ev);
    $('s-data').value = ev.data; $('s-nome').value = ev.nome; delete $('s-nome').dataset.auto;
    const bloco = Decks.lerTexto(dados.decksTxt).blocos.find((b) => b.data === data);
    const chave = XTCG.criarChave(dados.jogadores);
    const porJogador = new Map((bloco ? bloco.linhas : []).map((l) => [chave(l.jogador), l.deck]));
    linhas = ev.jogadores.map((j) => ({
      nome: j.nome, v: txt(j.v), d: txt(j.d), e: txt(j.e), ow: typeof j.ow === 'number' ? j.ow.toFixed(2) : '', deck: porJogador.get(chave(j.nome)) || '',
    }));
    $('colar').open = false; $('b-excluir').hidden = false; $('b-publicar').textContent = rotuloPublicar();
    renderLinhas(); atualizar();
  }

  function renderLinhas() {
    const tb = $('tab-linhas').querySelector('tbody'); tb.replaceChildren();
    linhas.forEach((l, i) => {
      const tr = el('tr');
      tr.append(el('td', 'pos-adm', String(i + 1)));
      const campo = (prop, tipo, extra) => {
        const inp = el('input'); inp.value = l[prop]; inp.autocomplete = 'off';
        Object.assign(inp, extra || {});
        inp.setAttribute('aria-label', `${prop} da posição ${i + 1}`);
        inp.addEventListener('input', () => { l[prop] = inp.value; if (prop === 'deck') marcaDeck(l); atualizar(); });
        return inp;
      };
      const td = (c, ...filhos) => { const t = el('td', c); t.append(...filhos); return t; };
      const nome = campo('nome', 'txt', { placeholder: 'Jogador' }); nome.setAttribute('list', 'lista-jogadores');
      const num = (p) => campo(p, 'num', { inputMode: 'numeric', maxLength: 2, placeholder: p.toUpperCase() });
      const ow = campo('ow', 'num', { inputMode: 'decimal', maxLength: 6, placeholder: 'Opp Win %' });
      const deck = campo('deck', 'txt', { placeholder: 'Deck' }); deck.setAttribute('list', 'lista-decks');
      l.celDeck = el('span', 'deck-adm'); l.celPts = el('td', 'pts-adm');
      tr.append(td('c-nome', nome), td('c-n', num('v')), td('c-n', num('d')), td('c-n', num('e')), td('c-ow', ow), td('c-deck', deck, l.celDeck), l.celPts);
      const acoes = el('td', 'acoes-linha');
      const bt = (t, titulo, fn, desab) => { const b = el('button', 'icone-btn', t); b.type = 'button'; b.title = titulo; b.setAttribute('aria-label', titulo); b.disabled = !!desab; b.addEventListener('click', fn); return b; };
      acoes.append(
        bt('↑', 'Subir', () => mover(i, -1), i === 0),
        bt('↓', 'Descer', () => mover(i, 1), i === linhas.length - 1),
        bt('✕', 'Remover', () => { linhas.splice(i, 1); renderLinhas(); atualizar(); }),
      );
      tr.append(acoes); tb.append(tr);
      marcaDeck(l);
    });
  }

  function mover(i, d) {
    const j = i + d; if (j < 0 || j >= linhas.length) return;
    [linhas[i], linhas[j]] = [linhas[j], linhas[i]]; renderLinhas(); atualizar();
  }

  // Mostra os ícones do deck reconhecido (ou um aviso se o texto não casa com nenhum deck).
  function marcaDeck(l) {
    l.celDeck.replaceChildren();
    const t = l.deck.trim(); if (!t) return;
    const reg = Decks.montarRegistro(dados.decksCfg.decks || []);
    const d = Decks.identificar(t, reg);
    if (!d) { l.celDeck.append(el('span', 'nao-reconhecido', 'não reconhecido')); return; }
    const box = el('span', 'icones');
    d.icones.forEach((s) => box.append(Util.iconeImg(dados.decksCfg, s, d.nome)));
    l.celDeck.append(box); l.celDeck.title = d.nome;
  }

  const numero = (s) => { const t = String(s).trim(); return t === '' ? undefined : Number(t.replace(',', '.')); };

  function lerForm() {
    return {
      data: $('s-data').value, nome: $('s-nome').value, tipo: $('s-tipo').value,
      jogadores: linhas.map((l) => ({ nome: l.nome, v: numero(l.v), d: numero(l.d), e: numero(l.e), ow: numero(l.ow), deck: l.deck })),
    };
  }
  const contexto = () => ({ eventos: dados.eventos, jogadores: dados.jogadores, decksCfg: dados.decksCfg, editando });

  function atualizar() {
    if (!dados) return;
    const sem = lerForm();
    const r = A.validarSemanal(sem, contexto());
    // pontos de cada linha
    const n = linhas.filter((l) => l.nome.trim()).length;
    const idx = new Map();
    dados.jogadores.forEach((j) => [j.nome, ...(j.aliases || [])].forEach((a) => idx.set(XTCG.norm(a), j)));
    let pos = 0;
    linhas.forEach((l) => {
      if (!l.nome.trim()) { l.celPts.textContent = '—'; return; }
      pos++;
      const cad = idx.get(XTCG.norm(l.nome));
      l.celPts.textContent = cad && cad.pontua === false ? 'não pontua' : String(n - pos + 1);
    });

    const prob = $('problemas'); prob.replaceChildren();
    const itens = [...r.erros.map((t) => ['erro', t]), ...r.avisos.map((t) => ['aviso', t])];
    itens.forEach(([c, t]) => prob.append(el('p', c, t)));
    prob.hidden = !itens.length;

    renderNovos(r.novos);
    $('b-publicar').disabled = r.erros.length > 0;
    renderPrevia(sem, r);
  }

  const recusados = new Set();   // nomes novos que a pessoa desmarcou (por padrão, todos são cadastrados)
  let novosAtuais = [];
  function renderNovos(novos) {
    novosAtuais = novos;
    const box = $('novos'); box.replaceChildren();
    if (!novos.length) { box.hidden = true; return; }
    box.append(el('p', 'dica', 'Estes nomes ainda não estão em jogadores.json. Marcados serão cadastrados (sem cadastro eles pontuam do mesmo jeito, mas ficam sem apelidos):'));
    novos.forEach((nm) => {
      const lab = el('label', 'marcar'); const c = el('input'); c.type = 'checkbox'; c.checked = !recusados.has(nm);
      c.addEventListener('change', () => { c.checked ? recusados.delete(nm) : recusados.add(nm); });
      lab.append(c, ' ' + nm); box.append(lab);
    });
    box.hidden = false;
  }

  function renderPrevia(sem, r) {
    const ol = $('previa-lista'); ol.replaceChildren();
    if (sem.tipo !== 'semanal') {
      ol.append(el('li', 'dica', 'Este evento não conta no Líder de Ginásio: ele aparece só na aba Especiais.')); return;
    }
    if (!A.dataValida(sem.data) || r.erros.some((e) => /Data inválida|Dê um nome|pelo menos/.test(e))) {
      ol.append(el('li', 'dica', 'Preencha data, nome e pelo menos 2 jogadores para ver a prévia.')); return;
    }
    const hip = A.aplicarSemanal(sem, { ...dados, eventos: dados.eventos }, { editando }).eventos.filter(XTCG.ehSemanal);
    const mes = sem.data.slice(0, 7);
    const { tabela } = XTCG.calcular(hip.filter((e) => Util.mesDe(e.data) === mes), dados.jogadores);
    const total = Util.totalSemanais(hip, mes);
    tabela.slice(0, 8).forEach((t, i) => {
      const li = el('li');
      li.append(el('span', 'p-pos', `${i + 1}º`), el('span', 'p-nome', t.nome), el('span', 'p-pts', `${t.desempenho} pts`), el('span', 'p-part', `${t.participacao}/${total}`));
      ol.append(li);
    });
  }

  async function publicarSemanal() {
    const b = $('b-publicar');
    ocupado(b, true, 'Publicando…');
    try {
      await carregarDados();                       // sempre sobre a versão mais nova do repositório
      const sem = lerForm();
      const r = A.validarSemanal(sem, contexto());
      if (r.erros.length) { atualizar(); throw new Error(r.erros[0]); }
      const cadastrar = r.novos.filter((x) => !recusados.has(x));
      const out = A.aplicarSemanal(sem, dados, { editando, cadastrar });
      const nomeEv = sem.nome.trim();
      const msg = `${editando ? 'Atualiza' : 'Adiciona'} ${nomeEv} (${sem.data})`;
      await cli.publicar(out.arquivos, msg);
      await carregarDados();
      preencherListas(); montarSeletor(sem.data); carregarSemanal(sem.data);
      aviso(`Publicado: ${nomeEv}. O site atualiza em cerca de 1 minuto (o GitHub Pages precisa reconstruir).`, 'ok');
    } catch (err) { aviso(err.message || String(err), 'erro'); }
    finally { ocupado(b, false); b.textContent = rotuloPublicar(); atualizar(); }
  }

  async function excluirSemanal() {
    if (!editando) return;
    if (!window.confirm(`Excluir o semanal de ${editando}? Isso também remove os decks dele e muda a classificação.`)) return;
    const b = $('b-excluir');
    ocupado(b, true, 'Excluindo…');
    try {
      const alvo = editando;
      await carregarDados();
      const out = A.removerSemanal(alvo, dados);
      await cli.publicar(out.arquivos, `Remove semanal ${alvo}`);
      await carregarDados();
      montarSeletor(); novoSemanal();
      aviso(`Semanal de ${alvo} excluído.`, 'ok');
    } catch (err) { aviso(err.message || String(err), 'erro'); }
    finally { ocupado(b, false); }
  }

  function importar() {
    const { linhas: novas, erros } = A.lerResultados($('s-texto').value);
    if (erros.length) { aviso(erros.join(' '), 'erro'); return; }
    if (!novas.length) { aviso('Cole ao menos uma linha de resultado.', 'erro'); return; }
    aviso('');
    const antigos = new Map(linhas.map((l) => [XTCG.norm(l.nome), l.deck]));
    linhas = novas.map((j) => ({ nome: j.nome, v: txt(j.v), d: txt(j.d), e: txt(j.e), ow: typeof j.ow === 'number' ? j.ow.toFixed(2) : '', deck: antigos.get(XTCG.norm(j.nome)) || '' }));
    $('colar').open = false; renderLinhas(); atualizar();
  }

  /* ---------- decks ---------- */
  const lista = (s) => String(s).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  const slug = (s) => lista(s).map((x) => x.toLowerCase().replace(/\s+/g, '-').replace(/\.png$/, ''));

  function renderDecks() {
    const tb = $('tab-decks').querySelector('tbody'); tb.replaceChildren();
    decksPend.forEach((d, i) => {
      const tr = el('tr');
      const nome = el('td', 'esq');
      const box = el('span', 'icones');
      (d.icones || []).forEach((s) => box.append(Util.iconeImg(dados.decksCfg, s, '')));
      nome.append(box, el('span', 'nome-deck', d.nome.trim()));
      const pal = el('td', 'esq dica', [...(d.palavras || []), ...(d.aliases || [])].join(', '));
      const ac = el('td', 'acoes-linha');
      const bt = (t, fn, perigo) => { const b = el('button', 'btn btn-mini' + (perigo ? ' btn-perigo' : ' btn-sec'), t); b.type = 'button'; b.addEventListener('click', fn); return b; };
      ac.append(bt('Editar', () => editarDeck(i)), bt('Excluir', () => { if (window.confirm(`Excluir o deck "${d.nome.trim()}"?`)) { decksPend.splice(i, 1); if (decksEditando === i) cancelarDeck(); renderDecks(); } }, true));
      tr.append(nome, pal, ac); tb.append(tr);
    });
    $('b-publicar-decks').disabled = JSON.stringify(decksPend) === JSON.stringify(dados.decksCfg.decks || []);
  }

  function editarDeck(i) {
    const d = decksPend[i]; decksEditando = i;
    $('d-nome').value = d.nome.trim(); $('d-icones').value = (d.icones || []).join(', ');
    $('d-palavras').value = (d.palavras || []).join(', '); $('d-aliases').value = (d.aliases || []).join(', ');
    $('titulo-deck').textContent = `Editando: ${d.nome.trim()}`; $('b-salvar-deck').textContent = 'Atualizar na lista'; $('b-cancelar-deck').hidden = false;
    previaIcones(); $('d-nome').focus();
  }
  function cancelarDeck() {
    decksEditando = -1; $('form-deck').reset();
    $('titulo-deck').textContent = 'Novo deck'; $('b-salvar-deck').textContent = 'Adicionar à lista'; $('b-cancelar-deck').hidden = true; previaIcones();
  }
  function previaIcones() {
    const box = $('d-previa'); box.replaceChildren();
    slug($('d-icones').value).forEach((s) => box.append(Util.iconeImg(dados.decksCfg, s, s)));
  }
  function salvarDeck(e) {
    e.preventDefault();
    const nome = $('d-nome').value.trim();
    const icones = slug($('d-icones').value);
    let palavras = lista($('d-palavras').value);
    if (!palavras.length) palavras = [...new Set(icones.flatMap((s) => s.split('-')))];
    const aliases = lista($('d-aliases').value);
    if (!nome) return;
    if (!icones.length && !palavras.length) { aviso('Informe pelo menos um ícone ou uma palavra de reconhecimento.', 'erro'); return; }
    const outro = decksPend.findIndex((d, i) => i !== decksEditando && Decks.norm(d.nome) === Decks.norm(nome));
    if (outro >= 0) { aviso(`Já existe um deck chamado "${nome}".`, 'erro'); return; }
    const deck = { nome, icones, palavras, ...(aliases.length ? { aliases } : {}) };
    if (decksEditando >= 0) decksPend[decksEditando] = deck; else decksPend.push(deck);
    aviso(''); cancelarDeck(); renderDecks();
  }
  async function publicarDecks() {
    const b = $('b-publicar-decks');
    ocupado(b, true, 'Publicando…');
    try {
      const novaCfg = { ...dados.decksCfg, decks: decksPend };
      await cli.publicar({ 'decks.json': A.serializarDecks(novaCfg) }, 'Atualiza a lista de decks');
      await carregarDados();
      preencherListas(); renderLinhas(); atualizar();
      decksPend = JSON.parse(JSON.stringify(dados.decksCfg.decks || [])); renderDecks();
      aviso('Decks publicados. O site atualiza em cerca de 1 minuto.', 'ok');
    } catch (err) { aviso(err.message || String(err), 'erro'); }
    finally { ocupado(b, false); renderDecks(); }
  }

  /* ---------- abas ---------- */
  function aba(qual) {
    const sem = qual === 'semanal';
    $('aba-semanal').setAttribute('aria-selected', String(sem)); $('aba-decks').setAttribute('aria-selected', String(!sem));
    $('sec-semanal').hidden = !sem; $('sec-decks').hidden = sem;
  }

  /* ---------- ligações ---------- */
  Util.avisarSeSemEstilo();
  preencherConexao();
  $('form-conexao').addEventListener('submit', conectar);
  $('sair').addEventListener('click', sair);
  $('aba-semanal').addEventListener('click', () => aba('semanal'));
  $('aba-decks').addEventListener('click', () => aba('decks'));
  $('sel-semanal').addEventListener('change', (e) => (e.target.value ? carregarSemanal(e.target.value) : novoSemanal()));
  const nomeAuto = () => {
    const n = $('s-nome');
    if (n.dataset.auto && A.dataValida($('s-data').value)) n.value = A.nomePadrao($('s-data').value, $('s-tipo').value);
  };
  $('s-data').addEventListener('input', () => { nomeAuto(); atualizar(); });
  $('s-tipo').addEventListener('change', () => {
    const n = $('s-nome');
    if (!editando && !n.value.trim()) n.dataset.auto = '1';
    nomeAuto();
    if (!editando && $('s-tipo').value !== 'semanal' && n.dataset.auto) n.placeholder = 'Ex.: Halloween 2026';
    $('b-publicar').textContent = rotuloPublicar();
    atualizar();
  });
  $('s-nome').addEventListener('input', () => { delete $('s-nome').dataset.auto; atualizar(); });
  $('b-add').addEventListener('click', () => { linhas.push(vazia()); renderLinhas(); atualizar(); const ins = $('tab-linhas').querySelectorAll('tbody tr:last-child input'); if (ins[0]) ins[0].focus(); });
  $('b-importar').addEventListener('click', importar);
  $('b-publicar').addEventListener('click', publicarSemanal);
  $('b-excluir').addEventListener('click', excluirSemanal);
  $('form-deck').addEventListener('submit', salvarDeck);
  $('b-cancelar-deck').addEventListener('click', cancelarDeck);
  $('d-icones').addEventListener('input', previaIcones);
  $('b-publicar-decks').addEventListener('click', publicarDecks);
})();
