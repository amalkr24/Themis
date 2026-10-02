import { seedFamousAdvocates } from './seedAdvocates.js';
import { seedIndiaCodeDatabase } from './seedIndiaCode.js';
import { db } from './client.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedCoreAccounts() {
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const citizenHash = await bcrypt.hash('Citizen123!', 10);

  // 1. Admin account: admin@themis.legal / Admin123!
  const existingAdminLegal = await db.query.users.findFirst({
    where: eq(users.email, 'admin@themis.legal'),
  });
  if (!existingAdminLegal) {
    await db.insert(users).values({
      name: 'Themis Platform Administrator',
      email: 'admin@themis.legal',
      passwordHash: adminHash,
      role: 'admin',
    });
    console.log('Created admin@themis.legal (Admin123!)');
  }

  // Also support admin@themis.com
  const existingAdminCom = await db.query.users.findFirst({
    where: eq(users.email, 'admin@themis.com'),
  });
  if (!existingAdminCom) {
    await db.insert(users).values({
      name: 'Themis Platform Administrator',
      email: 'admin@themis.com',
      passwordHash: adminHash,
      role: 'admin',
    });
    console.log('Created admin@themis.com (Admin123!)');
  }

  // 2. Citizen account: citizen@themis.legal / Citizen123!
  const existingCitizen = await db.query.users.findFirst({
    where: eq(users.email, 'citizen@themis.legal'),
  });
  if (!existingCitizen) {
    await db.insert(users).values({
      name: 'Rohan Sharma (Citizen Client)',
      email: 'citizen@themis.legal',
      passwordHash: citizenHash,
      role: 'citizen',
    });
    console.log('Created citizen@themis.legal (Citizen123!)');
  }
}

async function main() {
  console.log('Seeding core accounts (Admin & Citizen)...');
  await seedCoreAccounts();

  console.log('Seeding famous advocates into database...');
  const resAdv = await seedFamousAdvocates();
  console.log('Advocates seed result:', resAdv);

  console.log('Seeding India Code acts and sections into database...');
  const resLaws = await seedIndiaCodeDatabase();
  console.log('India Code seed result:', resLaws);

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
