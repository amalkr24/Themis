import { router, adminProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { advocateProfiles, users, cases, generatedDocuments, caseHearings } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { createNotification } from './notifications.js';

export const adminRouter = router({
  // 1. High-level Summary Stats
  getStats: adminProcedure.query(async () => {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalCases = await db.select({ count: sql<number>`count(*)` }).from(cases);
    const totalDocs = await db.select({ count: sql<number>`count(*)` }).from(generatedDocuments);
    const totalHearings = await db.select({ count: sql<number>`count(*)` }).from(caseHearings);

    const approvedAdvocates = await db
      .select({ count: sql<number>`count(*)` })
      .from(advocateProfiles)
      .where(eq(advocateProfiles.status, 'approved'));

    const pendingAdvocates = await db
      .select({ count: sql<number>`count(*)` })
      .from(advocateProfiles)
      .where(eq(advocateProfiles.status, 'pending'));

    const citizens = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'citizen'));

    const activeCases = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(eq(cases.status, 'active'));

    const closedCases = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(eq(cases.status, 'closed'));

    return {
      citizensCount: Number(citizens[0]?.count || 0),
      approvedAdvocatesCount: Number(approvedAdvocates[0]?.count || 0),
      pendingAdvocatesCount: Number(pendingAdvocates[0]?.count || 0),
      totalUsersCount: Number(totalUsers[0]?.count || 0),
      casesCount: Number(totalCases[0]?.count || 0),
      activeCasesCount: Number(activeCases[0]?.count || 0),
      closedCasesCount: Number(closedCases[0]?.count || 0),
      documentsCount: Number(totalDocs[0]?.count || 0),
      hearingsCount: Number(totalHearings[0]?.count || 0),
    };
  }),

  // 2. Users Management List (Citizens & Advocates)
  getUsersList: adminProcedure.query(async () => {
    return db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      with: {
        profile: {
          columns: {
            status: true,
            barCouncilNumber: true,
            experienceYears: true,
            practiceAreas: true,
          },
        },
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
  }),

  // 3. Advocates Management (All Advocates + Status)
  getAllAdvocates: adminProcedure.query(async () => {
    return db.query.advocateProfiles.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        verifier: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
    });
  }),

  // 4. Pending Advocates (For quick verification queue)
  getPendingAdvocates: adminProcedure.query(async () => {
    return db.query.advocateProfiles.findMany({
      where: eq(advocateProfiles.status, 'pending'),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (profiles, { asc }) => [asc(profiles.createdAt)],
    });
  }),

  // 5. Verify / Approve / Reject Advocate
  verifyAdvocate: adminProcedure
    .input(
      z.object({
        profileId: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const profile = await db.query.advocateProfiles.findFirst({
        where: eq(advocateProfiles.id, input.profileId),
      });

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Advocate profile not found',
        });
      }

      const [updatedProfile] = await db
        .update(advocateProfiles)
        .set({
          status: input.status,
          verifiedAt: new Date(),
          verifiedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(advocateProfiles.id, input.profileId))
        .returning();

      // Notify the advocate of verification result
      try {
        await createNotification({
          userId: profile.userId,
          type: input.status === 'approved' ? 'connection_accepted' : 'connection_rejected',
          title: input.status === 'approved' ? 'Bar Council Credentials Verified' : 'Verification Update',
          message: input.status === 'approved'
            ? 'Congratulations! Your Bar Council credentials have been verified by the Registry Admin. Your profile is now live in the Advocate Directory.'
            : 'Your advocate verification application was rejected. Please contact the Registry administrator.',
          relatedId: profile.id,
        });
      } catch (err) {
        console.error('Failed to notify advocate of verification result', err);
      }

      return updatedProfile;
    }),

  // 6. Case Registry & Monitoring
  getAllCases: adminProcedure.query(async () => {
    return db.query.cases.findMany({
      with: {
        citizen: {
          columns: { id: true, name: true, email: true },
        },
        advocate: {
          columns: { id: true, name: true, email: true },
        },
        hearings: {
          columns: { id: true, hearingDate: true, status: true, notes: true },
        },
        documents: {
          columns: { id: true, title: true, createdAt: true },
        },
      },
      orderBy: (cases, { desc }) => [desc(cases.createdAt)],
    });
  }),

  // 7. System Documents Management
  getAllDocuments: adminProcedure.query(async () => {
    return db.query.generatedDocuments.findMany({
      with: {
        template: {
          columns: { id: true, title: true, category: true },
        },
        user: {
          columns: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: (docs, { desc }) => [desc(docs.createdAt)],
    });
  }),

  // 8. Detailed Analytics & Platform Reports
  getDetailedReports: adminProcedure.query(async () => {
    const casesByCategory = await db
      .select({
        category: cases.category,
        count: sql<number>`count(*)`,
      })
      .from(cases)
      .groupBy(cases.category);

    const casesByStatus = await db
      .select({
        status: cases.status,
        count: sql<number>`count(*)`,
      })
      .from(cases)
      .groupBy(cases.status);

    const advocatesByStatus = await db
      .select({
        status: advocateProfiles.status,
        count: sql<number>`count(*)`,
      })
      .from(advocateProfiles)
      .groupBy(advocateProfiles.status);

    return {
      casesByCategory: casesByCategory.map((c) => ({
        category: c.category,
        count: Number(c.count),
      })),
      casesByStatus: casesByStatus.map((c) => ({
        status: c.status,
        count: Number(c.count),
      })),
      advocatesByStatus: advocatesByStatus.map((a) => ({
        status: a.status,
        count: Number(a.count),
      })),
    };
  }),
});
