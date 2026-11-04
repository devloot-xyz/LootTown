# LootTown

LootTown is an open source browser experience for DevLoot communities. The planned world is a global map of venues: **one DevLoot community is one venue**, scaled by its unique contributors across linked repositories. Inside, real contributors appear as distinct characters at an event. The current repository is a **technical base**, not a live integration or a finished game.

The running preview uses a fictional community and three fictional people. It works without an account, API, wallet, token, or internet after dependencies are installed. Its simple geometry proves a 3D scene, orbit controls, a small animation, readable information outside WebGL, and a motion toggle. It does not claim real people, online presence, complete commit attribution, bounty mechanics, or production performance.

## Quick start

Use Node.js 24 and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open <http://localhost:5174>. On Windows, run these commands in WSL Ubuntu or PowerShell with Node 24; a WSL server bound to `0.0.0.0` is usually reachable via Windows `localhost`. Run `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` before a PR. `npm run preview` serves the production build at <http://localhost:4174>.

Docker Desktop with WSL integration is optional:

```sh
docker compose up --build web
```

This is a **LootTown-only** Compose project with HMR at <http://localhost:5174>. Source is mounted into the container; `node_modules` uses its own named volume. For a production image smoke check, run `docker build -t loottown:local .` and then `docker run --rm -p 127.0.0.1:4174:80 loottown:local` (static Nginx image). Stop only the LootTown service with `docker compose stop web`. It does not start the DevLoot API, PostgreSQL, Redis, or Langfuse. If you need those, follow DevLoot's canonical `server/docs/local-docker.md` and reuse its existing Compose project.

No environment file is required. [.env.example](.env.example) documents the future public API base URL. Never put access tokens, wallets' private keys, or secrets in `VITE_*`: Vite exposes those values to browsers.

## Repository guide

- `src/domain/`: pure avatar band, identity deduplication, and **proposed** venue threshold rules.
- `src/demo.ts`: clearly synthetic fixture.
- `src/scene/`: placeholder 3D venue and lightweight motion.
- `src/App.tsx`: accessible text shell and WebGL fallback.
- `docs/product.md`: current product rules, data policies, and limits.
- `docs/architecture.md`: stack decision, integration plan, asset and performance policy.
- `docs/contracts.md`: inspected DevLoot wire contracts versus a proposed normalized LootTown projection.
- `docs/backlog.md`: ordered, scoped tasks ready to turn into issues and assess for bounties.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), choose a task from [the backlog](docs/backlog.md), and open an issue before broad product work. Each task identifies its owning repository and acceptance evidence. Base work completed here is marked done and is not offered again as a bounty. PRs should state the data source, test commands and results, screenshots or recordings for visual changes, accessibility check, and asset provenance. Do not claim a synthetic view is live DevLoot data.

This original code is MIT licensed; see [LICENSE](LICENSE). Imported art, fonts, audio, and motion need their own compatible license and source record. GitCity is a conceptual reference with AGPL-3.0 terms; no GitCity source or assets are included here.
