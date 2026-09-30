import { seedFamousAdvocates } from './seedAdvocates.js';

async function main() {
  console.log('Seeding famous advocates into database...');
  const res = await seedFamousAdvocates();
  console.log('Seed result:', res);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
