import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { parseFixture, type FixtureBundle } from './seed/format';
import { demo } from './demo';
import { avatarTier, proposedVenue, uniquePeople } from './domain/community';
import './styles.css';

const VenueScene = lazy(() => import('./scene/VenueScene').then((module) => ({ default: module.VenueScene })));
const largeMode = new URLSearchParams(window.location.search).get('fixture') === 'large';
const SCENE_LIMIT = 6;
const CARD_LIMIT = 12;

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
  const [fixture, setFixture] = useState<FixtureBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!largeMode) return;
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}fixtures/large.json`, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Fixture request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => setFixture(parseFixture(value)))
      .catch((error: unknown) => {
        if (!abort.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Fixture could not be loaded');
      });
    return () => abort.abort();
  }, []);

  const venue = largeMode ? fixture?.venues.find((item) => item.community.id === (selectedId ?? fixture.venues[0].community.id)) : demo;
  const people = venue ? uniquePeople(venue.people) : [];
  const scenePeople = people.slice(0, SCENE_LIMIT);
  const fixtureStats = useMemo(() => fixture && ({
    memberships: fixture.venues.reduce((sum, item) => sum + item.people.length, 0),
    unique: new Set(fixture.venues.flatMap((item) => item.people.map((person) => person.githubId))).size,
  }), [fixture]);

  return <main className="app">
    <header className="topbar"><div className="brand">✦ LootTown <span>technical preview</span></div><a href="https://devloot.xyz" target="_blank" rel="noreferrer">DevLoot ↗</a></header>
    <section className="intro">
      <p className="eyebrow">One community · one venue</p>
      <h1>A place for the people behind the work.</h1>
      <p>This is an offline, synthetic scene. It does not show real DevLoot communities or live presence.</p>
      <a className="fixture-link" href={largeMode ? '?' : '?fixture=large'}>{largeMode ? '← Small demo' : 'Explore the 40-community fixture →'}</a>
    </section>
    {largeMode && <section className="fixture-controls" aria-label="Large fixture selection">
      <div><p className="eyebrow">Generated dataset</p><strong>{fixture ? `${fixture.venues.length} communities · ${fixtureStats?.memberships.toLocaleString()} memberships · ${fixtureStats?.unique.toLocaleString()} distinct fictional people` : loadError ? 'Fixture unavailable' : 'Loading fixture…'}</strong></div>
      {fixture && <label htmlFor="venue-select">Choose community <select id="venue-select" value={venue?.community.id} onChange={(event) => setSelectedId(Number(event.target.value))}>{fixture.venues.map((item) => <option key={item.community.id} value={item.community.id}>{item.community.name} · {item.people.length} people</option>)}</select></label>}
      {loadError && <p role="alert">Could not load the synthetic fixture: {loadError}</p>}
    </section>}
    {venue && <>
      <section className="experience" aria-label={`${venue.community.name} venue`}>
        <div className="scene" aria-label="3D illustration of a synthetic venue">
          {webgl ? <Suspense fallback={<span className="loading" role="status">Loading 3D module…</span>}><VenueScene people={scenePeople} reducedMotion={!motion} onReady={() => setReady(true)} /></Suspense> : <div className="fallback" role="status">3D is unavailable here. The community information remains below.</div>}
          {webgl && !ready && <span className="loading" role="status">Preparing scene…</span>}
          <span className="scene-label">SYNTHETIC FIXTURE · {proposedVenue(people.length).toUpperCase()}</span>
        </div>
        <aside className="details">
          <p className="eyebrow">Featured venue</p>
          <h2>{venue.community.name}</h2>
          <p>A fictional community venue for testing the shell, scale, and motion.</p>
          <dl><div><dt>People represented</dt><dd>{people.length} fictional members</dd></div><div><dt>Visible in 3D</dt><dd>{scenePeople.length} of {people.length}</dd></div><div><dt>Venue concept</dt><dd>{proposedVenue(people.length)} (proposed threshold)</dd></div></dl>
          <button type="button" onClick={() => setMotion(!motion)} aria-pressed={motion}>{motion ? 'Pause motion' : 'Enable motion'}</button>
          <p className="hint">Drag the scene to orbit. Scroll or pinch to zoom. Motion follows your device preference.</p>
        </aside>
      </section>
      <section className="people" aria-labelledby="people-title">
        <div><p className="eyebrow">Community cast</p><h2 id="people-title">People in this venue</h2><p>Showing {Math.min(CARD_LIMIT, people.length)} of {people.length} fictional members. The JSON includes every member.</p></div>
        <div className="cards">{people.slice(0, CARD_LIMIT).map((person) => <article key={person.githubId}>
          <span className="portrait" aria-hidden="true">✦</span><h3>{person.handle}</h3>
          <p>{person.communityCommitCount} synthetic commits · {avatarTier(person.communityCommitCount)} appearance</p>
        </article>)}</div>
      </section>
    </>}
    <footer>Prototype geometry only. Fixture membership is not online presence. Real identities, complete commit attribution, assets and bounty interactions require later tasks.</footer>
  </main>;
}
