import { defineEventHandler, getHeader } from "h3";
import { getDb } from "../../lib/db";
import { verifySession, parseSessionCookie } from "../../lib/auth";

export default defineEventHandler(async (event) => {
  const db = getDb();
  const adminExists = (await db.admin.count()) > 0;

  const cookieHeader = getHeader(event, "cookie") ?? null;
  const sessionToken = parseSessionCookie(cookieHeader);

  if (!sessionToken) {
    return { authenticated: false, adminExists, username: null };
  }

  const username = await verifySession(sessionToken);
  return { authenticated: !!username, adminExists, username };
});
