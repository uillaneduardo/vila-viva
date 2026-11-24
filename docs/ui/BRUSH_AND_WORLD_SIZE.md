# Oturo — Pincel compacto e dimensões de mundo

## Pincel
- Na interface do Modo Deus, o pincel é uma faixa compacta acima do submenu contextual de tiles quadrados; o slider legado existe no DOM mas está oculto, preservando os callbacks de tamanho.
- O botão de formato alterna entre **quadrado** e **circular**, persistindo a escolha na sessão. Construções usam footprint do blueprint e zonas de cultivo usam retângulos; o botão de formato não é exibido nesses modos.
- A máscara de células é calculada por `brushCells(center, size, world, shape)` no renderer, respeitando limites do mapa. A mesma função é chamada pela prévia e pela montagem dos comandos; não duplicar esse algoritmo nos componentes.
- Para tamanho par, o pincel permanece ancorado pelo deslocamento `floor(size/2)`, assim como o quadrado legado. O círculo inclui células cuja distância ao centro geométrico da grade é menor ou igual a `size / 2`.
- Quantidade de células é uma estimativa da máscara completa; perto das bordas a máscara real é recortada pelo mundo e bloqueios continuam visíveis em vermelho.

## Novo mundo
- O menu Mundo mostra as dimensões reais retornadas pela API.
- Ao criar, o operador escolhe um dos perfis: `24×16`, `32×24`, `48×32`, `64×48`. O padrão continua `24×16` para compatibilidade.
- `POST /api/world/new` recebe `seed`, `width` e `height`, exigindo um dos pares autorizados (422 `INVALID_WORLD_SIZE` para valores inválidos). A validação pertence à API, não só à interface.
- Um mundo novo pausa a simulação, descarta a seleção e recenteriza a câmera na próxima atualização. Salvamentos e importações carregam dimensões do snapshot sem conversão.
- Para oferecer mapas ainda maiores, reavaliar desempenho do motor, geração inicial, memória e persistência antes de ampliar a lista de perfis.

## Homologação
1. Testar tamanhos 1, 2, 4, 5 e 15 para quadrado e círculo, inclusive perto das quatro bordas.
2. Verificar que a prévia e o resultado de pintura coincidem, respeitando colisão.
3. Confirmar que o formato não aparece em Construir e Plantio, e que a troca não altera o footprint de construções.
4. Criar mapas pequenos e grandes, confirmar dimensões na API, área renderizada e gerenciador de mundos; salvar e recarregar.
5. Conferir sobreposição do dock, submenu, pincel e monitor no desktop 1032×633 e mobile 390×844.
