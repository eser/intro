import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
  migrations: {
    path: path.join("prisma", "migrations"),
  },
});
