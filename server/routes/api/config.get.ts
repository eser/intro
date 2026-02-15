import { defineEventHandler } from "h3";
import { getDb } from "../../lib/db";
import defaultConfig from "../../../config.json";

export default defineEventHandler(async () => {
  const db = getDb();

  let config = await db.config.findUnique({ where: { id: 1 } });

  if (!config) {
    config = await db.config.create({
      data: { id: 1, data: defaultConfig },
    });
  }

  return config.data;
});
