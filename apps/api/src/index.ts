import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { authPlugin } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { boardRoutes } from './routes/boards.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>;
  }
  interface FastifyRequest {
    userId: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

async function main() {
  const fastify = Fastify({ logger: true });

  // CORS
  await fastify.register(cors, { origin: true });

  // JWT
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  });

  // Database
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/shapeflow';
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  fastify.decorate('db', db);

  // Auth middleware
  await fastify.register(authPlugin);

  // Routes
  await fastify.register(authRoutes);
  await fastify.register(boardRoutes);

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Start server
  const port = parseInt(process.env.PORT || '3001', 10);
  await fastify.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
