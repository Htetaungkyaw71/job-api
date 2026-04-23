import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const rawConnectionString = process.env.DATABASE_URL || "";

let connectionString = rawConnectionString;
let schema: string | undefined;
try {
  const url = new URL(rawConnectionString);
  schema = url.searchParams.get("schema") || undefined;

  if (schema) {
    url.searchParams.delete("schema");
    connectionString = url.toString();
  }
} catch {
  connectionString = rawConnectionString;
}

const adapter = new PrismaPg(
  { connectionString },
  schema ? { schema } : undefined,
);
const prisma = new PrismaClient({ adapter });

export { prisma };
