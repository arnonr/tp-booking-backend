import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'

export const equipmentController = new Elysia({ prefix: '/equipment' })
  .use(authGuard())
  .get('/', () => ({ message: 'TODO: list equipment' }))
  .get('/availability', () => ({ message: 'TODO: get equipment availability' }))
  .use(authGuard(['admin']))
  .post('/', () => ({ message: 'TODO: create equipment' }))
  .put('/:id', ({ params }) => ({ message: 'TODO: update equipment', id: params.id }), {
    params: t.Object({ id: t.String() }),
  })
