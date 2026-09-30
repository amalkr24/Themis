import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { notifications } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export const notificationsRouter = router({
  // List all notifications for the current user (newest first)
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }),

  // Unread count only (for the bell badge)
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unread = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, 'false')
        )
      );
    return { count: unread.length };
  }),

  // Mark a single notification as read
  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(notifications)
        .set({ isRead: 'true' })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // Mark ALL notifications as read
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(notifications)
      .set({ isRead: 'true' })
      .where(eq(notifications.userId, ctx.user.id));
    return { success: true };
  }),
});

// ─── Helper: create a notification (used internally by other routers) ──────────
export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedId,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
}) {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    message,
    relatedId,
  });
}
