# Vila Viva 🌿

Protótipo de RPG e simulador de assentamento medieval colaborativo. Interface web sem login para experimentar NPCs, recursos, blueprints, velocidade do mundo e eventos.

## Funcionalidades do protótipo v0.1
- Criar, escolher, renomear e apagar assentamentos locais independentes
- Mapa 2D em canvas com estética pixel art procedural (sem assets externos)
- Seis NPCs especializados: líder, coletor, fazendeiro, pedreiro, construtor e mercador
- Motor determinístico por ticks com estoque central, fome/energia, prioridades e produção
- Pontos de coleta, vagas limitadas e animações de trabalho
- Construção comunitária de casas por entregas de recursos e trabalho
- Tempo 0x, 1x, 5x, 20x, 100x e avanço manual de um dia
- Eventos aleatórios e eventos manuais (seca, colheita, caravana, tempestade, animais)
- Logs e inspeção do estado para homologação
- Persistência de testes por localStorage (não compartilhada entre navegadores)

## Uso local
Abra `index.html` no navegador ou execute `python3 -m http.server 8080` no diretório e acesse http://localhost:8080.

## Deploy
A imagem estática utiliza nginx na porta interna 80. O workflow em `.github/workflows/deploy.yml` publica no GHCR e pode disparar deploy no runner **self-hosted homelab2**, após runner com labels `self-hosted, linux, x64, homelab2` estar disponível e diretório preparado.

```bash
mkdir -p ~/homelab2/apps/vila-viva
cd ~/homelab2/apps/vila-viva
curl -fsSLo compose.yml https://raw.githubusercontent.com/uillaneduardo/vila-viva/main/compose.yml
echo 'IMAGE=ghcr.io/uillaneduardo/vila-viva:main' > .env
docker compose pull && docker compose up -d
```

O acesso local é pela porta 8480 (loopback). Configurar Cloudflare Tunnel ou proxy para `http://localhost:8480` no próprio homelab2. O runner precisa poder executar Docker, autenticar-se no GHCR (pacote público ou login autorizado) e estar sob controle do operador. **Deploy não estará ativo até o runner ser configurado e o primeiro job concluir.**

## Arquitetura
O protótipo mantém a simulação no navegador. A futura versão multiplayer moverá o motor para um processo autoritativo e armazenará o estado no PostgreSQL. Eventos de tempo e mutações econômicas não podem ser confiados ao cliente na versão online.

Veja `docs/GAME_DESIGN.md` para conceitos, regras e evolução.
