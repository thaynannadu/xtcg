# Administração do site

**Status: implementado** em `docs/admin.html` (ver README, seção "Administração").

Escolha feita: página de admin no navegador que grava no repositório pela API do GitHub com um token *fine-grained* (só este repositório, `Contents: Read and write`). Cada ação vira um único commit.

## Alternativas consideradas
- Formulário de Issue + GitHub Action que abre um PR (mais seguro, sem token no navegador, porém com mais passos).
- Admin local que só gera os JSONs para commit manual.

## Próximos passos
Ver `ROADMAP.md` (perfil do jogador, gerenciar jogadores, etc.).
