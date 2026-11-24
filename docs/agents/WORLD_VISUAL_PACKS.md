# World visual packs — #71
The default simple pack reproduces the approved geometric reference as a transparent SVG atlas, 384×96, four equal cells. Original geometric fallback remains via ?visualPack=classic (apple atlas remains). No gameplay changes. The browser loads local SVG through Image, never inline executable markup.
- visual-packs.js: pack registry, stable semantic IDs, source, dimensions, pivot, state order.
- character-visual-state.js: compatibility mapping from actual AI labels and confirmed interpolated motion. Unknown/blocked → idle, death → dead (fallback skull). No animation yet.
- sprites.js: loading/drawing, injectable pack; setPack swaps and reloads, stale callbacks guarded.
- Scene receives injected SpriteLibrary; tick playback remains independent.
To add a skin, create a transparent atlas under public/assets/world, add a pack descriptor with matching IDs and state order, select via visualPack query parameter. Never change world entities or saves for appearance. Future animation should extend descriptor with frame sequences/duration/direction and use local render time; no frame data in simulation. Test asset size, pivots, missing state fallback, both render adapters and browser visuals. The SVG is a faithful geometric redraw, not the earlier extracted PNG; static moving pose is not a walking animation.
