import { Elysia } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'

export const reportsController = new Elysia({ prefix: '/reports' })
  .use(authGuard(['admin']))

  // GET /api/reports/summary (admin)
  .get('/summary', () => {
    return { message: 'TODO: get booking summary report' }
  })

  // GET /api/reports/monthly (admin)
  .get('/monthly', () => {
    return { message: 'TODO: get monthly report' }
  })

  // GET /api/reports/room-usage (admin)
  .get('/room-usage', () => {
    return { message: 'TODO: get room usage report' }
  })

  // GET /api/reports/peak-hours (admin)
  .get('/peak-hours', () => {
    return { message: 'TODO: get peak hours report' }
  })

  // GET /api/reports/export (admin)
  .get('/export', () => {
    return { message: 'TODO: export report' }
  })
