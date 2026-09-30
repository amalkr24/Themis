import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { connectionRequests, cases, advocateProfiles } from '../../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { createNotification } from './notifications.js';

export const connectionsRouter = router({
  // Citizen sends a connection request to an advocate
  sendRequest: protectedProcedure
    .input(
      z.object({
        advocateId: z.string().uuid(),
        caseId: z.string().uuid().optional(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'citizen') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only citizens can send connection requests',
        });
      }

      // Check advocate exists and is approved
      const advocateProfile = await db.query.advocateProfiles.findFirst({
        where: eq(advocateProfiles.userId, input.advocateId),
      });

      if (!advocateProfile || advocateProfile.status !== 'approved') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Advocate not found or not yet verified',
        });
      }

      // Check for existing pending/accepted request to same advocate
      const existing = await db.query.connectionRequests.findFirst({
        where: and(
          eq(connectionRequests.citizenId, ctx.user.id),
          eq(connectionRequests.advocateId, input.advocateId),
          or(
            eq(connectionRequests.status, 'pending'),
            eq(connectionRequests.status, 'accepted')
          )
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            existing.status === 'pending'
              ? 'You already have a pending request to this advocate'
              : 'You are already connected with this advocate',
        });
      }

      // Validate case belongs to citizen if provided
      if (input.caseId) {
        const caseItem = await db.query.cases.findFirst({
          where: and(
            eq(cases.id, input.caseId),
            eq(cases.citizenId, ctx.user.id)
          ),
        });
        if (!caseItem) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Case not found or does not belong to you',
          });
        }
      }

      const [request] = await db
        .insert(connectionRequests)
        .values({
          citizenId: ctx.user.id,
          advocateId: input.advocateId,
          caseId: input.caseId,
          message: input.message,
          status: 'pending',
        })
        .returning();

      // Notify the advocate
      try {
        await createNotification({
          userId: input.advocateId,
          type: 'connection_request',
          title: 'New Representation Request',
          message: `${ctx.user.name} sent you a request for legal representation.`,
          relatedId: request.id,
        });
      } catch (err) {
        console.error('Failed to create notification', err);
      }

      return request;
    }),

  // Citizen views their sent requests
  listMyRequests: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'citizen') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Citizens only' });
    }

    return db.query.connectionRequests.findMany({
      where: eq(connectionRequests.citizenId, ctx.user.id),
      with: {
        advocate: {
          columns: { id: true, name: true, email: true },
        },
        case: {
          columns: { id: true, title: true, category: true, status: true },
        },
      },
      orderBy: (cr, { desc }) => [desc(cr.createdAt)],
    });
  }),

  // Advocate views incoming requests
  listIncoming: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'advocate') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Advocates only' });
    }

    return db.query.connectionRequests.findMany({
      where: eq(connectionRequests.advocateId, ctx.user.id),
      with: {
        citizen: {
          columns: { id: true, name: true, email: true },
        },
        case: {
          columns: { id: true, title: true, category: true, status: true },
        },
      },
      orderBy: (cr, { desc }) => [desc(cr.createdAt)],
    });
  }),

  // Advocate accepts or rejects a request
  respondToRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        status: z.enum(['accepted', 'rejected']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'advocate') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Advocates only' });
      }

      const request = await db.query.connectionRequests.findFirst({
        where: and(
          eq(connectionRequests.id, input.requestId),
          eq(connectionRequests.advocateId, ctx.user.id)
        ),
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection request not found',
        });
      }

      if (request.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This request has already been responded to',
        });
      }

      const [updated] = await db
        .update(connectionRequests)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(connectionRequests.id, input.requestId))
        .returning();

      // If accepted and there's a linked case, assign advocate to the case
      if (input.status === 'accepted' && request.caseId) {
        await db
          .update(cases)
          .set({
            advocateId: ctx.user.id,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(cases.id, request.caseId));
      }

      // Notify citizen of advocate's response
      try {
        const isAccepted = input.status === 'accepted';
        await createNotification({
          userId: request.citizenId,
          type: isAccepted ? 'connection_accepted' : 'connection_rejected',
          title: `Representation Request ${isAccepted ? 'Accepted' : 'Declined'}`,
          message: `Adv. ${ctx.user.name} has ${isAccepted ? 'accepted' : 'declined'} your representation request.`,
          relatedId: request.id,
        });
      } catch (err) {
        console.error('Failed to create notification', err);
      }

      return updated;
    }),

  // Advocate gets all connected (accepted) clients with their case info
  getConnectedClients: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'advocate') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Advocates only' });
    }

    return db.query.connectionRequests.findMany({
      where: and(
        eq(connectionRequests.advocateId, ctx.user.id),
        eq(connectionRequests.status, 'accepted')
      ),
      with: {
        citizen: {
          columns: { id: true, name: true, email: true },
        },
        case: {
          columns: { id: true, title: true, category: true, status: true },
        },
      },
      orderBy: (cr, { desc }) => [desc(cr.updatedAt)],
    });
  }),

  // Citizen gets their connected advocate (if any)
  getMyAdvocate: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'citizen') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Citizens only' });
    }

    const accepted = await db.query.connectionRequests.findFirst({
      where: and(
        eq(connectionRequests.citizenId, ctx.user.id),
        eq(connectionRequests.status, 'accepted')
      ),
      with: {
        advocate: {
          columns: { id: true, name: true, email: true },
        },
        case: {
          columns: { id: true, title: true, category: true, status: true },
        },
      },
      orderBy: (cr, { desc }) => [desc(cr.updatedAt)],
    });

    if (!accepted) return null;

    // Also fetch advocate profile details
    const profile = await db.query.advocateProfiles.findFirst({
      where: eq(advocateProfiles.userId, accepted.advocateId),
    });

    return {
      ...accepted,
      advocateProfile: profile,
    };
  }),
});
