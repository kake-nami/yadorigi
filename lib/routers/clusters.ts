import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const clustersRouter = router({
  dismiss: publicProcedure
    .input(z.object({ clusterId: z.string() }))
    .mutation(({ input }) =>
      db.implicitCluster.update({
        where: { id: input.clusterId },
        data: { weight: { multiply: 0.5 } },
      })
    ),

  merge: publicProcedure
    .input(z.object({ clusterIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await db.implicitCluster.updateMany({
        where: { id: { in: input.clusterIds } },
        data: { weight: { multiply: 1.5 } },
      });
    }),
});
