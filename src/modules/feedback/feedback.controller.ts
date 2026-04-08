import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'

export const feedbackController = new Elysia({ prefix: '/feedback' })
  .use(authGuard())
  .post('/', () => ({ message: 'TODO: submit feedback' }))
  .get('/room/:roomId', ({ params }) => ({ message: 'TODO: get feedback by room', roomId: params.roomId }), {
    params: t.Object({ roomId: t.String() }),
  })
  .use(authGuard(['admin']))
  .get('/', () => ({ message: 'TODO: list all feedback' }))
