# Contributing to LootTown

1. Read [product rules](docs/product.md), [contracts](docs/contracts.md), and [backlog](docs/backlog.md). Choose a task with clear dependencies; discuss changes to approved avatar bands or proposed venue thresholds first.
2. Use Node 24, `npm ci`, and the scripts in README. Keep the synthetic demo usable offline. A PR should focus on one backlog task.
3. Include a short before/after explanation, tests run and results, and a screenshot or short recording for scene or UI changes. Test keyboard and reduced motion behavior. Describe measured device/browser results instead of promising FPS.
4. For new third-party assets, record author, source URL, license, modifications, and attribution in the PR and an asset manifest. Do not paste GitCity AGPL code/assets into MIT source.
5. For a DevLoot backend contract task, work in the DevLoot repository and link the implementation PR. Do not change or mock a wire field in LootTown as if the API already serves it.

Definition of Done: acceptance criteria in the chosen backlog task pass; relevant typecheck, lint, tests and build pass; contracts/docs and error/empty/loading states reflect the change; visual or performance evidence is supplied when relevant; and license/provenance is reviewed. Funding or payment remains a separate DevLoot decision.
