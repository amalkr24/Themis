import { seedFamousAdvocates } from './seedAdvocates.js';
import { seedIndiaCodeDatabase } from './seedIndiaCode.js';
import { db } from './client.js';
import { users, advocateProfiles } from './schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedCoreAccounts() {
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const advocateHash = await bcrypt.hash('Advocate123!', 10);
  const userHash = await bcrypt.hash('User123!', 10);
  const citizenHash = await bcrypt.hash('Citizen123!', 10);

  // 1. Admin account: admin@themis.com / Admin123!
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
  } else {
    await db.update(users).set({ passwordHash: adminHash, role: 'admin' }).where(eq(users.id, existingAdminCom.id));
    console.log('Updated admin@themis.com password to Admin123!');
  }

  // 2. Demo Advocate account: advocate@themis.com / Advocate123!
  let advocateUser = await db.query.users.findFirst({
    where: eq(users.email, 'advocate@themis.com'),
  });
  if (!advocateUser) {
    const [newAdv] = await db.insert(users).values({
      name: 'Adv. Rajesh Menon',
      email: 'advocate@themis.com',
      passwordHash: advocateHash,
      role: 'advocate',
    }).returning();
    advocateUser = newAdv;
    console.log('Created advocate@themis.com (Advocate123!)');
  } else {
    await db.update(users).set({ passwordHash: advocateHash, role: 'advocate' }).where(eq(users.id, advocateUser.id));
  }

  // Ensure advocate profile for advocate@themis.com
  const existingAdvProfile = await db.query.advocateProfiles.findFirst({
    where: eq(advocateProfiles.userId, advocateUser.id),
  });
  if (!existingAdvProfile) {
    await db.insert(advocateProfiles).values({
      userId: advocateUser.id,
      barCouncilNumber: 'K/999/2015',
      practiceAreas: 'Civil, Criminal & Constitutional Law',
      experienceYears: 15,
      bio: 'Senior Panel Legal Aid Advocate, High Court of Kerala.',
      status: 'approved',
    });
    console.log('Created approved profile for advocate@themis.com');
  } else {
    await db.update(advocateProfiles).set({ status: 'approved' }).where(eq(advocateProfiles.id, existingAdvProfile.id));
  }

  // 3. User account: user@themis.com / User123!
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, 'user@themis.com'),
  });
  if (!existingUser) {
    await db.insert(users).values({
      name: 'Rahul Verma (User)',
      email: 'user@themis.com',
      passwordHash: userHash,
      role: 'citizen',
    });
    console.log('Created user@themis.com (User123!)');
  } else {
    await db.update(users).set({ passwordHash: userHash, role: 'citizen' }).where(eq(users.id, existingUser.id));
  }

  // 4. Citizen account: citizen@themis.com / Citizen123!
  const existingCitizen = await db.query.users.findFirst({
    where: eq(users.email, 'citizen@themis.com'),
  });
  if (!existingCitizen) {
    await db.insert(users).values({
      name: 'Rohan Sharma (Citizen Client)',
      email: 'citizen@themis.com',
      passwordHash: citizenHash,
      role: 'citizen',
    });
    console.log('Created citizen@themis.com (Citizen123!)');
  } else {
    await db.update(users).set({ passwordHash: citizenHash, role: 'citizen' }).where(eq(users.id, existingCitizen.id));
  }
}

async function main() {
  console.log('Seeding famous advocates into database...');
  const resAdv = await seedFamousAdvocates();
  console.log('Advocates seed result:', resAdv);

  console.log('Seeding core demo accounts (Admin, Advocate & Citizen/User)...');
  await seedCoreAccounts();

  console.log('Seeding India Code acts and sections into database...');
  const resLaws = await seedIndiaCodeDatabase();
  console.log('India Code seed result:', resLaws);

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
