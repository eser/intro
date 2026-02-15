import { defineEventHandler, readBody, setHeader } from "h3";
import { getDb } from "../../lib/db";
import { hashPassword, signSession } from "../../lib/auth";
import { verifyTurnstile } from "../../lib/turnstile";

export default defineEventHandler(async (event) => {
  const db = getDb();

  // Only allow if no admin exists
  const existingAdmin = await db.admin.findFirst();
  if (existingAdmin) {
    throw createApiError(403, "Admin already exists");
  }

  const body = (await readBody(event)) as {
    username: string;
    password: string;
    turnstileToken: string;
  };

  if (!body.username || !body.password) {
    throw createApiError(400, "Username and password are required");
  }

  // Verify Turnstile
  const turnstileOk = await verifyTurnstile(body.turnstileToken);
  if (!turnstileOk) {
    throw createApiError(403, "Turnstile verification failed");
  }

  // Create admin
  const passwordHash = await hashPassword(body.password);
  const admin = await db.admin.create({
    data: { username: body.username, passwordHash },
  });

  // Sign session and set cookie
  const token = await signSession(admin.username);
  setHeader(
    event,
    "Set-Cookie",
    `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );

  return { ok: true };
});

function createApiError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
