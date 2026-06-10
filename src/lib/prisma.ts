import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaFingerprint?: string;
};

const EXPECTED_SCHEMA_FIELDS = {
  Conversation: ["subject"] as const,
} as const;

export const PRISMA_SCHEMA_STALE_MESSAGE =
  "The server is using an outdated database client. Stop and restart `npm run dev`, then try again.";

function getSchemaFingerprint(): string {
  return Prisma.dmmf.datamodel.models
    .map((model) => `${model.name}:${model.fields.map((field) => field.name).join(",")}`)
    .join("|");
}

function getModelFieldNames(modelName: string): string[] {
  const model = Prisma.dmmf.datamodel.models.find(
    (entry) => entry.name === modelName
  );

  return model?.fields.map((field) => field.name) ?? [];
}

export function isPrismaSchemaReady(): boolean {
  return Object.entries(EXPECTED_SCHEMA_FIELDS).every(([modelName, fields]) => {
    const modelFields = getModelFieldNames(modelName);

    return fields.every((field) => modelFields.includes(field));
  });
}

function isStalePrismaClient(
  client: PrismaClient,
  storedFingerprint?: string
): boolean {
  const missingDelegates =
    !("mention" in client) ||
    !("forumNotification" in client) ||
    !("forumRolePermission" in client);
  const fingerprintMismatch =
    !!storedFingerprint &&
    storedFingerprint !== getSchemaFingerprint();

  return missingDelegates || fingerprintMismatch;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function initPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return createPrismaClient();
  }

  const cached = globalForPrisma.prisma;

  if (cached && isStalePrismaClient(cached, globalForPrisma.prismaSchemaFingerprint)) {
    const staleClient = cached;
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaSchemaFingerprint = undefined;
    void staleClient.$disconnect().catch(() => {});
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaFingerprint = getSchemaFingerprint();
  }

  return globalForPrisma.prisma;
}

export const prisma = initPrismaClient();
