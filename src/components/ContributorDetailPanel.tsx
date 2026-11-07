import { useEffect, useRef } from 'react';
import type { ContributorDetailState } from '../domain/contributor';

export interface ContributorDetailPanelProps {
  contributor: ContributorDetailState;
  onClose: () => void;
  originatingElement?: HTMLElement | null;
}

export function ContributorDetailPanel({
  contributor,
  onClose,
  originatingElement,
}: ContributorDetailPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus lifecycle management
  useEffect(() => {
    // Save active element if not provided
    const priorFocus = originatingElement ?? (document.activeElement as HTMLElement | null);

    // Focus close button on mount
    closeButtonRef.current?.focus();

    // Keydown handler for Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to originating character/venue element
      if (priorFocus && typeof priorFocus.focus === 'function') {
        priorFocus.focus();
      }
    };
  }, [onClose, originatingElement]);

  const bandBadges: Record<string, { label: string; color: string; border: string }> = {
    core: { label: 'Core Contributor Band', color: '#a371f7', border: '#8957e5' },
    active: { label: 'Active Contributor Band', color: '#58a6ff', border: '#388bfd' },
    emerging: { label: 'Emerging Contributor Band', color: '#3fb950', border: '#2ea043' },
    unknown: { label: 'Uncertified Appearance Band', color: '#8b949e', border: '#30363d' },
  };

  const badge = bandBadges[contributor.appearanceBand] ?? bandBadges.unknown;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`dialog-title-${contributor.githubId}`}
      className="contributor-detail-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(1, 4, 9, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          color: '#f0f6fc',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                border: `1px solid ${badge.border}`,
                color: badge.color,
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'inline-block',
                marginBottom: '6px',
              }}
            >
              {badge.label}
            </span>
            <h2 id={`dialog-title-${contributor.githubId}`} style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              @{contributor.handle}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#8b949e', marginTop: '2px' }}>
              Community: <strong>{contributor.communityName}</strong>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close contributor profile"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              fontSize: '1.5rem',
              lineHeight: '1',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#0d1117',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #30363d',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '8px', fontWeight: 600 }}>
            Contribution Evidence:
          </div>

          {contributor.isCoverageComplete && contributor.certifiedCommitCount !== null ? (
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#58a6ff' }}>
                {contributor.certifiedCommitCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                Unique certified community commits (upstream verified)
              </div>
              {contributor.lastSyncedAt && (
                <div style={{ fontSize: '0.75rem', color: '#6e7681', marginTop: '6px' }}>
                  Synced: {new Date(contributor.lastSyncedAt).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div
              role="status"
              style={{
                backgroundColor: 'rgba(139, 148, 158, 0.1)',
                border: '1px solid #30363d',
                padding: '12px',
                borderRadius: '6px',
              }}
            >
              <div style={{ color: '#d29922', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                Coverage Incomplete
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                Upstream projection does not certify full repository coverage. Contribution counts are omitted to prevent misrepresenting activity.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#21262d',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Close
          </button>

          <a
            href={contributor.gitHubProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: '#238636',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            GitHub Profile ↗
          </a>
        </div>
      </div>
    </div>
  );
}
