# Venue Integration & Read Adapter

## Overview
LootTown consumes community venue data through a read-only adapter defined in `src/integration/venueAdapter.ts`.

It strictly validates incoming payloads against `src/contracts/venue.ts` (VenueV1 schema) while preserving an explicit offline fixture mode for local development.

## Lifecycle States
The read adapter maps all network and data outcomes to explicit, typed states:

- **`loading`**: Fetch request in flight.
- **`success`**: Payload conforms to `VenueV1`. Provides `venue`, `source: 'live'`, and `isPartial: boolean`.
- **`offline_fixture`**: Deliberately loaded from offline synthetic fixtures (`src/seed/`). Never confused with live data.
- **`empty`**: Community venue not found (HTTP 404) or contains 0 eligible contributors.
- **`schema_mismatch`**: Unsupported schema version, invalid data types, or conflicting aggregates.
- **`transport_error`**: HTTP error (5xx, 429) or network disconnect with retryable classification.
- **`cancelled`**: AbortController signal cancelled cleanly.

## Key Invariants
1. **No Silent Fallbacks:** A failed live network request returns `transport_error` or `schema_mismatch`. It never silently defaults to offline fixture data.
2. **Partial Coverage Handling:** When `coverage.complete === false`, contributor commit counts remain `null`. Definitive bands are never rendered from incomplete data.
3. **Host & CORS Context:**
   - When embedded same-origin within DevLoot, requests inherit the host session and origin.
   - In standalone mode, endpoints require appropriate public CORS read headers on the upstream server. Auth and payments remain owned by DevLoot.
