import { t } from 'elysia'

export const createBookingSchema = t.Object({
  roomId: t.Number(),
  bookingDate: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  purpose: t.String({ minLength: 1, maxLength: 500 }),
  attendeeCount: t.Number({ minimum: 1 }),
  additionalRequirements: t.Optional(t.String({ maxLength: 1000 })),
  participantIds: t.Optional(t.Array(t.Number())),
  equipmentItems: t.Optional(t.Array(t.Object({
    equipmentId: t.Number(),
    quantity: t.Number({ minimum: 1 }),
  }))),
})

export const createRecurringSchema = t.Object({
  roomId: t.Number(),
  startDate: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  purpose: t.String({ minLength: 1, maxLength: 500 }),
  attendeeCount: t.Number({ minimum: 1 }),
  frequency: t.UnionEnum(['weekly', 'monthly']),
  untilDate: t.String(),
  participantIds: t.Optional(t.Array(t.Number())),
  equipmentItems: t.Optional(t.Array(t.Object({
    equipmentId: t.Number(),
    quantity: t.Number({ minimum: 1 }),
  }))),
})

export const updateBookingSchema = t.Object({
  bookingDate: t.Optional(t.String()),
  startTime: t.Optional(t.String()),
  endTime: t.Optional(t.String()),
  purpose: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  attendeeCount: t.Optional(t.Number({ minimum: 1 })),
  additionalRequirements: t.Optional(t.String({ maxLength: 1000 })),
})

export const calendarQuerySchema = t.Object({
  dateFrom: t.String(),
  dateTo: t.String(),
  roomId: t.Optional(t.String()),
})
