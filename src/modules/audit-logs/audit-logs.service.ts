import { db } from '../../db/connection'
import { auditLogs, users } from '../../db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

export async function listAuditLogs(params: {
  entityType?: string
  action?: string
  userId?: number
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) {
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  const offset = (page - 1) * limit
  const conditions: any[] = []

  if (params.entityType) conditions.push(eq(auditLogs.entityType, params.entityType))
  if (params.action) conditions.push(eq(auditLogs.action, params.action))
  if (params.userId) conditions.push(eq(auditLogs.userId, params.userId))
  if (params.dateFrom) conditions.push(sql`${auditLogs.createdAt} >= ${params.dateFrom}`)
  if (params.dateTo) conditions.push(sql`${auditLogs.createdAt} <= ${params.dateTo}`)

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows: any = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      action: auditLogs.action,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      user: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        department: users.department,
      },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRow]: any = await db
    .select({ total: sql<number>`count(*)` })
    .from(auditLogs)
    .where(where)

  return { data: rows, pagination: { page, limit, total: Number(countRow.total) } }
}
