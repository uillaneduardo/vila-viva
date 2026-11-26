# Advisory hauling reservations (#50)

One serializable claim per NPC for a concrete storage withdrawal, storage deposit or construction delivery while travelling. Source stock is counted per item; destination capacity is shared across item types; site demand is per item. Claims never transfer resources. The engine remains the final authority. Claims release after action, cancellation, rejected movement, idle, survival or 24 ticks without progress; dying/resting NPCs do not reserve capacity. Survival may bypass claims, never physical limits. Existing saves omit the optional field. Shared AI means browser and server use the same rules.

Scope: this increment does not reserve future destination while fetching, ground piles, raw extraction, or production demand across multiple locations. No new network or renderer dependency. Validate multi-seed survival and logistics before merge.

## Second increment: construction route
A warehouse withdrawal may carry a construction destination ID. Reserve outstanding material demand while walking to the source; select reachable source + onward route by total route cost. On accepted withdrawal, transition the same intent into a delivery claim based on actual inventory and remaining demand. Revalidate on every decision; release for survival, failed movement, expired claim or inaccessible targets. Does not yet pair production recipes, raw gathering or loose piles; no stock transfer before accepted commands. Existing snapshots remain readable.
