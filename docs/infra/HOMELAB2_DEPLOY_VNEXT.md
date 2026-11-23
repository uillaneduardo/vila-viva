# Oturo vNext — deploy de homologação no homelab2

## Endereços
- Jogo (player): https://vila-viva-svr2.ulln.com.br/
- Modo Deus (sem autenticação): https://vila-viva-svr2.ulln.com.br/admin
- Galeria dos sprites: https://vila-viva-svr2.ulln.com.br/apps/player-web/assets-preview.html
- Healthcheck local: http://127.0.0.1:8481/healthz
- Revisão implantada: https://vila-viva-svr2.ulln.com.br/version.txt

## Deploy e isolamento
O workflow `.github/workflows/vnext-ci.yml` valida os testes e a imagem Docker, publica uma tag imutável `ghcr.io/uillaneduardo/vila-viva:vnext-sha-<SHA>`, e executa `infra/deploy-vnext.sh` no runner `[self-hosted, linux, x64, vila-viva-svr2]`.
Reutiliza o diretório `/home/uillan/homelab2/apps/vila-viva`, o arquivo `.deploy/compose.yml` e o nome do serviço `web` da versão anterior. Esse detalhe é obrigatório para substituir o serviço que atende a porta 8481, sem criar stack conflitante.
`docker compose up -d --no-deps web` não remove `api` legado nem volumes de simulação. NÃO executar `docker compose down -v`, `docker volume prune` nem `--remove-orphans`.
O `compose.previous.yml` guarda o Compose anterior. O arquivo `.release.svr2.env` contém apenas tag e SHA validados, sem segredos.

## Verificação
No GitHub Actions, aguardar `foundation`, `image_smoke`, `publish`, `deploy_homelab2`. O último job confere a URL pública e o atlas PNG. Se o job ficar `queued` muito tempo, verificar se o runner tem a label `vila-viva-svr2` e está online.
No homelab2:
```bash
cd /home/uillan/homelab2/apps/vila-viva
docker compose -f .deploy/compose.yml ps
curl -fsS http://127.0.0.1:8481/version.txt
curl -fsS http://127.0.0.1:8481/healthz
curl -I http://127.0.0.1:8481/assets/world/vegetation/apple_tree_atlas_96.png
```
O Cloudflare Tunnel existente deve continuar direcionado a `http://localhost:8481` NO homelab2.

## Segurança e limites
**Exceção explícita de homologação:** a interface e os endpoints administrativos não têm autenticação, mesmo com HTTPS. Um endereço difícil de adivinhar NÃO protege o ambiente: scanners e qualquer usuário com o link podem controlar a simulação. Recomendação: adicionar Cloudflare Access ou restrições de acesso assim que possível. A porta no host permanece vinculada a 127.0.0.1 para evitar exposição direta de Docker.
A simulação vNext é um protótipo em memória; reiniciar ou atualizar o container zera o mundo. Volumes antigos são preservados, mas **a nova aplicação não migra automaticamente seus dados**.
O pipeline preserva a infraestrutura antiga para rollback. A arte mostra árvores de alimento de forma temporária até haver espécies reais e estados de crescimento.
