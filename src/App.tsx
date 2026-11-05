import { ShareButton } from './components/ShareButton.tsx';
import { avatarTier } from './domain/community.ts';
import { NavigationProvider, useNavigation } from './navigation/NavigationContext.tsx';
import './styles.css';

// Sample verified venues reflecting proposed VenueV1 projection
const DEMO_VENUES = [
  {
    id: 1,
    name: 'Algorand Builders',
    people: [
      { githubId: 101, handle: 'alice_algo', communityCommitCount: 150, eligible: true },
      { githubId: 102, handle: 'bob_indexer', communityCommitCount: 25, eligible: true },
    ],
  },
  {
    id: 2,
    name: 'Solana Speedrunners',
    people: [
      { githubId: 201, handle: 'sol_dev', communityCommitCount: 1200, eligible: true },
      { githubId: 202, handle: 'anchor_guru', communityCommitCount: 5, eligible: true },
    ],
  },
];

function LootTownContent() {
  const { state, goToWorld, goToVenue, goToContributor } = useNavigation();

  const currentVenue = DEMO_VENUES.find((v) => v.id === state.communityId);
  const currentPerson = currentVenue?.people.find((p) => p.githubId === state.contributorId);

  return (
    <main style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0' }}>LootTown</h1>
          <p style={{ margin: 0, color: '#5f6368' }}>
            Explorable DevLoot communities, venues, and contributor characters.
          </p>
        </div>
        <ShareButton label="Share link" />
      </header>

      {state.isFallback && (
        <aside
          role="status"
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            background: '#fef7e0',
            border: '1px solid #f9ab00',
            borderRadius: '6px',
            color: '#3c4043',
          }}
        >
          {state.fallbackReason === 'unknown_community' && '⚠️ Unknown community venue requested. Safely returned to World overview.'}
          {state.fallbackReason === 'unknown_contributor' && '⚠️ Contributor not found in this venue. Returned to community overview.'}
        </aside>
      )}

      {state.view === 'world' ? (
        <section aria-labelledby="world-heading">
          <h2 id="world-heading">World Map</h2>
          <p>Select a community venue to explore in 3D:</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '12px' }}>
            {DEMO_VENUES.map((venue) => (
              <li
                key={venue.id}
                style={{
                  padding: '16px',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{venue.name}</strong>
                  <div style={{ fontSize: '13px', color: '#5f6368' }}>{venue.people.length} eligible contributors</div>
                </div>
                <button
                  type="button"
                  onClick={() => goToVenue(venue.id)}
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#1a73e8',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Enter Venue →
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-labelledby="venue-heading">
          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={goToWorld}
              style={{
                minHeight: '44px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #dadce0',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              ← Back to World Map
            </button>
          </div>

          <h2 id="venue-heading">{currentVenue?.name}</h2>
          <p>Community contributors attending this venue show:</p>

          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '12px', marginTop: '16px' }}>
            {currentVenue?.people.map((person) => {
              const isSelected = person.githubId === state.contributorId;
              const tier = avatarTier(person.communityCommitCount);

              return (
                <li
                  key={person.githubId}
                  style={{
                    padding: '16px',
                    border: isSelected ? '2px solid #1a73e8' : '1px solid #dadce0',
                    borderRadius: '8px',
                    background: isSelected ? '#e8f0fe' : '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>@{person.handle}</strong>
                    <div style={{ fontSize: '13px', color: '#5f6368' }}>
                      Tier: <code>{tier}</code> ({person.communityCommitCount} commits)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => goToContributor(currentVenue.id, person.githubId)}
                    style={{
                      minHeight: '44px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: isSelected ? '#1a73e8' : '#f1f3f4',
                      color: isSelected ? '#fff' : '#202124',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {isSelected ? 'Selected' : 'View Character'}
                  </button>
                </li>
              );
            })}
          </ul>

          {currentPerson && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dadce0',
              }}
            >
              <h3>Focused Character: @{currentPerson.handle}</h3>
              <p>
                Visual Band: <strong>{avatarTier(currentPerson.communityCommitCount)}</strong>
              </p>
              <p style={{ fontSize: '13px', color: '#5f6368', margin: 0 }}>
                This URL state can be shared via the link button above.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export function App() {
  return (
    <NavigationProvider knownVenues={DEMO_VENUES}>
      <LootTownContent />
    </NavigationProvider>
  );
}
