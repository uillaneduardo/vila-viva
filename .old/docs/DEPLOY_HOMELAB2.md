# Deploy no homelab2

## Arquitetura
Workflow push main → verify (Ubuntu 24.04) → build e push GHCR tag sha-<commit> → runner dedicado homelab2 → ação local baseada no padrão engineering → Compose em `/home/uillan/homelab2/apps/vila-viva` → healthcheck loopback 8481.

## Preparação (uma vez)
1. GitHub Settings > Actions > Runners: cadastrar runner self-hosted exclusivo ou configurado com label adicional **vila-viva-svr2**, além de self-hosted/linux/x64. O runner deve ser executado no homelab2.
2. Garantir que o runner possua acesso controlado ao Docker e que o GitHub Actions tenha acesso à ação local versionada em `.github/actions/ghcr-compose-deploy`.
3. Criar `/home/uillan/homelab2/apps/vila-viva` com propriedade/permissões adequadas ao serviço do runner. A ação criará `.deploy/compose.yml`.
4. Verificar se a porta **8481** está livre. Hostname oficial: `vila-viva-svr2.ulln.com.br`. Configurar Cloudflare Tunnel nesse hostname com serviço HTTP `http://localhost:8481` no homelab2. Não apontar o tunnel para um servidor diferente.
5. Garantir acesso do workflow ao GHCR e visibilidade adequada do pacote. Nenhuma chave SSH pessoal ou PAT permanente deve ser necessária.
6. Fazer push na main e acompanhar os jobs verify, publish e deploy_homelab2. O deploy só roda no runner cuja label coincide com a exigida.

## Operação
```bash
cd /home/uillan/homelab2/apps/vila-viva
docker compose -f .deploy/compose.yml ps
curl -fsS http://127.0.0.1:8481/healthz
cat .release.svr2.env
```
O compose recebe `IMAGE_TAG=sha-<SHA>` da ação de deploy; não alterar a versão manualmente para `latest`.

## Observações
O protótipo usa localStorage: dados de teste não são compartilhados, nem persistem no servidor. Atualizar a imagem não apaga o localStorage no mesmo navegador/origem, mas uma mudança de domínio pode parecer um mundo vazio. Fazer exportação/importação antes de uso sério (funcionalidade futura).

## Segurança
O runner de deploy nunca deve executar conteúdo de PR externo; a publicação e o deploy se limitam a push validado de main. Acesso Docker ao runner equivale a permissões elevadas: isolar o runner. HTTPS fica no proxy/tunnel. A ação de deploy é versionada localmente em `.github/actions/ghcr-compose-deploy`.
