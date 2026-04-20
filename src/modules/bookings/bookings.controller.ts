import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import type { AuthUser } from '../../middleware/auth.guard'
import {
  listBookings, getBookingById, createBooking, updateBooking, cancelBooking, revertBooking, checkIn, getCalendar, createRecurringBooking,
} from './bookings.service'
import { createBookingSchema, updateBookingSchema, createRecurringSchema, calendarQuerySchema } from './bookings.schema'

export const bookingsController = new Elysia({ prefix: '/bookings' })
  // GET /api/bookings/calendar — public, no auth required
  .get('/calendar', async (ctx: any) => {
    return getCalendar({
      roomId: ctx.query.roomId ? Number(ctx.query.roomId) : undefined,
      dateFrom: ctx.query.dateFrom,
      dateTo: ctx.query.dateTo,
    })
  }, {
    query: calendarQuerySchema,
  })

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
      endDate: ctx.body.endDate,
      startTime: ctx.body.startTime,
      endTime: ctx.body.endTime,
      purpose: ctx.body.purpose,
      attendeeCount: ctx.body.attendeeCount,
      additionalRequirements: ctx.body.additionalRequirements,
    })
    return { id, message: 'Booking created' }
  }, {
    body: createBookingSchema,
  })

  // PATCH /api/bookings/:id — edit booking
  .patch('/:id', async (ctx: any) => {
    const user: AuthUser = ctx.user
    const booking = await updateBooking(Number(ctx.params.id), { id: user.id, role: user.role }, ctx.body)
    return booking
  }, {
    params: t.Object({ id: t.String() }),
    body: updateBookingSchema,
  })

  // PATCH /api/bookings/:id/cancel
  .patch('/:id/cancel', async (ctx: any) => {
    const user: AuthUser = ctx.user
    await cancelBooking(Number(ctx.params.id), user)
    return { message: 'Booking cancelled' }
  }, {
    params: t.Object({ id: t.String() }),
  })

  // PATCH /api/bookings/:id/revert — admin revert terminal status
  .patch('/:id/revert', async (ctx: any) => {
    const user: AuthUser = ctx.user
    if (user.role !== 'admin') throw new Error('Admin only')
    const booking = await revertBooking(Number(ctx.params.id), ctx.body.status)
    return booking
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      status: t.UnionEnum(['pending', 'approved']),
    }),
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
