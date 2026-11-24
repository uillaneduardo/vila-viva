# HUD adaptativa — mapa em primeiro plano (#69)

A simulação deve ocupar a viewport inteira. A interface é uma camada independente, sem mutar mundo, câmera, ticks ou conexão quando um painel é aberto.

## Primeira etapa
- Modo compacto quando largura ≤1190 CSS px ou altura ≤650 CSS px, inclusive desktop com janela baixa.
- Identificação do mundo e controles de tempo continuam acessíveis; estado da conexão como LED com texto acessível e tooltip. Verde: stream reportado live; amarelo: conexão pendente ou fallback HTTP; vermelho: indisponível.
- Estoque global dos depósitos acessível por botão ◇ em modo compacto; atividades recolhidas ao entrar nesse modo, com botão de expansão; inspetor existente preservado.
- Dock compacto com ícones, rolagem horizontal e nomes acessíveis; dicas periféricas ocultas. Sem blur em modo compacto.
- Painéis sobrepostos com limite de altura e rolagem; preservar gesto de pinça no canvas e controles existentes.

## Limites e evolução
Esta etapa não unifica o seletor de mundo com a marca, não altera o protocolo de stream e não introduz medição independente de atraso de tick. O menu de velocidade e o overflow por categorias, a arbitragem de painéis e a validação de safe areas em dispositivos físicos permanecem na issue #69. Não considerar o LED uma prova independente de frescor dos ticks.

## Validação obrigatória antes de homologação
Testar 320×568, 375×667, 600×400, 920×560, 1024×768, 1440×900, retrato/paisagem e zoom 200%. Verificar seleção, pausa, velocidades, estoque, atividades, pincel, submenus, inspetor e troca de mundo; comparar FPS/latência, garantir ausência de recortes e que abrir a HUD não reinicia o canvas ou stream. Executar npm test e CI. Registrar resultados reais; aprovação de CI não substitui teste visual.
