import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../../db/client.js';
import { acts, actSections } from '../../db/schema.js';
import { eq, or, ilike, and } from 'drizzle-orm';
import { seedIndiaCodeDatabase } from '../../db/seedIndiaCode.js';

export const lawsRouter = router({
  // Search acts and statutory sections with citizen-friendly filtering
  search: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        actId: z.string().optional(),
        limit: z.number().min(1).max(250).default(100),
      })
    )
    .query(async ({ input }) => {
      const { query, category, actId, limit } = input;

      // Base query joining sections with their parent Act
      const conditions: any[] = [];

      // If specific act is requested, filter by actId directly without category collision
      if (actId) {
        conditions.push(eq(actSections.actId, actId));
      } else if (category && category !== 'All') {
        conditions.push(eq(acts.category, category));
      }

      if (query && query.trim().length > 0) {
        const pattern = `%${query.trim()}%`;
        conditions.push(
          or(
            ilike(actSections.sectionNumber, pattern),
            ilike(actSections.sectionTitle, pattern),
            ilike(actSections.plainSummary, pattern),
            ilike(actSections.legalText, pattern),
            ilike(actSections.punishmentOrRemedy, pattern),
            ilike(acts.title, pattern),
            ilike(acts.shortTitle, pattern)
          )
        );
      }

      const rows = await db
        .select({
          id: actSections.id,
          actId: actSections.actId,
          sectionNumber: actSections.sectionNumber,
          sectionTitle: actSections.sectionTitle,
          legalText: actSections.legalText,
          plainSummary: actSections.plainSummary,
          punishmentOrRemedy: actSections.punishmentOrRemedy,
          cognizable: actSections.cognizable,
          bailable: actSections.bailable,
          forum: actSections.forum,
          keyPrecedent: actSections.keyPrecedent,
          act: {
            id: acts.id,
            title: acts.title,
            shortTitle: acts.shortTitle,
            actNumber: acts.actNumber,
            actYear: acts.actYear,
            category: acts.category,
            ministry: acts.ministry,
            indiaCodeUrl: acts.indiaCodeUrl,
            overview: acts.overview,
          },
        })
        .from(actSections)
        .innerJoin(acts, eq(actSections.actId, acts.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit);

      return rows;
    }),

  // List all registered central/state legislation with section counts
  listActs: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const category = input?.category;
      const whereCondition = category && category !== 'All' ? eq(acts.category, category) : undefined;

      const actList = await db.query.acts.findMany({
        where: whereCondition,
        with: {
          sections: {
            columns: {
              id: true,
              sectionNumber: true,
            },
          },
        },
        orderBy: (acts, { asc }) => [asc(acts.title)],
      });

      return actList.map((a) => ({
        id: a.id,
        title: a.title,
        shortTitle: a.shortTitle,
        actNumber: a.actNumber,
        actYear: a.actYear,
        category: a.category,
        ministry: a.ministry,
        indiaCodeUrl: a.indiaCodeUrl,
        overview: a.overview,
        sectionCount: a.sections.length,
      }));
    }),

  // Fetch full details of an act including all statutory sections
  getActDetails: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const act = await db.query.acts.findFirst({
        where: eq(acts.id, input.id),
        with: {
          sections: true,
        },
      });

      if (!act) {
        throw new Error('Act not found in the India Code National Repository.');
      }

      return act;
    }),

  // Get categories available in the repository
  getCategories: publicProcedure.query(async () => {
    const results = await db
      .select({ category: acts.category })
      .from(acts)
      .groupBy(acts.category);

    return results.map((r) => r.category);
  }),

  // Seed or re-seed the official India Code database
  seed: publicProcedure.mutation(async () => {
    return await seedIndiaCodeDatabase();
  }),
});
