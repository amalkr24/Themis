import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { assessments } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const assessmentsRouter = router({
  // 1. Save Completed Assessment
  saveAssessment: protectedProcedure
    .input(
      z.object({
        category: z.string().min(1),
        score: z.number().int(),
        status: z.enum(['strong', 'moderate', 'weak']),
        title: z.string().min(1),
        summary: z.string().min(1),
        actionRecommendation: z.string().min(1),
        answers: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [saved] = await db
        .insert(assessments)
        .values({
          userId: ctx.user.id,
          category: input.category,
          score: input.score,
          status: input.status,
          title: input.title,
          summary: input.summary,
          actionRecommendation: input.actionRecommendation,
          answers: input.answers || {},
        })
        .returning();

      return saved;
    }),

  // 2. List Logged-in Citizen's Saved Assessments
  listMyAssessments: protectedProcedure.query(async ({ ctx }) => {
    return db.query.assessments.findMany({
      where: eq(assessments.userId, ctx.user.id),
      orderBy: (a, { desc: d }) => [d(a.createdAt)],
    });
  }),

  // 3. Get Single Assessment Report
  getAssessment: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const report = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.id),
      });

      if (!report) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assessment report not found' });
      }

      if (ctx.user.role !== 'admin' && report.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      return report;
    }),

  // 4. Delete an Assessment
  deleteAssessment: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assessment not found' });
      }

      if (ctx.user.role !== 'admin' && existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      await db.delete(assessments).where(eq(assessments.id, input.id));
      return { success: true, id: input.id };
    }),
});
