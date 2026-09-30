import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { consultations, advocateProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { createNotification } from './notifications.js';

export const consultationsRouter = router({
  // 1. Create or Launch a Live Video Consultation
  createSession: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().uuid(),
        caseId: z.string().uuid().optional(),
        connectionId: z.string().uuid().optional(),
        title: z.string().min(3).default('Virtual Legal Consultation'),
        scheduledAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let citizenId: string;
      let advocateId: string;

      if (ctx.user.role === 'advocate') {
        advocateId = ctx.user.id;
        citizenId = input.targetUserId;
      } else if (ctx.user.role === 'citizen') {
        citizenId = ctx.user.id;
        advocateId = input.targetUserId;
      } else {
        citizenId = input.targetUserId;
        advocateId = ctx.user.id;
      }

      // Generate a unique, secure WebRTC meeting room ID
      const roomId = `themis-room-${Math.random().toString(36).substring(2, 8)}-${Date.now().toString(36)}`;

      const [newSession] = await db
        .insert(consultations)
        .values({
          citizenId,
          advocateId,
          caseId: input.caseId,
          connectionId: input.connectionId,
          title: input.title,
          status: 'active',
          meetingRoomId: roomId,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
          startedAt: new Date(),
        })
        .returning();

      // Notify the other party immediately to join
      try {
        const callerName = ctx.user.role === 'advocate' ? `Adv. ${ctx.user.name}` : ctx.user.name;
        await createNotification({
          userId: input.targetUserId,
          type: 'consultation_started',
          title: 'Live Legal Video Consultation Started',
          message: `${callerName} has launched an online consultation room for your case. Click to join the video session.`,
          relatedId: newSession.id,
        });
      } catch (err) {
        console.error('Failed to notify consultation start', err);
      }

      return newSession;
    }),

  // 2. Get Video Consultation Room Details (with Case & Document companion)
  getRoom: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const session = await db.query.consultations.findFirst({
        where: eq(consultations.id, input.id),
        with: {
          citizen: {
            columns: { id: true, name: true, email: true },
          },
          advocate: {
            columns: { id: true, name: true, email: true },
          },
          case: {
            with: {
              documents: {
                orderBy: (docs, { desc }) => [desc(docs.createdAt)],
              },
              hearings: {
                orderBy: (h, { desc }) => [desc(h.hearingDate)],
              },
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Consultation room not found or session has expired.',
        });
      }

      if (
        ctx.user.role !== 'admin' &&
        session.citizenId !== ctx.user.id &&
        session.advocateId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to access this consultation room',
        });
      }

      // Also get advocate profile
      const advocateProfile = await db.query.advocateProfiles.findFirst({
        where: eq(advocateProfiles.userId, session.advocateId),
      });

      return {
        ...session,
        advocateProfile,
      };
    }),

  // 3. Complete Consultation Session & Save Counsel Notes
  completeSession: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        sessionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = await db.query.consultations.findFirst({
        where: eq(consultations.id, input.id),
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      if (
        ctx.user.role !== 'admin' &&
        session.citizenId !== ctx.user.id &&
        session.advocateId !== ctx.user.id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const [updated] = await db
        .update(consultations)
        .set({
          status: 'completed',
          endedAt: new Date(),
          sessionNotes: input.sessionNotes,
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, input.id))
        .returning();

      // Notify the other party that consultation completed
      const otherUserId = ctx.user.id === session.advocateId ? session.citizenId : session.advocateId;
      try {
        await createNotification({
          userId: otherUserId,
          type: 'case_update',
          title: 'Legal Consultation Completed',
          message: `The legal consultation session has concluded and counsel notes have been recorded.`,
          relatedId: session.caseId || session.id,
        });
      } catch (err) {
        console.error('Failed to notify consultation completion', err);
      }

      return updated;
    }),

  // 4. List Consultations for a Case
  listForCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.consultations.findMany({
        where: eq(consultations.caseId, input.caseId),
        with: {
          advocate: {
            columns: { id: true, name: true, email: true },
          },
          citizen: {
            columns: { id: true, name: true, email: true },
          },
        },
        orderBy: (c, { desc: d }) => [d(c.createdAt)],
      });
    }),

  // 5. List My Consultations (Citizen or Advocate)
  listMyConsultations: protectedProcedure.query(async ({ ctx }) => {
    const whereClause =
      ctx.user.role === 'advocate'
        ? eq(consultations.advocateId, ctx.user.id)
        : eq(consultations.citizenId, ctx.user.id);

    return db.query.consultations.findMany({
      where: whereClause,
      with: {
        citizen: {
          columns: { id: true, name: true, email: true },
        },
        advocate: {
          columns: { id: true, name: true, email: true },
        },
        case: {
          columns: { id: true, title: true, category: true },
        },
      },
      orderBy: (c, { desc: d }) => [d(c.createdAt)],
      limit: 20,
    });
  }),
});
