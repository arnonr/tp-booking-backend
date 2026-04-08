import { t } from 'elysia'

export const callbackQuerySchema = t.Object({
  code: t.String(),
  state: t.Optional(t.String()),
})

export const callbackBodySchema = t.Object({
  code: t.String(),
})
