import { lazy, Suspense, useEffect, useState } from 'react';
import { demo } from './demo';
import { avatarTier, proposedVenue, uniquePeople } from './domain/community';
import './styles.css';

const VenueScene = lazy(() => import('./scene/VenueScene').then((module) => ({ default: module.VenueScene })));

function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch { return false; }
}

export function App() {
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [webgl] = useState(canUseWebGL);
  const [ready, setReady] = useState(false);
  const people = uniquePeople(demo.people);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  return <main className="app">
    <header className="topbar"><div className="brand">✦ LootTown <span>technical preview</span></div><a href="https://devloot.xyz" target="_blank" rel="noreferrer">DevLoot ↗</a></header>
    <section className="intro">
      <p className="eyebrow">One community · one venue</p>
      <h1>A place for the people behind the work.</h1>
      <p>This is an offline, synthetic scene. It does not show real DevLoot communities or live presence.</p>
    </section>
    <section className="experience" aria-label="Sample community venue">
      <div className="scene" aria-label="3D illustration of a sample venue">
        {webgl ? <Suspense fallback={<span className="loading" role="status">Loading 3D module…</span>}><VenueScene people={people} reducedMotion={!motion} onReady={() => setReady(true)} /></Suspense> : <div className="fallback" role="status">3D is unavailable here. The community information remains below.</div>}
        {webgl && !ready && <span className="loading" role="status">Preparing scene…</span>}
        <span className="scene-label">SYNTHETIC DEMO · {proposedVenue(people.length).toUpperCase()}</span>
      </div>
      <aside className="details">
        <p className="eyebrow">Featured venue</p>
        <h2>{demo.community.name}</h2>
        <p>A synthetic community venue for testing the shell and motion.</p>
        <dl><div><dt>People represented</dt><dd>{people.length} fictional placeholders</dd></div><div><dt>Venue concept</dt><dd>{proposedVenue(people.length)} (proposed threshold)</dd></div></dl>
        <button type="button" onClick={() => setMotion(!motion)} aria-pressed={motion}>{motion ? 'Pause motion' : 'Enable motion'}</button>
        <p className="hint">Drag the scene to orbit. Scroll or pinch to zoom. Motion follows your device preference.</p>
      </aside>
    </section>
    <section className="people" aria-labelledby="people-title">
      <div><p className="eyebrow">Community cast</p><h2 id="people-title">People in this venue</h2></div>
      <div className="cards">{people.map((person) => <article key={person.githubId}>
        <span className="portrait" aria-hidden="true">✦</span><h3>{person.handle}</h3>
        <p>{person.communityCommitCount} synthetic commits · {avatarTier(person.communityCommitCount)} appearance</p>
      </article>)}</div>
    </section>
    <footer>Prototype geometry only. Real people, complete commit counts, asset licenses, and bounty interactions require later tasks.</footer>
  </main>;
}
