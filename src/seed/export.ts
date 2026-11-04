import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DEFAULT_SEED, generateFixture } from './generate.ts';

const args = process.argv.slice(2);
let seed = DEFAULT_SEED;
let output = 'public/fixtures/large.json';
for (let index = 0; index < args.length; index += 2) {
  if (args[index] === '--seed' && args[index + 1]) seed = args[index + 1];
  else if (args[index] === '--out' && args[index + 1]) output = args[index + 1];
  else throw new Error('Usage: npm run seed:generate -- [--seed text] [--out path]');
}

const fixture = generateFixture(seed);
const path = resolve(output);
await mkdir(dirname(path), { recursive: true });
await writeFile(path, `${JSON.stringify(fixture)}\n`, 'utf8');
const membershipCount = fixture.venues.reduce((sum, venue) => sum + venue.people.length, 0);
const uniquePeople = new Set(fixture.venues.flatMap((venue) => venue.people.map((person) => person.githubId))).size;
console.log(`${path}: ${fixture.venues.length} communities, ${membershipCount} memberships, ${uniquePeople} unique fixture people, ${fixture.repositories.length} repositories`);
