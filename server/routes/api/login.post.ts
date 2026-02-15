import { defineEventHandler, readBody, setHeader } from "h3";
import { getDb } from "../../lib/db";
import { verifyPassword, signSession } from "../../lib/auth";
import { verifyTurnstile } from "../../lib/turnstile";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    username: string;
    password: string;
    turnstileToken: string;
  };

  // Verify Turnstile
  const turnstileOk = await verifyTurnstile(body.turnstileToken);
  if (!turnstileOk) {
    throw createApiError(403, "Turnstile verification failed");
  }

  // Look up admin
  const db = getDb();
  const admin = await db.admin.findUnique({
    where: { username: body.username },
  });

  if (!admin) {
    throw createApiError(401, "Invalid credentials");
  }

  // Verify password
  const passwordOk = await verifyPassword(body.password, admin.passwordHash);
  if (!passwordOk) {
    throw createApiError(401, "Invalid credentials");
  }

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
