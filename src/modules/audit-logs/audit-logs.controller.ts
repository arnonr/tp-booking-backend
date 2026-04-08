import { Elysia } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'

export const auditLogsController = new Elysia({ prefix: '/audit-logs' })
  .use(authGuard(['admin']))

  // GET /api/audit-logs (admin)
  .get('/', () => {
    return { message: 'TODO: list audit logs' }
  })
