import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import type { AuthUser } from '../../middleware/auth.guard'
import { listUsers, getUserById, createUser, updateUser, updateUserStatus } from './users.service'
import { createUserSchema, updateUserSchema, updateStatusSchema } from './users.schema'

export const usersController = new Elysia({ prefix: '/users' })
  .use(authGuard(['admin']))
  .get('/', async ({ query }) => {
    return listUsers({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      department: query.department,
      role: query.role,
      search: query.search,
    })
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      department: t.Optional(t.String()),
      role: t.Optional(t.String()),
      search: t.Optional(t.String()),
    }),
  })

  .get('/:id', async ({ params }) => {
    const user = await getUserById(Number(params.id))
    if (!user) throw new Error('User not found')
    return user
  }, {
    params: t.Object({ id: t.String() }),
  })

  .post('/', async (ctx: any) => {
    const { body } = ctx
    const currentUser: AuthUser = ctx.user
    const id = await createUser(body)
    // Audit log will be handled by audit plugin
    return { id, message: 'User created' }
  }, {
    body: createUserSchema,
  })

  .put('/:id', async (ctx: any) => {
    const { params, body } = ctx
    const currentUser: AuthUser = ctx.user
    await updateUser(Number(params.id), body)
    return { message: 'User updated' }
  }, {
    params: t.Object({ id: t.String() }),
    body: updateUserSchema,
  })

  .patch('/:id/status', async (ctx: any) => {
    const { params, body } = ctx
    const currentUser: AuthUser = ctx.user
    await updateUserStatus(Number(params.id), body.isActive)
    return { message: 'Status updated' }
  }, {
    params: t.Object({ id: t.String() }),
    body: updateStatusSchema,
  })
