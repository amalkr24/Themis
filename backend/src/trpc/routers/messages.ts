import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { messages, users, connectionRequests } from '../../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { createNotification } from './notifications.js';

export const messagesRouter = router({
  // 1. Send a Message (Direct or Case-bound)
  sendMessage: protectedProcedure
    .input(
      z.object({
        receiverId: z.string().uuid(),
        content: z.string().min(1, 'Message cannot be empty'),
        caseId: z.string().uuid().optional(),
        connectionId: z.string().uuid().optional(),
        attachmentUrl: z.string().optional(),
        attachmentName: z.string().optional(),
        attachmentType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const senderId = ctx.user.id;
      const { receiverId, content, caseId, connectionId, attachmentUrl, attachmentName, attachmentType } = input;

      if (senderId === receiverId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot send a message to yourself.' });
      }

      // Check recipient exists
      const receiver = await db.query.users.findFirst({
        where: eq(users.id, receiverId),
      });

      if (!receiver) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipient not found.' });
      }

      const [newMessage] = await db
        .insert(messages)
        .values({
          senderId,
          receiverId,
          caseId,
          connectionId,
          content,
          attachmentUrl,
          attachmentName,
          attachmentType,
          isRead: 'false',
        })
        .returning();

      // Dispatch Notification to receiver
      try {
        const senderName = ctx.user.role === 'advocate' ? `Adv. ${ctx.user.name}` : ctx.user.name;
        await createNotification({
          userId: receiverId,
          type: 'general',
          title: `New Message from ${senderName}`,
          message: content.length > 80 ? `${content.substring(0, 77)}...` : content,
          relatedId: newMessage.id,
        });
      } catch (err) {
        console.error('Failed to notify message recipient', err);
      }

      return newMessage;
    }),

  // 2. Get Chronological Conversation with a Specific User
  getConversation: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const currentUserId = ctx.user.id;
      const targetUserId = input.targetUserId;

      // Mark incoming messages as read
      await db
        .update(messages)
        .set({ isRead: 'true' })
        .where(
          and(
            eq(messages.senderId, targetUserId),
            eq(messages.receiverId, currentUserId),
            eq(messages.isRead, 'false')
          )
        );

      const conversation = await db.query.messages.findMany({
        where: or(
          and(eq(messages.senderId, currentUserId), eq(messages.receiverId, targetUserId)),
          and(eq(messages.senderId, targetUserId), eq(messages.receiverId, currentUserId))
        ),
        with: {
          sender: {
            columns: { id: true, name: true, role: true, email: true },
          },
          case: {
            columns: { id: true, title: true, category: true },
          },
        },
        orderBy: (m, { asc: a }) => [a(m.createdAt)],
      });

      return conversation;
    }),

  // 3. List All Conversation Threads for Logged-in User
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    const currentUserId = ctx.user.id;

    // Fetch all connected peers first
    const connectedAdvocates = await db.query.connectionRequests.findMany({
      where: and(
        eq(connectionRequests.citizenId, currentUserId),
        eq(connectionRequests.status, 'accepted')
      ),
      with: {
        advocate: {
          columns: { id: true, name: true, email: true, role: true },
        },
        case: {
          columns: { id: true, title: true },
        },
      },
    });

    const connectedClients = await db.query.connectionRequests.findMany({
      where: and(
        eq(connectionRequests.advocateId, currentUserId),
        eq(connectionRequests.status, 'accepted')
      ),
      with: {
        citizen: {
          columns: { id: true, name: true, email: true, role: true },
        },
        case: {
          columns: { id: true, title: true },
        },
      },
    });

    // Map distinct users
    const peerMap = new Map<string, { user: any; case?: any; lastMessage?: any; unreadCount: number }>();

    for (const req of connectedAdvocates) {
      if (req.advocate) {
        peerMap.set(req.advocate.id, {
          user: req.advocate,
          case: req.case,
          unreadCount: 0,
        });
      }
    }

    for (const req of connectedClients) {
      if (req.citizen) {
        peerMap.set(req.citizen.id, {
          user: req.citizen,
          case: req.case,
          unreadCount: 0,
        });
      }
    }

    // Also include anyone who has exchanged messages
    const allUserMessages = await db.query.messages.findMany({
      where: or(
        eq(messages.senderId, currentUserId),
        eq(messages.receiverId, currentUserId)
      ),
      with: {
        sender: { columns: { id: true, name: true, email: true, role: true } },
        receiver: { columns: { id: true, name: true, email: true, role: true } },
      },
      orderBy: (m, { desc: d }) => [d(m.createdAt)],
    });

    for (const msg of allUserMessages) {
      const otherUser = msg.senderId === currentUserId ? msg.receiver : msg.sender;
      if (!otherUser) continue;

      if (!peerMap.has(otherUser.id)) {
        peerMap.set(otherUser.id, {
          user: otherUser,
          unreadCount: 0,
        });
      }

      const entry = peerMap.get(otherUser.id)!;
      if (!entry.lastMessage) {
        entry.lastMessage = msg;
      }
      if (msg.receiverId === currentUserId && msg.isRead === 'false') {
        entry.unreadCount += 1;
      }
    }

    return Array.from(peerMap.values());
  }),

  // 4. Unread Messages Count
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unread = await db.query.messages.findMany({
      where: and(
        eq(messages.receiverId, ctx.user.id),
        eq(messages.isRead, 'false')
      ),
      columns: { id: true },
    });

    return { count: unread.length };
  }),

  // 5. Clear Conversation between current user and target user
  clearConversation: protectedProcedure
    .input(z.object({ targetUserId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const currentUserId = ctx.user.id;
      const targetUserId = input.targetUserId;

      await db
        .delete(messages)
        .where(
          or(
            and(eq(messages.senderId, currentUserId), eq(messages.receiverId, targetUserId)),
            and(eq(messages.senderId, targetUserId), eq(messages.receiverId, currentUserId))
          )
        );

      return { success: true };
    }),
});
