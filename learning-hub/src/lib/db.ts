import { copyFileSync, existsSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

/**
 * Demo deployment on Vercel: the bundle is read-only, so each server instance copies the seeded
 * prisma/demo.db to /tmp and writes there. Data resets whenever Vercel starts a new instance.
 * Locally (no VERCEL env) DATABASE_URL from .env is used as before.
 */
function datasourceUrl(): string | undefined {
  if (!process.env.VERCEL) return undefined;
  const target = "/tmp/learning-hub-demo.db";
  if (!existsSync(target)) copyFileSync(path.join(process.cwd(), "prisma", "demo.db"), target);
  return `file:${target}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
