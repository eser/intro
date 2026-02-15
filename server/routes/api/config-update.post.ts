import { defineEventHandler, readBody, getHeader } from "h3";
import { getDb } from "../../lib/db";
import { verifySession, parseSessionCookie } from "../../lib/auth";

export default defineEventHandler(async (event) => {
  // Verify auth
  const cookieHeader = getHeader(event, "cookie") ?? null;
  const sessionToken = parseSessionCookie(cookieHeader);
  if (!sessionToken) {
    throw createApiError(401, "Not authenticated");
  }

  const username = await verifySession(sessionToken);
  if (!username) {
    throw createApiError(401, "Invalid session");
  }

  // Parse and validate config data
  const body = (await readBody(event)) as { data: unknown };
  if (!body.data || typeof body.data !== "object") {
    throw createApiError(400, "Invalid config data");
  }

  // Basic structure validation
  const config = body.data as Record<string, unknown>;
  if (!config.general || !config.effects || !config.overlays) {
    throw createApiError(400, "Config must have general, effects, and overlays");
  }

  // Upsert config
  const db = getDb();
  await db.config.upsert({
    where: { id: 1 },
    update: { data: body.data as object },
    create: { id: 1, data: body.data as object },
  });

  return { ok: true };
});

function createApiError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
