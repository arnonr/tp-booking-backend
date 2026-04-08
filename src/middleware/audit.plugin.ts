import { Elysia } from 'elysia'
import { db } from '../db/connection'
import { auditLogs } from '../db/schema'

export const auditPlugin = new Elysia({ name: 'audit' })
  .derive(({ request }) => ({
    async logAudit(params: {
      userId?: number
      entityType: string
      entityId: number
      action: string
      oldValues?: Record<string, unknown>
      newValues?: Record<string, unknown>
    }) {
      const ip = request.headers.get('x-forwarded-for')
        ?? request.headers.get('x-real-ip')
        ?? 'unknown'

      await db.insert(auditLogs).values({
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        oldValues: params.oldValues,
        newValues: params.newValues,
        ipAddress: Array.isArray(ip) ? ip[0] : ip,
      })
    },
  }))
