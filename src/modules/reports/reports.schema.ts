import { t } from 'elysia'

export const monthlyQuerySchema = t.Object({
  year: t.Optional(t.String()),
})

export const exportQuerySchema = t.Object({
  format: t.Optional(t.String()),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
})
