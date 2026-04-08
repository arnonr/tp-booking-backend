import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'

export const notificationsController = new Elysia({ prefix: '/notifications' })
  .use(authGuard())

  // GET /api/notifications (auth)
  .get('/', () => {
    return { message: 'TODO: list notifications' }
  })

  // PATCH /api/notifications/:id/read (auth)
  .patch('/:id/read', ({ params }) => {
    return { message: 'TODO: mark notification as read', id: params.id }
  }, {
    params: t.Object({ id: t.String() }),
  })

  // PATCH /api/notifications/read-all (auth)
  .patch('/read-all', () => {
    return { message: 'TODO: mark all notifications as read' }
  })

  // GET /api/notifications/unread-count (auth)
  .get('/unread-count', () => {
    return { message: 'TODO: get unread notification count' }
  })
