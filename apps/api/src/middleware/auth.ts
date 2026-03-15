import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const PUBLIC_ROUTES: Array<{ method: string; url: string }> = [
  { method: 'POST', url: '/api/auth/register' },
  { method: 'POST', url: '/api/auth/login' },
  { method: 'GET', url: '/api/health' },
];

function isPublicRoute(method: string, url: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => route.method === method && url.startsWith(route.url)
  );
}

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('userId', '');

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (isPublicRoute(request.method, request.url)) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid authorization header' });
      return;
    }

    try {
      const token = authHeader.slice(7);
      const decoded = fastify.jwt.verify<{ sub: string }>(token);
      request.userId = decoded.sub;
    } catch {
      reply.code(401).send({ error: 'Invalid or expired token' });
    }
  });
}
