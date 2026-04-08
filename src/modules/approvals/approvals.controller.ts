import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import type { AuthUser } from '../../middleware/auth.guard'
import { listPending, approveBooking, rejectBooking, bulkAction } from './approvals.service'
import { rejectSchema, bulkActionSchema } from './approvals.schema'

export const approvalsController = new Elysia({ prefix: '/approvals' })
  .use(authGuard(['admin']))

  // GET /api/approvals/pending
  .get('/pending', async ({ query }: any) => {
    return listPending({
      roomId: query.roomId ? Number(query.roomId) : undefined,
      department: query.department,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    })
  }, {
    query: t.Object({
      roomId: t.Optional(t.String()),
      department: t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })

  // PATCH /api/approvals/:id/approve
  .patch('/:id/approve', async (ctx: any) => {
    const user: AuthUser = ctx.user
    await approveBooking(Number(ctx.params.id), user.id)
    return { message: 'Booking approved' }
  }, {
    params: t.Object({ id: t.String() }),
  })

  // PATCH /api/approvals/:id/reject
  .patch('/:id/reject', async (ctx: any) => {
    const user: AuthUser = ctx.user
    const { remark } = ctx.body
    await rejectBooking(Number(ctx.params.id), user.id, remark)
    return { message: 'Booking rejected' }
  }, {
    params: t.Object({ id: t.String() }),
    body: rejectSchema,
  })

  // POST /api/approvals/bulk
  .post('/bulk', async (ctx: any) => {
    const user: AuthUser = ctx.user
    const result = await bulkAction(ctx.body.items, user.id)
    return { ...result, message: 'Bulk action completed' }
  }, {
    body: bulkActionSchema,
  })
