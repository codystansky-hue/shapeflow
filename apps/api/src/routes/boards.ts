import { FastifyInstance, FastifyRequest } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { boards, boardVersions } from '../db/schema.js';

interface CreateBoardBody {
  name: string;
  boardType: string;
  data: unknown;
  description?: string;
}

interface UpdateBoardBody {
  name?: string;
  description?: string;
  boardType?: string;
  data?: unknown;
}

interface BoardParams {
  id: string;
}

export async function boardRoutes(fastify: FastifyInstance) {
  const db = fastify.db;

  // List boards for authenticated user
  fastify.get('/api/boards', async (request: FastifyRequest, reply) => {
    const userId = request.userId;

    const userBoards = await db
      .select({
        id: boards.id,
        name: boards.name,
        description: boards.description,
        boardType: boards.boardType,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
        thumbnailUrl: boards.thumbnailUrl,
      })
      .from(boards)
      .where(eq(boards.userId, userId))
      .orderBy(desc(boards.updatedAt));

    return reply.send(userBoards);
  });

  // Get full board with latest version data
  fastify.get<{ Params: BoardParams }>('/api/boards/:id', async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params;

    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, id), eq(boards.userId, userId)))
      .limit(1);

    if (!board) {
      return reply.code(404).send({ error: 'Board not found' });
    }

    const [latestVersion] = await db
      .select()
      .from(boardVersions)
      .where(eq(boardVersions.boardId, id))
      .orderBy(desc(boardVersions.version))
      .limit(1);

    return reply.send({
      ...board,
      data: latestVersion?.data ?? null,
      version: latestVersion?.version ?? 0,
    });
  });

  // Create new board
  fastify.post<{ Body: CreateBoardBody }>('/api/boards', async (request, reply) => {
    const userId = request.userId;
    const { name, boardType, data, description } = request.body;

    if (!name || !boardType || data === undefined) {
      return reply.code(400).send({ error: 'name, boardType, and data are required' });
    }

    const [board] = await db
      .insert(boards)
      .values({ userId, name, boardType, description: description ?? null })
      .returning();

    await db.insert(boardVersions).values({
      boardId: board.id,
      version: 1,
      data,
    });

    return reply.code(201).send({ ...board, data, version: 1 });
  });

  // Update board (creates new version if data provided)
  fastify.put<{ Params: BoardParams; Body: UpdateBoardBody }>('/api/boards/:id', async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params;
    const { name, description, boardType, data } = request.body;

    const [existing] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, id), eq(boards.userId, userId)))
      .limit(1);

    if (!existing) {
      return reply.code(404).send({ error: 'Board not found' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (boardType !== undefined) updates.boardType = boardType;

    const [updatedBoard] = await db
      .update(boards)
      .set(updates)
      .where(eq(boards.id, id))
      .returning();

    let version = 0;
    if (data !== undefined) {
      const [latestVersion] = await db
        .select({ version: boardVersions.version })
        .from(boardVersions)
        .where(eq(boardVersions.boardId, id))
        .orderBy(desc(boardVersions.version))
        .limit(1);

      version = (latestVersion?.version ?? 0) + 1;

      await db.insert(boardVersions).values({
        boardId: id,
        version,
        data,
      });
    }

    return reply.send({ ...updatedBoard, data: data ?? null, version });
  });

  // Delete board and all versions
  fastify.delete<{ Params: BoardParams }>('/api/boards/:id', async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params;

    const [existing] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, id), eq(boards.userId, userId)))
      .limit(1);

    if (!existing) {
      return reply.code(404).send({ error: 'Board not found' });
    }

    await db.delete(boardVersions).where(eq(boardVersions.boardId, id));
    await db.delete(boards).where(eq(boards.id, id));

    return reply.code(204).send();
  });
}
