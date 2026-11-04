import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import type { Mesh } from 'three';
import type { CommunityPerson } from '../domain/community';
import { avatarTier } from '../domain/community';

const colors = ['#e4a557', '#8cc8c2', '#bd9cdd'];

function Performer({ reducedMotion }: { reducedMotion: boolean }) {
  const head = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (head.current && !reducedMotion) head.current.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.12;
  });
  return (
    <group position={[0, 0.65, -1.2]}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.34, 0.42, 1, 12]} /><meshStandardMaterial color="#ea746c" /></mesh>
      <mesh ref={head} position={[0, 1.22, 0]} castShadow><sphereGeometry args={[0.31, 16, 12]} /><meshStandardMaterial color="#f2c9a5" /></mesh>
    </group>
  );
}

function Audience({ people }: { people: CommunityPerson[] }) {
  return <>{people.map((person, index) => {
    const tier = avatarTier(person.communityCommitCount);
    const x = (index - (people.length - 1) / 2) * 1.4;
    return <group key={person.githubId} position={[x, 0.35, 1.2 + index % 2 * 0.35]}>
      <mesh position={[0, 0.57, 0]} castShadow><cylinderGeometry args={[0.25, 0.32, 0.9, 10]} /><meshStandardMaterial color={colors[index % colors.length]} /></mesh>
      <mesh position={[0, 1.23, 0]} castShadow><sphereGeometry args={[0.27, 12, 10]} /><meshStandardMaterial color="#f4d2b5" /></mesh>
      {tier !== 'base' && tier !== 'unknown' && <mesh position={[0.34, 0.84, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#ffd777" /></mesh>}
      {(tier === 'special' || tier === 'veteran') && <mesh position={[0, 1.55, 0]}><coneGeometry args={[0.29, 0.27, 10]} /><meshStandardMaterial color="#7e78a7" /></mesh>}
    </group>;
  })}</>;
}

export function VenueScene({ people, reducedMotion, onReady }: { people: CommunityPerson[]; reducedMotion: boolean; onReady: () => void }) {
  return <Canvas shadows camera={{ position: [5, 4.5, 6.5], fov: 48 }} onCreated={onReady}>
    <color attach="background" args={['#141c2c']} />
    <ambientLight intensity={1.4} />
    <directionalLight position={[4, 7, 5]} intensity={2} castShadow />
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 16]} /><meshStandardMaterial color="#324755" /></mesh>
    <mesh position={[0, 0.25, -1.3]} receiveShadow castShadow><boxGeometry args={[4.6, 0.5, 2.1]} /><meshStandardMaterial color="#745967" /></mesh>
    <mesh position={[0, 0.3, 0.3]}><torusGeometry args={[3, 0.045, 8, 48, Math.PI]} /><meshStandardMaterial color="#d7ab70" /></mesh>
    <Performer reducedMotion={reducedMotion} />
    <Audience people={people} />
    <OrbitControls enablePan={false} enableZoom minDistance={5} maxDistance={12} maxPolarAngle={Math.PI / 2.05} />
  </Canvas>;
}
