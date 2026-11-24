import "server-only";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalDb = globalThis as unknown as { lmsPrisma?: PrismaClient };
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
export const prisma =
  globalDb.lmsPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: true },
      max: 5,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.lmsPrisma = prisma;
