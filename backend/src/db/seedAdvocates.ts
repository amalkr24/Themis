import { db } from './client.js';
import { users, advocateProfiles } from './schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const KERALA_ADVOCATES = [
  {
    name: 'Adv. K. Gopalakrishna Kurup',
    email: 'kurup.advocate@themis.kerala',
    barCouncilNumber: 'K/182/1976',
    practiceAreas: 'Constitutional Law, Civil Litigation, Administrative & Service Law',
    experienceYears: 48,
    bio: 'Designated Senior Advocate and Advocate General of Kerala. Practicing extensively before the High Court of Kerala and the Supreme Court of India, handling landmark constitutional governance and civil administrative matters.',
  },
  {
    name: 'Adv. P. Vijaya Bhanu',
    email: 'vijayabhanu.adv@themis.kerala',
    barCouncilNumber: 'K/312/1984',
    practiceAreas: 'Criminal Defense, Trial Advocacy, Bail & Appellate Litigation',
    experienceYears: 40,
    bio: 'Renowned Senior Advocate at the High Court of Kerala. Leading criminal defense jurist specializing in complex criminal trials, anticipatory bails, and constitutional appellate criminal law.',
  },
  {
    name: 'Adv. Sumathi Dandapani',
    email: 'sumathi.dandapani@themis.kerala',
    barCouncilNumber: 'K/245/1982',
    practiceAreas: 'Civil & Property, Family Law, Partition & Land Disputes',
    experienceYears: 42,
    bio: 'Senior Advocate practicing before the High Court of Kerala and District Judiciary. Renowned expert in civil jurisprudence, property title claims, family settlements, and matrimonial dispute resolution.',
  },
  {
    name: 'Adv. George Poonthottam',
    email: 'george.poonthottam@themis.kerala',
    barCouncilNumber: 'K/410/1988',
    practiceAreas: 'Constitutional, Education Law, Service & Labor Disputes',
    experienceYears: 36,
    bio: 'Senior Advocate at the High Court of Kerala. Highly distinguished counsel in constitutional writ petitions, educational rights, university administration, and labor/service matters.',
  },
  {
    name: 'Adv. Kaleeswaram Raj',
    email: 'kaleeswaram.raj@themis.kerala',
    barCouncilNumber: 'K/520/1995',
    practiceAreas: 'Constitutional, Public Interest Litigation (PIL), Civil Liberties',
    experienceYears: 29,
    bio: 'Prominent Supreme Court of India and Kerala High Court counsel and author. Celebrated for pioneering constitutional public interest litigations, democratic rights advocacy, and administrative jurisprudence.',
  },
  {
    name: 'Adv. Manu Roy',
    email: 'manu.roy@themis.kerala',
    barCouncilNumber: 'K/630/2002',
    practiceAreas: 'Consumer Law, Civil & Property, RERA Real Estate',
    experienceYears: 22,
    bio: 'Experienced litigator practicing at Ernakulam District Consumer Commission, State Commission, and RERA Appellate Tribunal. Specializes in consumer deficiency claims, tenant evictions, and builder dispute cases.',
  },
  {
    name: 'Adv. Sandhya Raju',
    email: 'sandhya.raju@themis.kerala',
    barCouncilNumber: 'K/715/2008',
    practiceAreas: 'Human Rights, Family Law, Domestic Violence & Labor',
    experienceYears: 16,
    bio: 'High Court of Kerala counsel and legal aid practitioner. Specializes in women and children legal protection, domestic violence relief orders, gender rights, and Kerala State Legal Services Authority (KELSA) representations.',
  },
  {
    name: 'Adv. Jithesh Menon',
    email: 'jithesh.menon@themis.kerala',
    barCouncilNumber: 'K/840/2012',
    practiceAreas: 'Cyber Law, Corporate & Commercial, Intellectual Property',
    experienceYears: 12,
    bio: 'Cyber jurisprudence expert and corporate dispute lawyer based in Kochi. Specializes in financial cyber fraud investigations, Information Technology Act compliance, and commercial contract arbitration.',
  },
];

export async function seedFamousAdvocates() {
  try {
    const defaultPasswordHash = await bcrypt.hash('Advocate123!', 10);
    let seededCount = 0;

    // Remove legacy national mock accounts to cleanly display Kerala Advocates
    const oldNationalAdvocates = await db.query.users.findMany({
      where: (u, { and, like, eq }) => and(like(u.email, '%@themis.legal'), eq(u.role, 'advocate')),
    });
    for (const oldUser of oldNationalAdvocates) {
      await db.delete(users).where(eq(users.id, oldUser.id));
    }

    for (const adv of KERALA_ADVOCATES) {
      // Check user existence
      let user = await db.query.users.findFirst({
        where: eq(users.email, adv.email),
      });

      if (!user) {
        const [newUser] = await db
          .insert(users)
          .values({
            name: adv.name,
            email: adv.email,
            passwordHash: defaultPasswordHash,
            role: 'advocate',
          })
          .returning();
        user = newUser;
      } else {
        await db
          .update(users)
          .set({ name: adv.name })
          .where(eq(users.id, user.id));
      }

      // Check profile existence
      const existingProfile = await db.query.advocateProfiles.findFirst({
        where: eq(advocateProfiles.userId, user.id),
      });

      if (!existingProfile) {
        await db.insert(advocateProfiles).values({
          userId: user.id,
          barCouncilNumber: adv.barCouncilNumber,
          practiceAreas: adv.practiceAreas,
          experienceYears: adv.experienceYears,
          bio: adv.bio,
          status: 'approved',
        });
        seededCount++;
      } else {
        await db
          .update(advocateProfiles)
          .set({
            barCouncilNumber: adv.barCouncilNumber,
            practiceAreas: adv.practiceAreas,
            experienceYears: adv.experienceYears,
            bio: adv.bio,
            status: 'approved',
          })
          .where(eq(advocateProfiles.id, existingProfile.id));
        seededCount++;
      }
    }

    return { seeded: true, count: seededCount, message: `Successfully seeded ${seededCount} Kerala advocates.` };
  } catch (err: any) {
    console.error('Error seeding Kerala advocates:', err);
    return { seeded: false, count: 0, error: err.message };
  }
}
