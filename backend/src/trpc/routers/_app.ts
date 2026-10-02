import { router } from '../trpc.js';
import { authRouter } from './auth.js';
import { casesRouter } from './cases.js';
import { advocatesRouter } from './advocates.js';
import { adminRouter } from './admin.js';
import { templatesRouter } from './templates.js';
import { connectionsRouter } from './connections.js';
import { notificationsRouter } from './notifications.js';
import { consultationsRouter } from './consultations.js';
import { messagesRouter } from './messages.js';
import { assessmentsRouter } from './assessments.js';
import { lawsRouter } from './laws.js';

export const appRouter = router({
  auth: authRouter,
  cases: casesRouter,
  advocates: advocatesRouter,
  admin: adminRouter,
  templates: templatesRouter,
  connections: connectionsRouter,
  notifications: notificationsRouter,
  consultations: consultationsRouter,
  messages: messagesRouter,
  assessments: assessmentsRouter,
  laws: lawsRouter,
});

export type AppRouter = typeof appRouter;
