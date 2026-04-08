import { t } from 'elysia'

export const rejectSchema = t.Object({
  remark: t.String({ minLength: 1 }),
})

export const bulkActionSchema = t.Object({
  items: t.Array(t.Object({
    bookingId: t.Number(),
    action: t.UnionEnum(['approve', 'reject']),
    remark: t.Optional(t.String()),
  })),
})
