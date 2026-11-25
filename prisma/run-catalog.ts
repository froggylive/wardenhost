import { PrismaClient } from "@prisma/client";
import { importCatalog } from "./catalog";

const prisma = new PrismaClient();
importCatalog(prisma)
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
