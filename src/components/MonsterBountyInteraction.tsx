import { useState } from 'react';
import type { MonsterBountyState } from '../integration/bounties';

export interface MonsterBountyInteractionProps {
  monsters: MonsterBountyState[];
  communityName: string;
  onClose?: () => void;
}

export function MonsterBountyInteraction({
  monsters,
  communityName,
  onClose,
}: MonsterBountyInteractionProps) {
  const [selectedMonster, setSelectedMonster] = useState<MonsterBountyState | null>(
    monsters.length > 0 ? monsters[0] : null
  );

  return (
    <div
      className="monster-interaction-panel"
      role="region"
      aria-label={`Bounty Monsters for ${communityName}`}
      style={{
        padding: '16px',
        backgroundColor: '#161b22',
        color: '#f0f6fc',
        borderRadius: '8px',
        border: '1px solid #30363d',
        maxWidth: '560px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          👾 Bounty Monsters · {communityName}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close monster panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              fontSize: '1.2rem',
            }}
          >
            ×
          </button>
        )}
      </div>

      {monsters.length === 0 ? (
        <div
          role="status"
          style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#0d1117',
            borderRadius: '6px',
            color: '#8b949e',
          }}
        >
          <p style={{ margin: 0 }}>No active bounty monsters roaming this community venue.</p>
          <small style={{ color: '#6e7681', marginTop: '4px', display: 'block' }}>
            Check back later when new DevLoot bounties are published.
          </small>
        </div>
      ) : (
        <div>
          <div
            role="tablist"
            aria-label="Bounty monsters list"
            style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}
          >
            {monsters.map((m) => {
              const isSelected = selectedMonster?.monsterId === m.monsterId;
              const statusColor = m.isActive ? '#238636' : m.state === 'IN_REVIEW' ? '#d29922' : '#8b949e';
              return (
                <button
                  key={m.monsterId}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedMonster(m)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#21262d' : '#0d1117',
                    border: `1px solid ${isSelected ? '#58a6ff' : '#30363d'}`,
                    color: '#f0f6fc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    fontSize: '0.85rem',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: statusColor,
                    }}
                  />
                  <span>#{m.issueNumber}</span>
                  {m.amountFormatted && (
                    <span style={{ color: '#58a6ff', fontWeight: 600 }}>{m.amountFormatted}</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedMonster && (
            <div
              style={{
                backgroundColor: '#0d1117',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #30363d',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#58a6ff' }}>
                  {selectedMonster.title}
                </h4>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: selectedMonster.isActive ? 'rgba(35,134,54,0.2)' : 'rgba(139,148,158,0.2)',
                    color: selectedMonster.isActive ? '#3fb950' : '#8b949e',
                    border: `1px solid ${selectedMonster.isActive ? '#238636' : '#30363d'}`,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {selectedMonster.state}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '12px' }}>
                <span>Repository: {selectedMonster.repo}</span> · <span>Open PRs: {selectedMonster.openPrCount}</span>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#6e7681' }}>
                Notice: LootTown is a discovery venue. Bounty creation, submissions, and reward payments happen exclusively on DevLoot.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={selectedMonster.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 14px',
                    backgroundColor: '#1f6feb',
                    color: '#ffffff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Inspect Bounty on DevLoot ↗
                </a>

                <a
                  href={selectedMonster.sourceIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 14px',
                    backgroundColor: '#21262d',
                    color: '#c9d1d9',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    border: '1px solid #30363d',
                    fontSize: '0.85rem',
                  }}
                >
                  GitHub Issue ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
