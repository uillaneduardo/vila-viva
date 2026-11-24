# Building visual packs (#73)
Every blueprint maps to buildings/<blueprint suffix>; no engine import. Current simple pack has seven SVG atlases: community_house, family_house, depot, workshop, cafeteria, mine, cemetery. States stage:0 ... stage:N-1, completed, destroyed; stage index identifies current construction phase, not percentage complete. Frame size 96×96 scaled to actual footprint width/height; center pivot. Completed cemetery is rendered beneath characters, as before. Classic pack retains geometric fallback.
New buildings automatically resolve a semantic ID; without artwork, geometric fallback remains. Add an atlas descriptor to building-visuals.js and asset under public/assets/world/buildings, without changing simulation. Optional level variants use ID@level and fall back to base art if unavailable. No new level mechanics introduced. Test coverage includes catalog completeness, terminal states, future fallback and rectangular scaling. Assets are vector geometric illustrations in same style as NPC pack; future art may replace files or register another pack. Browser visual QA remains necessary.


## Reserved future art
- `buildings/farm_plot` — Canteiro agrícola
- `buildings/smithy` — Ferraria
- `buildings/lumber_camp` — Acampamento madeireiro
- `buildings/quarry` — Pedreira
- `buildings/infirmary` — Enfermaria
- `buildings/herbalist` — Herbalista
- `buildings/kitchen` — Cozinha
- `buildings/storage_yard` — Pátio de armazenamento
- `buildings/market` — Mercado
- `buildings/well` — Poço
- `buildings/guard_post` — Posto de guarda
- `buildings/watchtower` — Torre de vigia
- `buildings/school` — Escola
- `buildings/hall` — Salão comunitário

These 14 assets are visual reservations approved for future use, not a gameplay roadmap commitment. No blueprint, command or menu added. Aliases field→farm_plot, forge→smithy, wood_yard→lumber_camp; explicit pack keys take precedence. Three provisional phase frames plus completed/destroyed; actual future blueprint may require more. Lazy-loaded on first use to avoid startup traffic. Current house/depot keep legacy semantic state names; SpriteLibrary translates to indexed atlas frames, preserving existing tests. When activating a blueprint, migrate its art to the active registry and update stage coverage and reservation tests.
