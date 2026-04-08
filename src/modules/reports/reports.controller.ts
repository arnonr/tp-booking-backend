import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import { getSummary, getMonthlyStats, getRoomUsage, getPeakHours } from './reports.service'
import { monthlyQuerySchema } from './reports.schema'

export const reportsController = new Elysia({ prefix: '/reports' })
  .use(authGuard(['admin']))

  // GET /api/reports/summary (admin)
  .get('/summary', async () => {
    return getSummary()
  })

  // GET /api/reports/monthly (admin)
  .get('/monthly', async (ctx: any) => {
    const year = ctx.query.year ? Number(ctx.query.year) : undefined
    return getMonthlyStats(year)
  }, {
    query: monthlyQuerySchema,
  })

  // GET /api/reports/room-usage (admin)
  .get('/room-usage', async () => {
    return getRoomUsage()
  })

  // GET /api/reports/peak-hours (admin)
  .get('/peak-hours', async () => {
    return getPeakHours()
  })

  // GET /api/reports/export (admin)
  .get('/export', () => {
    return { message: 'TODO: export report' }
  })
