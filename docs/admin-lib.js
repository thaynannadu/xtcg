/* Funções puras da área de administração: gerar os arquivos de dados no mesmo formato
   que já usamos e validar um semanal antes de publicar.
   Funciona no navegador (window.AdminLib) e no Node (require). */
(function (root) {
  const XTCG = root.XTCG || (typeof require !== 'undefined' ? require('./calc.js') : null);
  const Decks = root.Decks || (typeof require !== 'undefined' ? require('./decks.js') : null);

  const q = (s) => JSON.stringify(String(s));
  const lista = (a) => `[${(a || []).map(q).join(', ')}]`;
  const ehNum = (x) => typeof x === 'number' && Number.isFinite(x);

  // ---------- eventos.json ----------
  function linhaJogador(j) {
    if (typeof j === 'string') j = { nome: j };
    const p = [`"nome": ${q(j.nome)}`];
    if (ehNum(j.v)) p.push(`"v": ${j.v}`);
    if (ehNum(j.d)) p.push(`"d": ${j.d}`);
    if (ehNum(j.e)) p.push(`"e": ${j.e}`);
    if (ehNum(j.ow)) p.push(`"ow": ${j.ow.toFixed(2)}`);
    return `      { ${p.join(', ')} }`;
  }
  function serializarEventos(eventos) {
    const lista = [...eventos].sort((a, b) => a.data.localeCompare(b.data));
    const corpo = lista.map((e) =>
      `  {\n    "data": ${q(e.data)},\n    "nome": ${q(e.nome)},\n${e.tipo && e.tipo !== 'semanal' ? `    "tipo": ${q(e.tipo)},\n` : ''}    "jogadores": [\n${e.jogadores.map(linhaJogador).join(',\n')}\n    ]\n  }`);
    return `[\n${corpo.join(',\n')}\n]\n`;
  }

  // ---------- jogadores.json ----------
  // Acrescenta jogadores novos no fim do arquivo sem reformatar o resto.
  function acrescentarJogadores(texto, nomes) {
    if (!nomes.length) return texto;
    const fim = texto.lastIndexOf(']');
    const antes = texto.slice(0, fim).trimEnd();
    const novos = nomes.map((n) => `  { "nome": ${q(n)} }`).join(',\n');
    return `${antes},\n${novos}\n]\n`;
  }

  // ---------- decks.json ----------
  function linhaDeck(d) {
    const p = [`"nome": ${q(d.nome)}`, `"icones": ${lista(d.icones)}`, `"palavras": ${lista(d.palavras)}`];
    if (d.aliases && d.aliases.length) p.push(`"aliases": ${lista(d.aliases)}`);
    return `    { ${p.join(', ')} }`;
  }
  function serializarDecks(cfg) {
    const cab = Object.keys(cfg).filter((k) => k !== 'decks').map((k) => `  ${q(k)}: ${JSON.stringify(cfg[k])}`);
    return `{\n${cab.join(',\n')},\n  "decks": [\n${(cfg.decks || []).map(linhaDeck).join(',\n')}\n  ]\n}\n`;
  }

  // ---------- decks.txt ----------
  const ehCabecalho = (l) => l.trim().startsWith('#');
  function acharBloco(linhas, data) {
    let ini = -1;
    for (let i = 0; i < linhas.length; i++) {
      if (ehCabecalho(linhas[i]) && Decks.dataDe(linhas[i]) === data) { ini = i; break; }
    }
    if (ini < 0) return null;
    let fim = linhas.length;
    for (let i = ini + 1; i < linhas.length; i++) if (ehCabecalho(linhas[i])) { fim = i; break; }
    return { ini, fim };
  }
  // Troca (ou cria, ou apaga se vier vazio) o bloco de uma data, sem mexer no resto do arquivo.
  function definirBlocoDecks(texto, data, registros) {
    const linhas = String(texto).replace(/\r\n/g, '\n').split('\n');
    const novo = registros.length ? [`#${data}`, ...registros.map((r) => `${r.jogador}: ${r.deck}`)] : [];
    const achou = acharBloco(linhas, data);
    if (achou) {
      const temProximo = achou.fim < linhas.length;
      linhas.splice(achou.ini, achou.fim - achou.ini, ...(novo.length ? [...novo, ...(temProximo ? [''] : [])] : []));
    } else if (novo.length) {
      while (linhas.length && !linhas[linhas.length - 1].trim()) linhas.pop();
      linhas.push('', ...novo);
    }
    while (linhas.length && !linhas[linhas.length - 1].trim()) linhas.pop();
    return linhas.join('\n') + '\n';
  }

  // ---------- colar resultados ----------
  // Aceita "1. Nome 3-1-0 62.5%", "Nome 3-1-0 62,5", "Nome<TAB>3<TAB>1<TAB>0<TAB>62.5" ou só o nome.
  function lerResultados(texto) {
    const linhas = [], erros = [];
    const num = (s) => Number(String(s).replace(',', '.'));
    String(texto).split(/\r?\n/).forEach((bruta, i) => {
      let l = bruta.trim();
      if (!l || l.startsWith('//') || l.startsWith('#')) return;
      l = l.replace(/^\d+\s*[º°.)\-:]\s*/, '');
      let m = l.match(/^(.*?)[\s\t]+(\d+)\s*[-–/x]\s*(\d+)(?:\s*[-–/x]\s*(\d+))?(?:[\s\t]+([\d.,]+)\s*%?)?$/i)
        || l.match(/^(.*?)\t+(\d+)\t+(\d+)\t+(\d+)(?:\t+([\d.,]+)\s*%?)?$/);
      if (m && m[1].trim()) {
        const ow = m[5] !== undefined ? num(m[5]) : undefined;
        linhas.push({ nome: m[1].trim(), v: Number(m[2]), d: Number(m[3]), e: m[4] !== undefined ? Number(m[4]) : 0, ow: Number.isFinite(ow) ? ow : undefined });
      } else if (/^[^\d].*$/.test(l) && !/\d/.test(l)) {
        linhas.push({ nome: l });
      } else erros.push(`Linha ${i + 1}: não entendi "${bruta.trim()}". Use "Nome 3-1-0 62,5".`);
    });
    return { linhas, erros };
  }

  // ---------- datas ----------
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // Sugere a quinta-feira mais recente (hoje, se for quinta) que ainda não tem semanal.
  function quintaSugerida(eventos, hoje = new Date()) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    d.setDate(d.getDate() - ((d.getDay() - 4 + 7) % 7));
    const usadas = new Set(eventos.map((e) => e.data));
    while (usadas.has(iso(d))) d.setDate(d.getDate() + 7);
    return iso(d);
  }
  const nomePadrao = (data, tipo) => (!tipo || tipo === 'semanal' ? `Torneio semanal ${data.slice(8, 10)}.${data.slice(5, 7)}.${data.slice(2, 4)}` : '');
  const TIPOS_VALIDOS = ['semanal', 'especial', 'cup', 'challenge'];
  const dataValida = (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };

  // ---------- validação ----------
  // semanal = { data, nome, jogadores: [{nome, v, d, e, ow, deck}] }
  // contexto = { eventos, jogadores, editando: data|null }
  function validarSemanal(sem, ctx) {
    const erros = [], avisos = [];
    if (!dataValida(sem.data)) erros.push('Data inválida.');
    else if (ctx.eventos.some((e) => e.data === sem.data && e.data !== ctx.editando)) erros.push(`Já existe um evento em ${sem.data}. Escolha-o na lista para editar (hoje só cabe um evento por dia).`);
    if (sem.tipo && !TIPOS_VALIDOS.includes(sem.tipo)) erros.push(`Tipo de evento inválido: ${sem.tipo}.`);
    if (!String(sem.nome || '').trim()) erros.push('Dê um nome ao evento.');
    const lista = sem.jogadores.filter((j) => String(j.nome || '').trim());
    if (lista.length < 2) erros.push('Informe pelo menos 2 jogadores.');
    const chave = XTCG.criarChave(ctx.jogadores);
    const vistos = new Map();
    lista.forEach((j, i) => {
      const c = chave(j.nome);
      if (vistos.has(c)) erros.push(`"${j.nome}" aparece duas vezes (posições ${vistos.get(c)} e ${i + 1}).`);
      else vistos.set(c, i + 1);
      for (const k of ['v', 'd', 'e']) if (j[k] !== undefined && (!Number.isInteger(j[k]) || j[k] < 0)) erros.push(`${j.nome}: "${k.toUpperCase()}" deve ser um inteiro ≥ 0.`);
      if (j.ow !== undefined && !(ehNum(j.ow) && j.ow >= 0 && j.ow <= 100)) erros.push(`${j.nome}: Opp Win deve estar entre 0 e 100.`);
    });
    const registro = Decks.montarRegistro((ctx.decksCfg && ctx.decksCfg.decks) || []);
    lista.forEach((j) => { if (j.deck && !Decks.identificar(j.deck, registro)) avisos.push(`Deck não reconhecido para ${j.nome}: "${j.deck}" (cadastre-o na aba Decks para aparecer o ícone).`); });
    const cad = new Set();
    ctx.jogadores.forEach((j) => [j.nome, ...(j.aliases || [])].forEach((n) => cad.add(XTCG.norm(n))));
    const novos = lista.map((j) => j.nome.trim()).filter((n, i, a) => !cad.has(XTCG.norm(n)) && a.findIndex((x) => XTCG.norm(x) === XTCG.norm(n)) === i);
    return { erros, avisos, novos };
  }

  // Aplica o semanal sobre os dados atuais e devolve os novos textos de cada arquivo.
  function aplicarSemanal(sem, dados, opcoes) {
    const o = Object.assign({ editando: null, cadastrar: [] }, opcoes);
    const lista = sem.jogadores.filter((j) => String(j.nome || '').trim());
    const ev = {
      data: sem.data, nome: sem.nome.trim(),
      ...(sem.tipo && sem.tipo !== 'semanal' ? { tipo: sem.tipo } : {}),
      jogadores: lista.map((j) => {
        const p = { nome: j.nome.trim() };
        for (const k of ['v', 'd', 'e', 'ow']) if (j[k] !== undefined) p[k] = j[k];
        return p;
      }),
    };
    const eventos = dados.eventos.filter((e) => e.data !== (o.editando || sem.data)).concat(ev);
    let decksTxt = dados.decksTxt;
    if (o.editando && o.editando !== sem.data) decksTxt = definirBlocoDecks(decksTxt, o.editando, []);
    decksTxt = definirBlocoDecks(decksTxt, sem.data, lista.filter((j) => j.deck && j.deck.trim()).map((j) => ({ jogador: j.nome.trim(), deck: j.deck.trim() })));
    return {
      eventos,
      arquivos: {
        'eventos.json': serializarEventos(eventos),
        'decks.txt': decksTxt,
        ...(o.cadastrar.length ? { 'jogadores.json': acrescentarJogadores(dados.jogadoresTxt, o.cadastrar) } : {}),
      },
    };
  }

  function removerSemanal(data, dados) {
    const eventos = dados.eventos.filter((e) => e.data !== data);
    return { eventos, arquivos: { 'eventos.json': serializarEventos(eventos), 'decks.txt': definirBlocoDecks(dados.decksTxt, data, []) } };
  }

  const API = { serializarEventos, serializarDecks, acrescentarJogadores, definirBlocoDecks, lerResultados, quintaSugerida, nomePadrao, dataValida, validarSemanal, aplicarSemanal, removerSemanal };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AdminLib = API;
})(typeof window !== 'undefined' ? window : globalThis);
