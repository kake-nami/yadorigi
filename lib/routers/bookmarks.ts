import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

const BookmarkStatusSchema = z.enum(['TO_READ', 'IN_PROGRESS', 'DONE', 'EVERGREEN']);

export const bookmarksRouter = router({
  updateStatus: publicProcedure
    .input(z.object({ id: z.string(), status: BookmarkStatusSchema }))
    .mutation(({ input }) =>
      db.bookmark.update({
        where: { id: input.id },
        data: { status: input.status, statusUpdatedAt: new Date() },
      })
    ),

  updateStatusBatch: publicProcedure
    .input(z.object({ ids: z.array(z.string()), status: BookmarkStatusSchema }))
    .mutation(({ input }) =>
      db.bookmark.updateMany({
        where: { id: { in: input.ids } },
        data: { status: input.status, statusUpdatedAt: new Date() },
      })
    ),

  markAsOpened: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.behaviorLog.create({
        data: { type: 'bookmark_open', bookmarkId: input.id },
      });
      return db.bookmark.update({
        where: { id: input.id },
        data: { lastOpenedAt: new Date(), openCount: { increment: 1 } },
      });
    }),

  linkToAction: publicProcedure
    .input(z.object({
      bookmarkId: z.string(),
      actionId: z.string(),
      note: z.string().optional(),
    }))
    .mutation(({ input }) =>
      db.actionLink.upsert({
        where: { bookmarkId_actionId: { bookmarkId: input.bookmarkId, actionId: input.actionId } },
        update: { note: input.note },
        create: input,
      })
    ),

  unlinkFromAction: publicProcedure
    .input(z.object({ bookmarkId: z.string(), actionId: z.string() }))
    .mutation(({ input }) =>
      db.actionLink.delete({
        where: { bookmarkId_actionId: { bookmarkId: input.bookmarkId, actionId: input.actionId } },
      })
    ),
});
