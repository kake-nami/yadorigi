import { router } from '../trpc';
import { bookmarksRouter } from './bookmarks';
import { actionsRouter } from './actions';
import { clustersRouter } from './clusters';

export const appRouter = router({
  bookmarks: bookmarksRouter,
  actions: actionsRouter,
  clusters: clustersRouter,
});

export type AppRouter = typeof appRouter;
