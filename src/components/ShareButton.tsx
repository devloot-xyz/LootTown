import { useState, type MouseEvent, type KeyboardEvent } from 'react';
import { useNavigation } from '../navigation/NavigationContext.tsx';

export interface ShareButtonProps {
  className?: string;
  label?: string;
}

export function ShareButton({ className = '', label = 'Share link' }: ShareButtonProps) {
  const { copyShareLink, canonicalUrl } = useNavigation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault();
    const result = await copyShareLink();
    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`share-container ${className}`}>
      <button
        type="button"
        className="share-button"
        onClick={handleCopy}
        aria-label={`${label}: ${canonicalUrl}`}
        style={{
          minHeight: '44px',
          minWidth: '44px',
          padding: '8px 16px',
          cursor: 'pointer',
          borderRadius: '4px',
          border: '1px solid #ccc',
          background: copied ? '#e6f4ea' : '#f8f9fa',
          color: copied ? '#137333' : '#202124',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
        <span>{copied ? 'Link copied!' : label}</span>
      </button>

      <span
        className="sr-only"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {copied ? `Copied canonical link ${canonicalUrl} to clipboard` : ''}
      </span>
    </div>
  );
}
