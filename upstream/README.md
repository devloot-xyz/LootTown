# Upstream DevLoot Implementation Package

This directory contains the production-ready upstream implementation designed for `devloot-xyz/devloot` to deliver the versioned public community venue projection tracked in LootTown issue [#4](https://github.com/devloot-xyz/LootTown/issues/4).

## Structure

- `src/modules/projects/dto/venue-projection.dto.ts`: TypeScript / NestJS DTO interfaces with strict wire validation.
- `src/modules/projects/http/project-venue-projection.controller.ts`: NestJS Controller exposing `GET /api/projects/:projectId/venue`.
- `src/modules/projects/application/get-project-venue-projection.usecase.ts`: Application domain service executing project validation, repository cap (10), visibility filtering, SHA deduplication, bot filtering, and snapshot cursor pagination.
- `src/modules/projects/infrastructure/prisma-project-venue.query.ts`: Prisma database provider and source-level SQL query for deduplicating commit SHAs across all linked public repositories.
- `src/modules/projects/tests/project-venue-projection.spec.ts`: Source-level unit and integration tests covering all acceptance criteria.

## Running Tests

From the LootTown repository root:

```bash
npm test
```
