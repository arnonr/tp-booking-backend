import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import type { AuthUser } from '../../middleware/auth.guard'
import {
  listBookings, getBookingById, createBooking, cancelBooking, checkIn, getCalendar, createRecurringBooking,
} from './bookings.service'
import { createBookingSchema, createRecurringSchema, calendarQuerySchema } from './bookings.schema'

export const bookingsController = new Elysia({ prefix: '/bookings' })
  .use(authGuard())

  // GET /api/bookings — list bookings (employee: own, admin: all)
  .get('/', async (ctx: any) => {
    const user: AuthUser = ctx.user
    return listBookings({
      userId: user.role === 'employee' ? user.id : undefined,
      dateFrom: ctx.query.dateFrom,
      dateTo: ctx.query.dateTo,
      roomId: ctx.query.roomId ? Number(ctx.query.roomId) : undefined,
      status: ctx.query.status,
      page: ctx.query.page ? Number(ctx.query.page) : undefined,
      limit: ctx.query.limit ? Number(ctx.query.limit) : undefined,
    })
  }, {
    query: t.Object({
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      roomId: t.Optional(t.String()),
      status: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })

  // GET /api/bookings/calendar
  .get('/calendar', async (ctx: any) => {
    return getCalendar({
      roomId: ctx.query.roomId ? Number(ctx.query.roomId) : undefined,
      dateFrom: ctx.query.dateFrom,
      dateTo: ctx.query.dateTo,
    })
  }, {
    query: calendarQuerySchema,
  })

  // GET /api/bookings/:id
  .get('/:id', async ({ params }: any) => {
    const booking = await getBookingById(Number(params.id))
    if (!booking) throw new Error('Booking not found')
    return booking
  }, {
    params: t.Object({ id: t.String() }),
  })

  // POST /api/bookings — create booking
  .post('/', async (ctx: any) => {
    const user: AuthUser = ctx.user
    if (user.role !== 'employee' && user.role !== 'admin') {
      throw new Error('Only employees can create bookings')
    }
    const id = await createBooking({
      userId: user.id,
      roomId: ctx.body.roomId,
      bookingDate: ctx.body.bookingDate,
      startTime: ctx.body.startTime,
      endTime: ctx.body.endTime,
      purpose: ctx.body.purpose,
      attendeeCount: ctx.body.attendeeCount,
    })
    return { id, message: 'Booking created' }
  }, {
    body: createBookingSchema,
  })

  // PATCH /api/bookings/:id/cancel
  .patch('/:id/cancel', async (ctx: any) => {
    const user: AuthUser = ctx.user
    await cancelBooking(Number(ctx.params.id), user)
    return { message: 'Booking cancelled' }
  }, {
    params: t.Object({ id: t.String() }),
  })

  // POST /api/bookings/:id/checkin
  .post('/:id/checkin', async (ctx: any) => {
    const user: AuthUser = ctx.user
    await checkIn(Number(ctx.params.id), user.id)
    return { message: 'Checked in successfully' }
  }, {
    params: t.Object({ id: t.String() }),
  })

  // POST /api/bookings/recurring
  .post('/recurring', async (ctx: any) => {
    const user: AuthUser = ctx.user
    const result = await createRecurringBooking({
      userId: user.id,
      roomId: ctx.body.roomId,
      startDate: ctx.body.startDate,
      startTime: ctx.body.startTime,
      endTime: ctx.body.endTime,
      purpose: ctx.body.purpose,
      attendeeCount: ctx.body.attendeeCount,
      frequency: ctx.body.frequency,
      untilDate: ctx.body.untilDate,
    })
    return { ...result, message: 'Recurring bookings created' }
  }, {
    body: createRecurringSchema,
  })
