import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const actionsRouter = router({
  list: publicProcedure.query(() =>
    db.actionItem.findMany({ where: { archivedAt: null }, orderBy: { createdAt: 'desc' } })
  ),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(({ input }) => db.actionItem.create({ data: input })),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.actionItem.update({ where: { id }, data });
    }),

  archive: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) =>
      db.actionItem.update({ where: { id: input.id }, data: { archivedAt: new Date() } })
    ),
});
