# Catálogo de elementos e componentes — G0.4

## Princípio
**Entidade** é uma instância com ID e estado no mundo; **definição de conteúdo** é o tipo/preset que a configura; **componente** descreve propriedades; **sistema** implementa regras; **ação** é um contrato validado do domínio; **renderer** apenas representa os resultados. Jogador e admin não definem gameplay em seus componentes de UI.

## Catálogo inicial e estado de implementação

| Entidade | Identificador de conteúdo | Componentes essenciais | Ações físicas / admin | Estado |
|---|---|---|---|---|
| Pessoa (jogador/NPC) | character.human | identity, position, ownership, health, energy, needs, inventory, movement | move, eat, rest / spawn, inspect | somente spawn/move básicos |
| Fonte madeira | resource.wood | position, resourceSource, regeneration | harvest / spawn, adjust | somente spawn |
| Fonte comida | resource.food | position, resourceSource, regeneration | harvest / spawn, adjust | somente spawn |
| Fonte pedra | resource.stone | position, resourceSource, regeneration | harvest / spawn, adjust | somente spawn |
| Pilha de itens | item.stack | position, inventory | pickup/drop / spawn | apenas metadados |
| Depósito | storage.depot | position, storage, inventory | deposit/withdraw / configure | apenas metadados |
| Canteiro | construction.site | position, construction, inventory | deliver/work / place | apenas metadados |

## Componentes e dados
- `position`: coordenadas; `identity`: nome e identificador.
- `ownership`: vínculo do personagem com jogador (não substitui autenticação).
- `health/energy/needs`: estado vital e necessidade.
- `inventory`: itens e limite de massa, sem créditos mágicos.
- `resourceSource/regeneration`: conteúdo, capacidade, taxa e regeneração de fonte.
- `storage`: volume, vagas/capacidade e regras de depósito.
- `construction`: projeto, etapa, materiais e trabalho necessário.
- `movement`: movimento e custos; `ai/knowledge`: decisões e memória.
- `renderable`: referência visual, sem dependência do motor em imagens.

## Organização técnica prevista
```text
packages/
  domain/src/contracts.ts       # estado, comando, resultado
  domain/src/registry.ts        # definição de entidades e ações
  content/src/catalog.ts        # presets e conteúdo inicial
  engine/src/engine.ts          # aplicação do comando
  engine/src/capabilities.ts    # ações consultáveis por contexto
  systems/{movement,needs,resources,inventory,construction,ai}/
apps/{player-web,admin-web,server}/
```

## Responsabilidades e interfaces
- Um template (árvore, NPC) é identificado por ID, e instâncias possuem seu próprio estado.
- Um sistema não importa outro sistema; interage por eventos, contratos e ordem de ticks.
- Regras físicas são iguais para NPC e jogador; permissões são diferentes para admin.
- O registro de definições contém **metadados**, não substitui pré-condições dinâmicas nem autorizações. O motor continua validando comandos.
- **Ainda não é um ECS operacional**. A fundação inicial usa uniões tipadas para personagem e recurso; a migração para componentes de estado ocorrerá por mecanismo testado, sem duplicar lógica.

## Contrato de ação a detalhar por módulo
Cada ação terá `id`, perfil/ator, alvo, precondições, custos, execução, eventos, falhas, interrupção e visibilidade. O catálogo inicial contém apenas as 4 ações da fatia vertical (inspect/move/spawn NPC/spawn resource). As demais especificadas em ACTIONS_AND_PERMISSIONS.md ainda não têm executor.

## Invariantes para testes
IDs de conteúdos/ações únicos; componentes sem duplicações; recurso spawn só usa preset conhecido; comando sem permissão não gera entidade; inspeção não altera tick; a UI nunca adiciona recursos ao estoque sem entrega real.
