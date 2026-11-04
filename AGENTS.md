# LootTown invariants

- One DevLoot community (`Project`) maps to one venue on a shared map. Repositories belong to that community; people and files are never buildings.
- One eligible real person maps to one character per community, keyed by stable GitHub ID across linked repositories. A character is not a live presence indicator.
- Avatar commit bands in `docs/product.md` are approved. Venue size thresholds are proposals. Unknown commit coverage is not zero; never sum possibly overlapping repository counts in the browser.
- Current DevLoot wire contracts and proposed LootTown contracts are distinct. Cite current server source when changing integrations. Do not fabricate a deployed LootTown API.
- Bounty payment and authorization stay in DevLoot. Monsters are a future design proposal, not a combat or payout system in this base.
- Keep the offline synthetic demo explicit. Do not copy GitCity code or assets. Track provenance and license for each imported asset.
- Do not start another DevLoot stack or alter its database, secrets, or production resources from this repository.
