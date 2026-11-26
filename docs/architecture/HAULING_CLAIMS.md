# Advisory hauling reservations (#50)

One serializable claim per NPC for a concrete storage withdrawal, storage deposit or construction delivery while travelling. Source stock is counted per item; destination capacity is shared across item types; site demand is per item. Claims never transfer resources. The engine remains the final authority. Claims release after action, cancellation, rejected movement, idle, survival or 24 ticks without progress; dying/resting NPCs do not reserve capacity. Survival may bypass claims, never physical limits. Existing saves omit the optional field. Shared AI means browser and server use the same rules.

Scope: this increment does not reserve future destination while fetching, ground piles, raw extraction, or production demand across multiple locations. No new network or renderer dependency. Validate multi-seed survival and logistics before merge.
