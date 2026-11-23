# Vila Viva — G1: primeira fatia vertical real

Este branch foi reconstruído apenas a partir da documentação do jogo. Não reutiliza código executável da UI ou backend anteriores.

## Experimento local (Node 22.18+)
```bash
npm test
npm run dev
```
Abra `http://127.0.0.1:8086/` (jogador) e `http://127.0.0.1:8086/admin` (Modo Deus).

### O que realmente funciona
- Um mesmo mundo em memória no servidor, acessado pelas duas interfaces.
- Inspecionar NPCs/fontes; posicionar um NPC ou uma fonte por comando admin.
- Mover o personagem do jogador **um tile ortogonal** por comando, com redução real de energia e resposta do motor.
- Backend valida limites, ator responsável e duplicação do commandId.
- Ações são derivadas do estado do motor e mostram o motivo do bloqueio.
- Atualizar consulta o estado atual. Não há stream automático ainda.

### Restrições de segurança
Servidor vinculado exclusivamente a `127.0.0.1`. O campo de papel é demonstrativo e NÃO comprova autorização. Não adicionar Cloudflare Tunnel, proxy público ou binding em `0.0.0.0` antes de autenticação, RBAC, limitação de taxa e auditoria.

### Ainda não implementado
Persistência, tick contínuo, patfinding, colisões, coleta física, sobrevivência, construção, IA, WebSocket, login e operações administrativas seguras. Não mesclar na `main` nem alterar deploy atual.

Arquitetura, fluxos e decisões: docs/gameplay, docs/ui e issues #17/#15. PR #18.
