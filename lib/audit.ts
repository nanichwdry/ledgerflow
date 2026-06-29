import { prisma } from '@/lib/prisma';
import type { Prisma, AuditAction } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function logAudit(
  client: Tx | typeof prisma,
  input: {
    organizationId: string;
    actorUserId: string;
    actorEmail?: string | null;
    entityType: string;
    entityId: string;
    action: AuditAction;
    summary: string;
    before?: unknown;
    after?: unknown;
  }
) {
  await client.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      before: (input.before as any) ?? undefined,
      after: (input.after as any) ?? undefined,
    },
  });
}

export async function listAuditLog(
  organizationId: string,
  opts: { limit?: number; entityType?: string } = {}
) {
  return prisma.auditLog.findMany({
    where: { organizationId, entityType: opts.entityType },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 100,
  });
}
