import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { cases, caseHearings, caseDocuments } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { createNotification } from './notifications.js';

export const casesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3),
        description: z.string().min(10),
        category: z.string(),
        advocateId: z.string().uuid().optional(),
        citizenId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let citizenId: string;
      let advocateId: string | undefined;

      if (ctx.user.role === 'citizen') {
        citizenId = ctx.user.id;
        advocateId = input.advocateId;
      } else if (ctx.user.role === 'advocate') {
        if (!input.citizenId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Client selection is required when counsel creates a case file.',
          });
        }
        citizenId = input.citizenId;
        advocateId = ctx.user.id;
      } else {
        // Admin
        citizenId = input.citizenId || ctx.user.id;
        advocateId = input.advocateId;
      }

      const [newCase] = await db
        .insert(cases)
        .values({
          title: input.title,
          description: input.description,
          category: input.category,
          citizenId,
          advocateId,
          status: advocateId ? 'active' : 'pending',
        })
        .returning();

      // Notify the other party
      try {
        if (ctx.user.role === 'advocate' && citizenId) {
          await createNotification({
            userId: citizenId,
            type: 'case_update',
            title: `New Case File Created by Counsel`,
            message: `Adv. ${ctx.user.name} has opened a new formal case file: "${newCase.title}".`,
            relatedId: newCase.id,
          });
        } else if (ctx.user.role === 'citizen' && advocateId) {
          await createNotification({
            userId: advocateId,
            type: 'case_update',
            title: `New Client Case Assigned`,
            message: `${ctx.user.name} has filed a new case and assigned it to your counsel: "${newCase.title}".`,
            relatedId: newCase.id,
          });
        }
      } catch (err) {
        console.error('Failed to notify case creation', err);
      }

      return newCase;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    let whereClause;
    if (ctx.user.role === 'citizen') {
      whereClause = eq(cases.citizenId, ctx.user.id);
    } else if (ctx.user.role === 'advocate') {
      whereClause = eq(cases.advocateId, ctx.user.id);
    }

    return db.query.cases.findMany({
      where: whereClause,
      with: {
        citizen: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        advocate: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (cases, { desc }) => [desc(cases.createdAt)],
    });
  }),

  getDetails: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const caseItem = await db.query.cases.findFirst({
        where: eq(cases.id, input.id),
        with: {
          citizen: { columns: { id: true, name: true, email: true } },
          advocate: { columns: { id: true, name: true, email: true } },
          hearings: {
            orderBy: (hearings, { asc }) => [asc(hearings.hearingDate)],
          },
          documents: {
            orderBy: (docs, { desc }) => [desc(docs.createdAt)],
          },
        },
      });

      if (!caseItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Case not found',
        });
      }

      // Check access permissions
      if (
        ctx.user.role !== 'admin' &&
        caseItem.citizenId !== ctx.user.id &&
        caseItem.advocateId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to view this case',
        });
      }

      return caseItem;
    }),

  addHearing: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        hearingDate: z.string().datetime(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const caseItem = await db.query.cases.findFirst({
        where: eq(cases.id, input.caseId),
      });

      if (!caseItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      // Only the assigned advocate, client or admin can add hearings
      if (
        ctx.user.role !== 'admin' &&
        caseItem.citizenId !== ctx.user.id &&
        caseItem.advocateId !== ctx.user.id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const [hearing] = await db
        .insert(caseHearings)
        .values({
          caseId: input.caseId,
          hearingDate: new Date(input.hearingDate),
          notes: input.notes,
          status: 'scheduled',
        })
        .returning();

      // Notify relevant parties
      try {
        const formattedDate = new Date(input.hearingDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        
        // Notify citizen if scheduled by advocate or admin
        if (caseItem.citizenId && caseItem.citizenId !== ctx.user.id) {
          await createNotification({
            userId: caseItem.citizenId,
            type: 'hearing_scheduled',
            title: 'Court Hearing Scheduled',
            message: `A new hearing for "${caseItem.title}" has been scheduled for ${formattedDate}.`,
            relatedId: caseItem.id,
          });
        }
        
        // Notify advocate if scheduled by admin or citizen
        if (caseItem.advocateId && caseItem.advocateId !== ctx.user.id) {
          await createNotification({
            userId: caseItem.advocateId,
            type: 'hearing_scheduled',
            title: 'Court Hearing Scheduled',
            message: `A new hearing for "${caseItem.title}" has been scheduled for ${formattedDate}.`,
            relatedId: caseItem.id,
          });
        }
      } catch (err) {
        console.error('Failed to notify hearing scheduling', err);
      }

      return hearing;
    }),

  addDocument: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        title: z.string().min(1),
        filePath: z.string().min(1),
        fileType: z.string().min(1),
        fileSize: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const caseItem = await db.query.cases.findFirst({
        where: eq(cases.id, input.caseId),
      });

      if (!caseItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      if (
        ctx.user.role !== 'admin' &&
        caseItem.citizenId !== ctx.user.id &&
        caseItem.advocateId !== ctx.user.id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const [document] = await db
        .insert(caseDocuments)
        .values({
          caseId: input.caseId,
          uploaderId: ctx.user.id,
          title: input.title,
          filePath: input.filePath,
          fileType: input.fileType,
          fileSize: input.fileSize,
        })
        .returning();

      return document;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        status: z.enum(['pending', 'active', 'closed']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const caseItem = await db.query.cases.findFirst({
        where: eq(cases.id, input.caseId),
      });

      if (!caseItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      if (ctx.user.role !== 'admin' && caseItem.advocateId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the assigned advocate or admin can update status',
        });
      }

      const [updatedCase] = await db
        .update(cases)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(cases.id, input.caseId))
        .returning();

      // Notify citizen if status was changed
      try {
        if (caseItem.citizenId) {
          await createNotification({
            userId: caseItem.citizenId,
            type: 'case_update',
            title: `Case Status Updated: ${input.status.toUpperCase()}`,
            message: `The status of case "${caseItem.title}" has been updated to ${input.status}.`,
            relatedId: caseItem.id,
          });
        }
      } catch (err) {
        console.error('Failed to notify case status update', err);
      }

      return updatedCase;
    }),

  assignAdvocate: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        advocateId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only court administrators can assign or reassign advocates to cases',
        });
      }

      const caseItem = await db.query.cases.findFirst({
        where: eq(cases.id, input.caseId),
      });

      if (!caseItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      const [updatedCase] = await db
        .update(cases)
        .set({
          advocateId: input.advocateId,
          status: caseItem.status === 'pending' ? 'active' : caseItem.status,
          updatedAt: new Date(),
        })
        .where(eq(cases.id, input.caseId))
        .returning();

      // Notify citizen and advocate
      try {
        if (caseItem.citizenId) {
          await createNotification({
            userId: caseItem.citizenId,
            type: 'case_update',
            title: 'Advocate Assigned by Registry',
            message: `Court Registry has assigned legal counsel to your case "${caseItem.title}".`,
            relatedId: caseItem.id,
          });
        }
        await createNotification({
          userId: input.advocateId,
          type: 'case_update',
          title: 'New Case Assigned by Registry',
          message: `Court Registry has appointed your counsel to represent case "${caseItem.title}".`,
          relatedId: caseItem.id,
        });
      } catch (err) {
        console.error('Failed to notify assignment', err);
      }

      return updatedCase;
    }),

  deleteHearing: protectedProcedure
    .input(z.object({ hearingId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const hearing = await db.query.caseHearings.findFirst({
        where: eq(caseHearings.id, input.hearingId),
        with: {
          case: true,
        },
      });

      if (!hearing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hearing record not found' });
      }

      if (
        ctx.user.role !== 'admin' &&
        hearing.case.citizenId !== ctx.user.id &&
        hearing.case.advocateId !== ctx.user.id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to delete this hearing' });
      }

      await db.delete(caseHearings).where(eq(caseHearings.id, input.hearingId));
      return { success: true };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const doc = await db.query.caseDocuments.findFirst({
        where: eq(caseDocuments.id, input.documentId),
        with: {
          case: true,
        },
      });

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      if (
        ctx.user.role !== 'admin' &&
        doc.uploaderId !== ctx.user.id &&
        doc.case.citizenId !== ctx.user.id &&
        doc.case.advocateId !== ctx.user.id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to delete this document' });
      }

      await db.delete(caseDocuments).where(eq(caseDocuments.id, input.documentId));
      return { success: true };
    }),

  deleteCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const caseItem = await db.query.cases.findFirst({
        where: eq(cases.id, input.caseId),
      });

      if (!caseItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      if (ctx.user.role !== 'admin' && caseItem.citizenId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to delete this case file' });
      }

      await db.delete(cases).where(eq(cases.id, input.caseId));
      return { success: true };
    }),
});

