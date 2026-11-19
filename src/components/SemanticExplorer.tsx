import { useState } from 'react';
import { avatarTier } from '../domain/community.ts';
import { AudioConsentController } from '../accessibility/detector.ts';

export interface SemanticPerson {
  githubId: number;
  handle: string;
  communityCommitCount: number | null;
  eligible: boolean;
}

export interface SemanticVenue {
  id: number;
  name: string;
  category?: string;
  people: SemanticPerson[];
  bounties?: { id: number; title: string; rewardUsdc?: number }[];
}

export interface SemanticExplorerProps {
  venues: SemanticVenue[];
  isWebGLSupported?: boolean;
}

export function SemanticExplorer({ venues, isWebGLSupported = false }: SemanticExplorerProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [audioController] = useState(() => new AudioConsentController());
  const [audioEnabled, setAudioEnabled] = useState(false);

  const selectedVenue = venues.find((v) => v.id === selectedVenueId);
  const selectedPerson = selectedVenue?.people.find((p) => p.githubId === selectedPersonId);

  const toggleAudio = () => {
    if (audioEnabled) {
      audioController.muteAudio();
      setAudioEnabled(false);
    } else {
      audioController.enableAudio();
      setAudioEnabled(true);
    }
  };

  return (
    <div className="semantic-explorer" style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      {/* Skip Link for Screen Readers and Keyboard Nav */}
      <a
        href="#main-content"
        className="skip-link"
        style={{
          position: 'absolute',
          top: '-40px',
          left: 0,
          background: '#1a73e8',
          color: '#ffffff',
          padding: '8px 16px',
          zIndex: 100,
          textDecoration: 'none',
          borderRadius: '0 0 4px 0',
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = '0';
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-40px';
        }}
      >
        Skip to main content
      </a>

      {/* Accessible Control Bar */}
      <nav
        aria-label="Accessibility & Media Settings"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #dadce0',
        }}
      >
        <span style={{ fontSize: '14px', color: '#3c4043' }}>
          Mode: <strong>{isWebGLSupported ? 'Standard WebGL + Semantic DOM' : 'Semantic List/Detail (No-WebGL)'}</strong>
        </span>

        <button
          type="button"
          onClick={toggleAudio}
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? 'Mute venue audio' : 'Enable venue audio (user-initiated)'}
          style={{
            minHeight: '44px',
            minWidth: '44px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #dadce0',
            background: audioEnabled ? '#e6f4ea' : '#ffffff',
            color: audioEnabled ? '#137333' : '#3c4043',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {audioEnabled ? '🔊 Audio Enabled' : '🔇 Audio Muted'}
        </button>
      </nav>

      {/* Main Content Area */}
      <main id="main-content">
        {!selectedVenue ? (
          <section aria-labelledby="venues-list-title">
            <h2 id="venues-list-title">Available Community Venues ({venues.length})</h2>
            <p>Explore communities and their verified contributors without 3D WebGL requirements:</p>

            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '12px' }}>
              {venues.map((venue) => (
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
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{venue.name}</h3>
                    <div style={{ fontSize: '13px', color: '#5f6368' }}>
                      {venue.people.length} contributors · {venue.bounties?.length ?? 0} active quests
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVenueId(venue.id);
                      setSelectedPersonId(null);
                    }}
                    aria-label={`Enter ${venue.name} venue`}
                    style={{
                      minHeight: '44px',
                      minWidth: '44px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: '#1a73e8',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Enter Venue
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section aria-labelledby="venue-detail-title">
            <div style={{ marginBottom: '16px' }}>
              {/* Guaranteed Venue Exit button: Always available even if downstream view encounters errors */}
              <button
                type="button"
                onClick={() => {
                  setSelectedVenueId(null);
                  setSelectedPersonId(null);
                }}
                aria-label="Exit venue and return to world map"
                style={{
                  minHeight: '44px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #dadce0',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                ← Exit Venue to World Map
              </button>
            </div>

            <h2 id="venue-detail-title">{selectedVenue.name}</h2>
            <p>Select a contributor to inspect character status and attributed progress:</p>

            <div style={{ display: 'grid', gap: '12px' }}>
              {selectedVenue.people.map((person) => {
                const isSelected = person.githubId === selectedPersonId;
                const tier = avatarTier(person.communityCommitCount);

                return (
                  <article
                    key={person.githubId}
                    style={{
                      padding: '16px',
                      border: isSelected ? '2px solid #1a73e8' : '1px solid #dadce0',
                      borderRadius: '8px',
                      background: isSelected ? '#e8f0fe' : '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>@{person.handle}</h4>
                      <div style={{ fontSize: '13px', color: '#5f6368' }}>
                        Band: <strong>{tier}</strong> ({person.communityCommitCount ?? 'Unknown'} commits)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPersonId(isSelected ? null : person.githubId)}
                      aria-label={`Inspect contributor @${person.handle}`}
                      aria-pressed={isSelected}
                      style={{
                        minHeight: '44px',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        background: isSelected ? '#1a73e8' : '#f1f3f4',
                        color: isSelected ? '#ffffff' : '#202124',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {isSelected ? 'Selected' : 'Inspect'}
                    </button>
                  </article>
                );
              })}
            </div>

            {selectedPerson && (
              <div
                role="region"
                aria-label="Contributor Detail Panel"
                style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #dadce0',
                }}
              >
                <h3>Focused Contributor: @{selectedPerson.handle}</h3>
                <p>
                  Visual Outfit Band: <strong>{avatarTier(selectedPerson.communityCommitCount)}</strong>
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#5f6368' }}>
                  Stable GitHub ID: <code>{selectedPerson.githubId}</code>
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
