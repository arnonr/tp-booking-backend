import { t } from 'elysia'

const datePattern = t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
const timePattern = t.String({ pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' })

export const createBookingSchema = t.Object({
  roomId: t.Number(),
  bookingDate: datePattern,
  endDate: t.Optional(datePattern),
  startTime: timePattern,
  endTime: timePattern,
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
  startDate: datePattern,
  startTime: timePattern,
  endTime: timePattern,
  purpose: t.String({ minLength: 1, maxLength: 500 }),
  attendeeCount: t.Number({ minimum: 1 }),
  frequency: t.UnionEnum(['weekly', 'monthly']),
  untilDate: datePattern,
  participantIds: t.Optional(t.Array(t.Number())),
  equipmentItems: t.Optional(t.Array(t.Object({
    equipmentId: t.Number(),
    quantity: t.Number({ minimum: 1 }),
  }))),
})

export const updateBookingSchema = t.Object({
  bookingDate: t.Optional(datePattern),
  endDate: t.Optional(datePattern),
  startTime: t.Optional(timePattern),
  endTime: t.Optional(timePattern),
  purpose: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  attendeeCount: t.Optional(t.Number({ minimum: 1 })),
  additionalRequirements: t.Optional(t.String({ maxLength: 1000 })),
})

export const calendarQuerySchema = t.Object({
  dateFrom: t.String(),
  dateTo: t.String(),
  roomId: t.Optional(t.String()),
})
