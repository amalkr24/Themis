import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Check both local and root .env
if (fs.existsSync(path.resolve(process.cwd(), './backend/.env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), './backend/.env') });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), './.env') });
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('WARNING: DATABASE_URL environment variable is not set. Database operations will fail.');
}

// In-memory or fallback client for code to build/run even without active DB (lazy evaluation)
const queryClient = postgres(connectionString || 'postgres://localhost:5432/themis', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
