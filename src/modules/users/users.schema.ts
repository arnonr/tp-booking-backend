import { t } from 'elysia'

export const createUserSchema = t.Object({
  username: t.String({ minLength: 3, maxLength: 50 }),
  email: t.String({ format: 'email' }),
  fullName: t.String({ minLength: 1, maxLength: 200 }),
  department: t.Optional(t.String({ maxLength: 100 })),
  phone: t.Optional(t.String({ maxLength: 20 })),
  role: t.Optional(t.UnionEnum(['admin', 'employee'])),
  ssoId: t.String({ minLength: 1 }),
})

export const updateUserSchema = t.Object({
  email: t.Optional(t.String({ format: 'email' })),
  fullName: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  department: t.Optional(t.String({ maxLength: 100 })),
  phone: t.Optional(t.String({ maxLength: 20 })),
  role: t.Optional(t.UnionEnum(['admin', 'employee'])),
})

export const updateStatusSchema = t.Object({
  isActive: t.Boolean(),
})

export const resetPasswordSchema = t.Object({
  newPassword: t.String({ minLength: 8 }),
})
