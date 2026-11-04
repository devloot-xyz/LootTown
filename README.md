# LootTown

LootTown is an open source project for a shared, explorable world of DevLoot communities. **Each community becomes one building or venue** in that world. Its size and type respond to the number of unique contributors across its linked repositories. Entering a venue leads to a show with contributor characters watching and reacting. Small communities have smaller settings; large ones can have concert stages and rock shows. The art direction, world, venues, interiors, shows, and characters are **not implemented yet**. See the [product rules](docs/product.md) and [published work plan](docs/backlog.md).

This repository currently contains a technical scaffold: React 18, React Three Fiber 8, Three.js, TypeScript, Vite, Docker, CI, domain rules, a proposed versioned venue contract, and deterministic offline data. The root page is a neutral running-state check. It is not a preview of the eventual visual quality. No DevLoot API, GitHub account, wallet, or secret is needed to run it.

## Start locally

Use Node 24 and npm. In WSL Ubuntu, Linux, or PowerShell with Node 24:

```sh
npm ci
npm run dev
```

Open <http://localhost:5174>. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before a PR. `npm run preview` serves a production build at <http://localhost:4174>.

For the isolated LootTown development container with HMR:

```sh
docker compose up -d --build web
```

It uses <http://localhost:5174> and does not start DevLoot's API, PostgreSQL, Redis, or Langfuse. Stop only this service with `docker compose stop web`. To check a static production image: `docker build -t loottown:local .`, then `docker run --rm -p 127.0.0.1:4174:80 loottown:local`. The DevLoot stack has its own canonical `server/docs/local-docker.md`; do not duplicate it for LootTown.

## Offline data

The [large JSON fixture](public/fixtures/large.json) is served directly at <http://localhost:5174/fixtures/large.json>. It has 40 fictional communities, 213–574 distinct members in each, 15,866 community-person memberships, 5,645 global fictional identities, 168 fictional repositories, and 207 community-repository links. The root page does not render or fetch it. Its `venues[]` items pass the same proposed `VenueV1` validator intended for a future real adapter; the outer fixture envelope and repository sidecars are explicitly synthetic, not a current DevLoot response.

Regenerate byte-identical default data with `npm run seed:generate`. Use `npm run seed:generate -- --seed my-test-seed --out work/alternate.json` for a disposable alternative. `npm test` verifies the committed bytes, identity/repository integrity, all approved avatar bands, and determinism. See [fixture details](docs/fixture.md). Synthetic `coverage.complete` means fixture generation is complete; it is no proof that DevLoot can currently provide full attributed commit counts.

## Build boundaries and contribution

- [Architecture](docs/architecture.md) explains the stack, asset provenance, host integration, accessibility and performance constraints.
- [Contracts](docs/contracts.md) distinguishes inspected DevLoot HTTP responses from proposed LootTown data. A complete, deduplicated community commit projection is still required upstream.
- [GitHub issues](docs/backlog.md) are the ordered, actionable work plan. The scaffold and seed already delivered here must not be offered again as bounties.
- [Contributing](CONTRIBUTING.md) defines PR evidence and completion checks. No bounty is financed merely because an issue exists.

Original code is [MIT licensed](LICENSE). Every third-party model, animation, sound, font, or texture needs compatible license and source records. GitCity is an AGPL-3.0 conceptual reference; no code or assets from it are included here. Never put tokens or private keys in `VITE_*` environment variables, which are exposed to browsers.
