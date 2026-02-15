import { defineEventHandler, readBody, setHeader } from "h3";
import { getDb } from "../../lib/db";
import { hashPassword, signSession } from "../../lib/auth";
import { verifyTurnstile } from "../../lib/turnstile";

export default defineEventHandler(async (event) => {
  try {
    const db = getDb();

    // Only allow if no admin exists
    const existingAdmin = await db.admin.findFirst();
    if (existingAdmin) {
      return { error: "Admin already exists" };
    }

    const body = (await readBody(event)) as {
      username: string;
      password: string;
      turnstileToken: string;
    };

    if (!body.username || !body.password) {
      return { error: "Username and password are required" };
    }

    // Verify Turnstile
    const turnstileOk = await verifyTurnstile(body.turnstileToken);
    if (!turnstileOk) {
      return { error: "Turnstile verification failed" };
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Setup error:", message, stack);
    return { error: message };
  }
});
