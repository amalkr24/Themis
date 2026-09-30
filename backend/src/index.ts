import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createContext } from './trpc/context.js';
import { appRouter } from './trpc/routers/_app.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Check both local and root .env
if (fs.existsSync(path.resolve(process.cwd(), './backend/.env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), './backend/.env') });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), './.env') });
}

const app = new Hono();

// Enable CORS
app.use(
  '*',
  cors({
    origin: '*', // In production, replace with specific frontend origin
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

// Serve Static Uploads
app.use('/uploads/*', serveStatic({ root: '../' }));

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Physical File Upload Endpoint
app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // MIME Type Validation
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only PDF, PNG, and JPEG are allowed.' }, 400);
    }

    // Size Validation (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File size exceeds 5MB limit.' }, 400);
    }

    // Save File
    const uploadsDir = path.resolve(process.cwd(), '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = file.name.split('.').pop() || 'dat';
    const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    return c.json({
      filePath: `/uploads/${fileName}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'File upload failed' }, 500);
  }
});

// tRPC HTTP Endpoint handler
app.all('/trpc/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext({ req: c.req.raw }),
  });
});

const port = Number(process.env.PORT || 4000);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`[Themisis Server] running on http://localhost:${info.port}`);
});
