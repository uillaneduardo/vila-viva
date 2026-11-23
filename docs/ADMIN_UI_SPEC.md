# Vila Viva — interface administrativa (A1)

## Objetivo
Uma única tela de observação topdown, sem sobrecarregar a área de mapa, com navegação para simulações, população, recursos, eventos, regras e estatísticas.

## Design
Tema escuro com verde suave; sidebar discreta, KPIs, canvas central, inspetor contextual e atividade recente. Desktop 2 colunas de mapa+inspector; tablets e celulares empilham o inspetor. Controles touch com pointer events, pan, zoom e seleção. Sem dependências externas no protótipo.

## Comportamentos testáveis no protótipo
- Menu lateral navega entre visões sem recarregar.
- Mapa suporta arrastar, zoom, selecionar NPC/fonte/obra e abrir dados no inspetor.
- Ferramentas de NPC/recurso/evento inserem entidades **fictícias locais**, apenas para homologar interação.
- Pausa, velocidade e troca de mundo atuam somente nos fixtures locais.
- Tela de mundos e modal permitem criar/alternar mundos **temporários**.
- Desktop/mobile, estados vazios, foco, Escape, labels e indicadores de modo DEMO.

## Fora do escopo atual
Servidor, WebSocket, autenticação, persistência, AI real, economia, eventos reais, métricas reais e deploy. A frase 'em tempo real' na interface descreve a intenção do produto, não uma capacidade já ativa no protótipo.

## Contratos futuros
`GET /worlds`, `GET /worlds/:id/snapshot`, `WS /worlds/:id/stream`, `POST /worlds/:id/commands`.
Todo comando de admin carrega idempotency key, worldId, payload validado, autor e permissão; resultados têm tick e sequência. Nunca usar estado local como verdade do servidor.

## Aceite A1
Revisão visual e fluxo em navegador desktop e mobile, inspeção sem flicker, troca de aba estável, cada ferramenta operante, nenhum tráfego de escrita ou dependência no backend legado.
