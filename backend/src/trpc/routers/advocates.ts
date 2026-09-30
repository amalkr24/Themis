import { router, publicProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { advocateProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { seedFamousAdvocates } from '../../db/seedAdvocates.js';

export const advocatesRouter = router({
  listApproved: publicProcedure.query(async () => {
    let approved = await db.query.advocateProfiles.findMany({
      where: eq(advocateProfiles.status, 'approved'),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (profiles, { desc }) => [desc(profiles.experienceYears)],
    });

    // Auto-seed famous advocates if none exist in the system yet
    if (!approved || approved.length === 0) {
      await seedFamousAdvocates();
      approved = await db.query.advocateProfiles.findMany({
        where: eq(advocateProfiles.status, 'approved'),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (profiles, { desc }) => [desc(profiles.experienceYears)],
      });
    }

    return approved;
  }),

  seedSampleAdvocates: publicProcedure.mutation(async () => {
    return seedFamousAdvocates();
  }),

  getProfile: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const profile = await db.query.advocateProfiles.findFirst({
        where: eq(advocateProfiles.userId, input.userId),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Advocate profile not found',
        });
      }

      return profile;
    }),
});
