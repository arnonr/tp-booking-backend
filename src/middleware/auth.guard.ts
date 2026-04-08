import { Elysia } from 'elysia'
import { db } from '../db/connection'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

type UserRole = 'admin' | 'employee'

export interface AuthUser {
  id: number
  ssoId: string
  username: string
  email: string
  fullName: string
  role: UserRole
  department: string | null
}

export function authGuard(allowedRoles?: UserRole[]) {
  return new Elysia({ name: `auth-guard-${allowedRoles?.join('-') ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ cookie, set }): Promise<{ user: AuthUser }> => {
      const sessionId = cookie.session?.value

      if (!sessionId) {
        set.status = 401
        throw new Error('Unauthorized: no session')
      }

      const userId = Number(sessionId)
      const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

      if (!row || !row.isActive) {
        set.status = 401
        throw new Error('Unauthorized: user not found or inactive')
      }

      if (allowedRoles && !allowedRoles.includes(row.role as UserRole)) {
        set.status = 403
        throw new Error('Forbidden: insufficient role')
      }

      return {
        user: {
          id: row.id,
          ssoId: row.ssoId,
          username: row.username,
          email: row.email,
          fullName: row.fullName,
          role: row.role as UserRole,
          department: row.department,
        },
      }
    })
}
