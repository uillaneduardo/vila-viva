# Arquivo da implementação anterior (antes da vNext)

Esta pasta preserva o conteúdo **exato** do antigo topo da branch `main` antes da migração para vNext, incluindo `Dockerfile`, `compose.yml`, o servidor, a interface, os testes e `.github/workflows/deploy.yml`. Os caminhos dentro dos arquivos são históricos e pressupõem que o diretório `.old/` seja tratado como a raiz do projeto legado.

O projeto antigo não é compilado nem publicado pelos workflows ativos da nova raiz. Os volumes do Docker e dados dos mundos existentes no homelab2 não foram tocados por esta migração de código.

Para rodar o legado novamente, use uma cópia isolada desta pasta ou um commit histórico, e configure seus volumes externamente. Não religar o deploy legado sem revisar a migração de ambiente.
