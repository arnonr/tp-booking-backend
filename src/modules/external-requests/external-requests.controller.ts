import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'

export const externalRequestsController = new Elysia({ prefix: '/external-requests' })
  // Public routes
  .post('/', () => ({ message: 'TODO: submit external request' }))
  .get('/track/:refCode', ({ params }) => ({ message: 'TODO: track external request', refCode: params.refCode }), {
    params: t.Object({ refCode: t.String() }),
  })
  // Admin routes
  .use(authGuard(['admin']))
  .get('/', () => ({ message: 'TODO: list external requests' }))
  .patch('/:id/status', ({ params }) => ({ message: 'TODO: update external request status', id: params.id }), {
    params: t.Object({ id: t.String() }),
  })
