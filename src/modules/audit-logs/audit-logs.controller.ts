import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import { listAuditLogs } from './audit-logs.service'

export const auditLogsController = new Elysia({ prefix: '/audit-logs' })
  .use(authGuard(['admin']))

  // GET /api/audit-logs (admin)
  .get('/', async (ctx: any) => {
    return listAuditLogs({
      entityType: ctx.query.entityType,
      action: ctx.query.action,
      userId: ctx.query.userId ? Number(ctx.query.userId) : undefined,
      dateFrom: ctx.query.dateFrom,
      dateTo: ctx.query.dateTo,
      page: ctx.query.page ? Number(ctx.query.page) : undefined,
      limit: ctx.query.limit ? Number(ctx.query.limit) : undefined,
    })
  }, {
    query: t.Object({
      entityType: t.Optional(t.String()),
      action: t.Optional(t.String()),
      userId: t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })
