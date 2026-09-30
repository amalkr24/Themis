import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../backend/src/trpc/routers/_app.js';

export const trpc = createTRPCReact<AppRouter>();
