import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { users, advocateProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_legal_key_123!';

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['citizen', 'advocate', 'admin']),
        advocateDetails: z
          .object({
            barCouncilNumber: z.string().min(3),
            practiceAreas: z.string(),
            experienceYears: z.number().nonnegative(),
            bio: z.string(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create transaction to handle user and advocate profile creation
      const result = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            name: input.name,
            email: input.email,
            passwordHash,
            role: input.role,
          })
          .returning();

        if (input.role === 'advocate') {
          if (!input.advocateDetails) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Advocate details are required for advocate registration',
            });
          }

          // Check if bar council number already exists
          const existingBar = await tx.query.advocateProfiles.findFirst({
            where: eq(advocateProfiles.barCouncilNumber, input.advocateDetails.barCouncilNumber),
          });

          if (existingBar) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Bar Council Number already registered',
            });
          }

          await tx.insert(advocateProfiles).values({
            userId: newUser.id,
            barCouncilNumber: input.advocateDetails.barCouncilNumber,
            practiceAreas: input.advocateDetails.practiceAreas,
            experienceYears: input.advocateDetails.experienceYears,
            bio: input.advocateDetails.bio,
            status: 'pending',
          });
        }

        return newUser;
      });

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
        },
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatch) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Check advocate approval status
      let advocateStatus: string | null = null;
      if (user.role === 'advocate') {
        const profile = await db.query.advocateProfiles.findFirst({
          where: eq(advocateProfiles.userId, user.id),
        });
        advocateStatus = profile ? profile.status : 'pending';
      }

      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          advocateStatus,
        },
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    let advocateStatus: string | null = null;
    if (user.role === 'advocate') {
      const profile = await db.query.advocateProfiles.findFirst({
        where: eq(advocateProfiles.userId, user.id),
      });
      advocateStatus = profile ? profile.status : 'pending';
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        advocateStatus,
      },
    };
  }),
});
