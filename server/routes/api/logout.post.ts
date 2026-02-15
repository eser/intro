import { defineEventHandler, setHeader } from "h3";

export default defineEventHandler((event) => {
  setHeader(
    event,
    "Set-Cookie",
    "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );

  return { ok: true };
});
