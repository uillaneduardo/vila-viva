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
- Persistência de simulações compartilhadas no servidor: snapshot JSON atômico em volume Docker; legado local apenas como fallback quando a API não está disponível

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

O acesso local é pela porta 8481 (loopback). Configurar Cloudflare Tunnel com hostname `vila-viva-svr2.ulln.com.br` apontando para `http://localhost:8481` no próprio homelab2. O runner precisa poder executar Docker, autenticar-se no GHCR (pacote público ou login autorizado) e estar sob controle do operador. **Deploy não estará ativo até o runner ser configurado e o primeiro job concluir.**

## Arquitetura
A versão atual já executa o motor em um serviço Node.js dedicado no homelab2, usando regras de app.js/lab.js em contextos isolados por mundo. O processo executa ticks sem navegador conectado e salva cada mundo em /data (volume Docker simulation-data); a interface consulta /api/simulations. No modo de desenvolvimento local estático sem backend, a UI ainda permite usar o laboratório legado no navegador. PostgreSQL, WebSocket, autenticação e multiplayer ficam para etapas futuras.

Veja `docs/GAME_DESIGN.md` para conceitos, regras e evolução.

## Laboratório visual (primeira entrega da issue #2)

O mapa continua sendo uma partida local observável no navegador. Na seção **Laboratório ao vivo**, é possível:
- Clicar em um NPC para ver energia, fome, sono, carga, tarefas, entregas, interrupções e última decisão registrada.
- Selecionar uma fonte no mapa para ver quantidade restante e taxa de regeneração, ou o depósito para conferir ocupação por peso.
- Selecionar o quadro comunitário (ícone 📋) e observar demandas gerais. A consulta/registro físico por NPCs ainda não está implementada.
- Usar **Zoom +/−**, roda do mouse e arrastar o mapa; **Seguir NPC** centraliza a visualização no NPC selecionado.
- Aplicar cenários de escassez de alimento, floresta exaurida, depósito cheio e exaustão.
- Exportar o estado, a semente, os registros de decisões e as métricas em JSON para inspecionar resultados.

As fontes naturais sempre permanecem no mapa e se regeneram com o tempo de mundo, mesmo depois de exauridas. A produção normal é suspensa quando não existe espaço de destino. Os NPCs podem reagir à fome e à necessidade de sono; a alimentação reduz fisicamente o estoque quando o alimento é retirado.

### Testes
```bash
node --check app.js
node --check lab.js
node --test tests/lab.test.cjs
```

### Escopo ainda pendente
Esta primeira entrega **não** conclui as etapas E0–E6. A issue #2 mantém o plano para inventários completos por peso, ferramentas físicas, depósitos múltiplos, pilhas recuperáveis, memória individual/esquecimento, quadro com comunicação física, sistema genérico de ações, rotas com obstáculos, canteiros automáticos, painel histórico avançado, exportação CSV e benchmarks. O motor segue local no navegador, sem multiplayer. A UI deve ser homologada visualmente depois do deploy.


## Simulador persistente (issue #8)

- Dois serviços no Docker Compose: `web` (Nginx, proxy `/api/`) e `api` (Node.js com relógio próprio).
- O backend persiste cada mundo em `/data/<uuid>.json` com escrita e renomeação atômicas. O volume `simulation-data` não é removido pelo deploy normal.
- URL pública: `https://vila-viva-svr2.ulln.com.br/`. Use o seletor superior para navegar, criar, renomear e excluir simulações.
- Todos os mundos ativos avançam independentemente de abas ou usuários conectados. Velocidades por mundo: 0/1/5/20/100x. O tempo de indisponibilidade do servidor **não** é recuperado retroativamente.
- No modo observador o personagem não é controlável. Clique nos NPCs, canteiro ou depósito para inspecionar. Use **Intervir no mundo** para colocar uma fonte natural pelo mapa.
- A API de laboratório não possui contas ou permissões: não utilize em uma instância pública com mundos sensíveis ou usuários não confiáveis.
- Simulações legadas no `localStorage` não são importadas automaticamente. Mantenha backup/exportação antes de migrações futuras.

### API
`GET /api/simulations`, `POST /api/simulations`, `GET/PATCH/DELETE /api/simulations/:id`, `POST /api/simulations/:id/commands` (`pause`, `speed`, `event`, `scenario`, `source`, `nextday`). O navegador atualiza o estado por consulta periódica; a emissão incremental de diffs fica para a próxima etapa.

### Teste da persistência
`node --test tests/lab.test.cjs tests/server.test.cjs`. O teste sobe um processo real, cria dois mundos, confirma avanços sem cliente, pausa um mundo, adiciona fonte, reinicia o processo e valida recuperação do snapshot.
