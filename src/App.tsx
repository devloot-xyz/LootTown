import { useEffect, useState } from 'react';
import { detectWebGLSupport, prefersReducedMotion } from './accessibility/detector.ts';
import { SemanticExplorer } from './components/SemanticExplorer.tsx';
import './styles.css';

const SAMPLE_VENUES = [
  {
    id: 1,
    name: 'Algorand Builders',
    category: 'Layer 1 Protocol',
    people: [
      { githubId: 101, handle: 'alice_algo', communityCommitCount: 150, eligible: true },
      { githubId: 102, handle: 'bob_indexer', communityCommitCount: 25, eligible: true },
    ],
    bounties: [{ id: 1001, title: 'Build PyTeal contract harness' }],
  },
  {
    id: 2,
    name: 'Solana Speedrunners',
    category: 'DeFi Ecosystem',
    people: [
      { githubId: 201, handle: 'sol_dev', communityCommitCount: 1200, eligible: true },
      { githubId: 202, handle: 'anchor_guru', communityCommitCount: 5, eligible: true },
    ],
    bounties: [{ id: 2001, title: 'Implement zero-copy state deserialize' }],
  },
];

export function App() {
  const [hasWebGL, setHasWebGL] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setHasWebGL(detectWebGLSupport());
    setReducedMotion(prefersReducedMotion());
  }, []);

  return (
    <div className={`app-root ${reducedMotion ? 'reduce-motion' : ''}`}>
      <SemanticExplorer venues={SAMPLE_VENUES} isWebGLSupported={hasWebGL} />
    </div>
  );
}
