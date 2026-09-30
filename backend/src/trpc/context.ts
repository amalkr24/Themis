import { inferAsyncReturnType } from '@trpc/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_legal_key_123!';

export interface UserContext {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'advocate' | 'admin';
}

export const createContext = async (opts: { req: Request }) => {
  const authHeader = opts.req.headers.get('authorization');
  let user: UserContext | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserContext;
      user = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (e) {
      // Invalid/expired token - context user remains null
    }
  }

  return {
    user,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;
