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
| Casa Comunitária | building.community_house | position, housing, comfort, socialMeeting | assignResidence/rest/interact / build/inspect | blueprint especificado, mecânica pendente |
| Família / unidade doméstica | household.family | members, guardians, residence | planFamily/care / inspect | contrato proposto, implementação pendente |

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

## Convenção de identificadores
Os IDs usados no protocolo são estáveis e em inglês (`wood`, `food`, `stone`); rótulos visíveis ficam localizados em português. Servidor, catálogo e opções administrativas usam os mesmos IDs.

## Extensão social e familiar do MVP
As definições de moradia, vínculos, reprodução, ciclo de vida, infância e modificadores temporários estão em [HOUSING_FAMILY_MVP.md](HOUSING_FAMILY_MVP.md), com issue #19. **A casa publica capacidade habitacional/conforto; não executa reprodução.** As fases de gestação e recuperação influenciam movimento, inventário, trabalho e prioridades por um sistema transversal de modificadores. O catálogo TypeScript de entidades existente é a fundação inicial; novos componentes ainda precisam ser implementados.

## Efeitos e atributos derivados
Pessoas podem possuir instâncias de efeitos; definições reutilizáveis em `packages/content/src/effects/`. Primários e estado vital alimentam um grafo acíclico de atributos derivados (humor → produtividade/interação). As fontes e durações de modificadores são rastreáveis para inspeção administrativa. Um efeito não é entidade física, mas componente opcional do personagem. Ver `docs/architecture/EFFECT_SYSTEM.md`.
