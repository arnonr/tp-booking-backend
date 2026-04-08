import { Elysia } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import type { AuthUser } from '../../middleware/auth.guard'
import { getSSORedirectUrl, handleSSOCallback } from './auth.service'
import { callbackQuerySchema, callbackBodySchema } from './auth.schema'
import { db } from '../../db/connection'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const authController = new Elysia({ prefix: '/auth' })
  .get('/sso/redirect', () => {
    try {
      const url = getSSORedirectUrl()
      return Response.redirect(url, 302)
    } catch (e: any) {
      return new Response(e.message || 'Error', { status: 500 })
    }
  })

export const authCallbackController = new Elysia({ prefix: '/auth' })
  // GET callback — backend-initiated flow (redirect from SSO directly to backend)
  .get('/sso/callback', async ({ query, set, cookie }: any) => {
    const userId = await handleSSOCallback(query.code)

    cookie.session?.set({
      value: String(userId),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    set.redirect = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  }, {
    query: callbackQuerySchema,
  })
  // POST callback — frontend-initiated flow (Vue page receives code, POSTs to backend)
  .post('/sso/callback', async ({ body, cookie }: any) => {
    const userId = await handleSSOCallback(body.code)

    cookie.session?.set({
      value: String(userId),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return { success: true }
  }, {
    body: callbackBodySchema,
  })

export const authLogoutController = new Elysia({ prefix: '/auth' })
  .post('/logout', ({ cookie, set }: any) => {
    cookie.session?.remove()
    set.status = 200
    return { message: 'Logged out' }
  })

export const authMeController = new Elysia({ prefix: '/auth' })
  .use(authGuard())
  .get('/me', async (ctx: any) => {
    const user: AuthUser = ctx.user
    const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
    if (!row) throw new Error('User not found')

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      fullName: row.fullName,
      department: row.department,
      phone: row.phone,
      role: row.role,
      isActive: row.isActive,
    }
  })
