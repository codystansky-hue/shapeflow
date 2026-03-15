import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  const db = fastify.db;

  fastify.post<{ Body: RegisterBody }>('/api/auth/register', async (request, reply) => {
    const { email, password, name } = request.body;

    if (!email || !password || !name) {
      return reply.code(400).send({ error: 'Email, password, and name are required' });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt });

    const token = fastify.jwt.sign({ sub: user.id }, { expiresIn: '7d' });

    return reply.code(201).send({ token, user });
  });

  fastify.post<{ Body: LoginBody }>('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const token = fastify.jwt.sign({ sub: user.id }, { expiresIn: '7d' });

    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    });
  });
}
