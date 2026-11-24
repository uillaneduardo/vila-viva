# Weighted traversal — architectural contract

The domain stores optional movement readiness in simulation ticks. Catalogs define movement multipliers; collision resolves traversability and placement independently; pathfinding consumes collision costs; the engine enforces movement readiness, and AI observes it. The renderer never imports these systems. Its independent occlusion policy consumes projected entity positions and applies opacity without changing movement, sprites, or persistence. Building art remains managed by the visual pack registry. Unknown structures and incomplete or destroyed structures remain solid. Existing snapshots without movement readiness remain valid.

Validate routes and physical occupancy, logical tick timing, legacy snapshot handling, and independent visual occlusion. The initial speeds are balancing defaults, not final guarantees; visual browser QA and larger-world performance remain separate acceptance checks.
