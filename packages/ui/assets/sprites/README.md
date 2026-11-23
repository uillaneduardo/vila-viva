# Reservatório futuro de sprites da interface

Nenhum sprite artístico é enviado nesta etapa. Os visuais atuais permanecem ícones SVG confiáveis no registro.

Os sprites devem ser arquivos reais dentro da raiz estática publicada como `/assets/ui/<namespace>/<nome>.webp` (ou PNG/SVG), com licença/autoria documentada. Um registro de sprite só é válido após existir arquivo e rota estática correspondente. Não inventar imagens ou preencher o mapa com sprites da HUD.

Namespaces sugeridos: `actions/`, `controls/`, `sections/`, `resources/`, `effects/`. Estados opcionais `normal`, `hover`, `selected`, `disabled`, `alert` seguem a mesma identidade de ativo.

O código do mundo fica em `packages/renderer`; esta pasta não deve armazenar sprites de entidades do mundo.
