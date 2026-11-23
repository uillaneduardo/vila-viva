# Contrato de desenvolvimento — UI administrativa

## Objetivo atual
Validar a UX do Modo Deus com dados de demonstração. Não existe simulação autoritativa nesta etapa.

## Fronteiras
- `src/features/navigation/` contém o registro de telas e a composição das listas.
- `src/features/inspector/` transforma entidades em detalhes; sem efeitos colaterais.
- `src/features/activity/` apresenta eventos da demonstração.
- `src/map.js` é a camada visual Canvas, isolada da navegação DOM.
- `src/mock.js` concentra fixtures de simulação.
- `src/styles/tokens.css` é a base do design system; `responsive.css` trata breakpoints.
- `src/app.js` é o composition root, responsável por conectar interações e atualizações.

## Política de módulos
Evitar dependências DOM na camada de templates; eles recebem dados e retornam markup. Escapar conteúdo dinâmico. Nenhuma mudança de estado global deve acontecer durante a renderização de componentes. UI deve preservar estado de seleção e evitar reconstruir o Canvas durante atualizações.

## Próximo refinamento
Extrair demo-store, rotas e map renderer em arquivos próprios, definir contratos TypeScript e criar testes de interface no navegador. Substituir fixtures por Client SDK após homologar telas. A autenticação/RBAC ainda não existe e é obrigatória antes de expor intervenções reais.
