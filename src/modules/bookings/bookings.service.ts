import { db } from '../../db/connection'
import { bookings, bookingParticipants, bookingEquipment, rooms, users } from '../../db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'
import type { AuthUser } from '../../middleware/auth.guard'

const CANCEL_BEFORE_HOURS = Number(process.env.CANCEL_BEFORE_HOURS ?? 2)
const CHECKIN_GRACE_MINUTES = Number(process.env.CHECKIN_GRACE_MINUTES ?? 15)

// ─── Time Helpers ──────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function validateTimes(startTime: string, endTime: string) {
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new Error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
  }
}

function validateNotPast(bookingDate: string) {
  const today = new Date()
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  if (bookingDate < todayStr) {
    throw new Error('ไม่สามารถจองวันที่ผ่านมาแล้วได้')
  }
}

async function validateRoomConstraints(roomId: number, attendeeCount: number, startTime: string, endTime: string) {
  const [room]: any = await db
    .select({ capacity: rooms.capacity, openTime: rooms.openTime, closeTime: rooms.closeTime, status: rooms.status })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)

  if (!room) throw new Error('ไม่พบห้องประชุมที่เลือก')
  if (room.status !== 'active') throw new Error('ห้องประชุมนี้ไม่พร้อมให้บริการในขณะนี้')
  if (attendeeCount > room.capacity) {
    throw new Error(`จำนวนผู้เข้าร่วม (${attendeeCount} คน) เกินความจุของห้อง (${room.capacity} คน)`)
  }

  const openMin = timeToMinutes(room.openTime)
  const closeMin = timeToMinutes(room.closeTime)
  const startMin = timeToMinutes(startTime)
  const endMin = timeToMinutes(endTime)

  if (startMin < openMin || endMin > closeMin) {
    const open = room.openTime.slice(0, 5)
    const close = room.closeTime.slice(0, 5)
    throw new Error(`เวลาจองต้องอยู่ในช่วงเปิดทำการของห้อง (${open}–${close})`)
  }
}

// ─── Conflict Check (reusable with tx) ────────────────

function buildConflictConditions(roomId: number, date: string, startTime: string, endTime: string, excludeBookingId?: number) {
  const conditions: any[] = [
    eq(bookings.roomId, roomId),
    eq(bookings.bookingDate as any, date as any),
    sql`${bookings.status} IN ('pending', 'approved')`,
    sql`${bookings.startTime} < ${endTime}`,
    sql`${bookings.endTime} > ${startTime}`,
  ]
  if (excludeBookingId) conditions.push(sql`${bookings.id} != ${excludeBookingId}`)
  return conditions
}

export async function checkConflict(roomId: number, date: string, startTime: string, endTime: string, excludeBookingId?: number) {
  const [conflict]: any = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(...buildConflictConditions(roomId, date, startTime, endTime, excludeBookingId)))
    .limit(1)
  return !!conflict
}

// ─── Create Booking ────────────────────────────────────

export async function createBooking(data: {
  userId: number
  roomId: number
  bookingDate: string
  startTime: string
  endTime: string
  purpose: string
  attendeeCount: number
  additionalRequirements?: string
  participantIds?: number[]
  equipmentItems?: Array<{ equipmentId: number; quantity: number }>
}) {
  validateTimes(data.startTime, data.endTime)
  validateNotPast(data.bookingDate)
  await validateRoomConstraints(data.roomId, data.attendeeCount, data.startTime, data.endTime)

  let bookingId: number = 0

  await db.transaction(async (tx) => {
    const [conflict]: any = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(...buildConflictConditions(data.roomId, data.bookingDate, data.startTime, data.endTime)))
      .limit(1)

    if (conflict) throw new Error('Booking conflict: room is already booked for this time slot')

    const result: any = await tx.insert(bookings).values({
      userId: data.userId,
      roomId: data.roomId,
      bookingDate: data.bookingDate as any,
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose,
      attendeeCount: data.attendeeCount,
      additionalRequirements: data.additionalRequirements ?? null,
    })

    bookingId = Number(result[0].insertId)

    if (data.participantIds?.length) {
      await tx.insert(bookingParticipants).values(
        data.participantIds.map((userId) => ({ bookingId, userId })),
      )
    }

    if (data.equipmentItems?.length) {
      await tx.insert(bookingEquipment).values(
        data.equipmentItems.map((item) => ({
          bookingId,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        })),
      )
    }
  })

  return bookingId
}

// ─── Get Booking ─────────────────────────────────────

export async function getBookingById(id: number) {
  const rows: any = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      roomId: bookings.roomId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      purpose: bookings.purpose,
      attendeeCount: bookings.attendeeCount,
      additionalRequirements: bookings.additionalRequirements,
      status: bookings.status,
      adminRemark: bookings.adminRemark,
      approvedBy: bookings.approvedBy,
      approvedAt: bookings.approvedAt,
      checkedIn: bookings.checkedIn,
      checkedInAt: bookings.checkedInAt,
      recurringGroupId: bookings.recurringGroupId,
      createdAt: bookings.createdAt,
      room: {
        id: rooms.id,
        name: rooms.name,
        building: rooms.building,
        floor: rooms.floor,
        capacity: rooms.capacity,
        status: rooms.status,
        description: rooms.description,
      },
      user: {
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        department: users.department,
        phone: users.phone,
      },
    })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.id, id))
    .limit(1)

  if (!rows.length) return null
  const booking = rows[0]

  const participants = await db.select().from(bookingParticipants).where(eq(bookingParticipants.bookingId, id))
  const equipment = await db.select().from(bookingEquipment).where(eq(bookingEquipment.bookingId, id))

  return { ...booking, participants, equipment }
}

// ─── List Bookings ───────────────────────────────────

export async function listBookings(params: {
  userId?: number
  status?: string
  dateFrom?: string
  dateTo?: string
  roomId?: number
  page?: number
  limit?: number
}) {
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  const offset = (page - 1) * limit
  const conditions: any[] = []

  if (params.userId) conditions.push(eq(bookings.userId, params.userId))
  if (params.status) conditions.push(eq(bookings.status as any, params.status as any))
  if (params.roomId) conditions.push(eq(bookings.roomId, params.roomId))
  if (params.dateFrom) conditions.push(sql`${bookings.bookingDate} >= ${params.dateFrom}`)
  if (params.dateTo) conditions.push(sql`${bookings.bookingDate} <= ${params.dateTo}`)

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows: any = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      roomId: bookings.roomId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      purpose: bookings.purpose,
      attendeeCount: bookings.attendeeCount,
      additionalRequirements: bookings.additionalRequirements,
      status: bookings.status,
      adminRemark: bookings.adminRemark,
      approvedBy: bookings.approvedBy,
      approvedAt: bookings.approvedAt,
      checkedIn: bookings.checkedIn,
      checkedInAt: bookings.checkedInAt,
      recurringGroupId: bookings.recurringGroupId,
      createdAt: bookings.createdAt,
      room: {
        id: rooms.id,
        name: rooms.name,
        building: rooms.building,
        floor: rooms.floor,
        capacity: rooms.capacity,
        status: rooms.status,
      },
      user: {
        id: users.id,
        fullName: users.fullName,
        department: users.department,
        email: users.email,
      },
    })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRow]: any = await db
    .select({ total: sql<number>`count(*)` })
    .from(bookings)
    .where(where)

  return { data: rows, pagination: { page, limit, total: Number(countRow.total) } }
}

// ─── Update Booking ──────────────────────────────────

export async function updateBooking(
  id: number,
  user: { id: number; role: string },
  data: {
    bookingDate?: string
    startTime?: string
    endTime?: string
    purpose?: string
    attendeeCount?: number
    additionalRequirements?: string
  },
) {
  const [booking]: any = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
  if (!booking) throw new Error('Booking not found')

  if (user.role !== 'admin' && booking.userId !== user.id) throw new Error('Forbidden')

  const editableStatuses = user.role === 'admin'
    ? ['pending', 'approved', 'rejected']
    : ['pending', 'approved']
  if (!editableStatuses.includes(booking.status)) {
    throw new Error(`Cannot edit booking with status: ${booking.status}`)
  }

  const newDate = data.bookingDate ?? booking.bookingDate
  const newStart = data.startTime ?? booking.startTime
  const newEnd = data.endTime ?? booking.endTime
  const newAttendeeCount = data.attendeeCount ?? booking.attendeeCount

  // Validate times and date only if they changed
  if (data.startTime !== undefined || data.endTime !== undefined) {
    validateTimes(newStart, newEnd)
  }
  if (data.bookingDate !== undefined) {
    validateNotPast(newDate)
  }
  if (data.startTime !== undefined || data.endTime !== undefined || data.attendeeCount !== undefined) {
    await validateRoomConstraints(booking.roomId, newAttendeeCount, newStart, newEnd)
  }

  const conflict = await checkConflict(booking.roomId, newDate, newStart, newEnd, id)
  if (conflict) throw new Error('Booking conflict: room is already booked for this time slot')

  await db.update(bookings).set({
    ...(data.bookingDate !== undefined && { bookingDate: data.bookingDate as any }),
    ...(data.startTime !== undefined && { startTime: data.startTime }),
    ...(data.endTime !== undefined && { endTime: data.endTime }),
    ...(data.purpose !== undefined && { purpose: data.purpose }),
    ...(data.attendeeCount !== undefined && { attendeeCount: data.attendeeCount }),
    ...(data.additionalRequirements !== undefined && { additionalRequirements: data.additionalRequirements }),
  }).where(eq(bookings.id, id)) as any

  return getBookingById(id)
}

// ─── Cancel Booking ──────────────────────────────────

export async function cancelBooking(id: number, user: AuthUser) {
  const [booking]: any = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
  if (!booking) throw new Error('Booking not found')

  if (!['pending', 'approved'].includes(booking.status)) {
    throw new Error(`Cannot cancel booking with status: ${booking.status}`)
  }

  if (user.role !== 'admin') {
    if (booking.userId !== user.id) throw new Error('Not your booking')
    const bookingStart = new Date(`${booking.bookingDate}T${booking.startTime}`)
    const cancelDeadline = new Date(bookingStart.getTime() - CANCEL_BEFORE_HOURS * 60 * 60 * 1000)
    if (new Date() > cancelDeadline) {
      throw new Error(`Cannot cancel less than ${CANCEL_BEFORE_HOURS} hours before start time`)
    }
  }

  await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, id)) as any
}

// ─── Check In ───────────────────────────────────────

export async function checkIn(id: number, userId: number) {
  const [booking]: any = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
  if (!booking) throw new Error('Booking not found')
  if (booking.status !== 'approved') throw new Error('Only approved bookings can be checked in')
  if (booking.userId !== userId) throw new Error('Not your booking')
  if (booking.checkedIn) throw new Error('Already checked in')

  const now = new Date()
  const bookingStart = new Date(`${booking.bookingDate}T${booking.startTime}`)
  const graceEnd = new Date(bookingStart.getTime() + CHECKIN_GRACE_MINUTES * 60 * 1000)
  if (now > graceEnd) throw new Error('Check-in grace period has expired')

  await db.update(bookings).set({
    checkedIn: true,
    checkedInAt: new Date(),
  }).where(eq(bookings.id, id)) as any
}

// ─── Calendar View ───────────────────────────────────

export async function getCalendar(params: { roomId?: number; dateFrom: string; dateTo: string }) {
  const conditions: any[] = [
    sql`${bookings.bookingDate} >= ${params.dateFrom}`,
    sql`${bookings.bookingDate} <= ${params.dateTo}`,
    sql`${bookings.status} IN ('pending', 'approved')`,
  ]
  if (params.roomId) conditions.push(eq(bookings.roomId, params.roomId))

  const rows = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      roomId: bookings.roomId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      purpose: bookings.purpose,
      attendeeCount: bookings.attendeeCount,
      additionalRequirements: bookings.additionalRequirements,
      status: bookings.status,
      checkedIn: bookings.checkedIn,
      room: {
        id: rooms.id,
        name: rooms.name,
        building: rooms.building,
        floor: rooms.floor,
        capacity: rooms.capacity,
      },
      user: {
        id: users.id,
        fullName: users.fullName,
        department: users.department,
      },
    })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(and(...conditions))
    .orderBy(bookings.bookingDate, bookings.startTime)

  return rows
}

// ─── Recurring Booking ──────────────────────────────

export async function createRecurringBooking(data: {
  userId: number
  roomId: number
  startDate: string
  startTime: string
  endTime: string
  purpose: string
  attendeeCount: number
  frequency: 'weekly' | 'monthly'
  untilDate: string
  participantIds?: number[]
  equipmentItems?: Array<{ equipmentId: number; quantity: number }>
}) {
  validateTimes(data.startTime, data.endTime)
  validateNotPast(data.startDate)
  await validateRoomConstraints(data.roomId, data.attendeeCount, data.startTime, data.endTime)

  const recurringGroupId = crypto.randomUUID()
  const dates = generateRecurringDates(data.startDate, data.untilDate, data.frequency)
  const createdIds: number[] = []
  const skippedDates: string[] = []

  for (const date of dates) {
    const conflict = await checkConflict(data.roomId, date, data.startTime, data.endTime)
    if (conflict) {
      skippedDates.push(date)
      continue
    }

    const result: any = await db.insert(bookings).values({
      userId: data.userId,
      roomId: data.roomId,
      bookingDate: date as any,
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose,
      attendeeCount: data.attendeeCount,
      recurringGroupId,
    })

    const bookingId = Number(result[0].insertId)
    createdIds.push(bookingId)

    if (data.participantIds?.length) {
      await db.insert(bookingParticipants).values(
        data.participantIds.map((userId) => ({ bookingId, userId })),
      )
    }

    if (data.equipmentItems?.length) {
      await db.insert(bookingEquipment).values(
        data.equipmentItems.map((item) => ({
          bookingId,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        })),
      )
    }
  }

  return { recurringGroupId, createdCount: createdIds.length, bookingIds: createdIds, skippedDates }
}

function generateRecurringDates(startDate: string, untilDate: string, frequency: 'weekly' | 'monthly'): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(untilDate)
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    if (frequency === 'weekly') {
      current.setDate(current.getDate() + 7)
    } else {
      current.setMonth(current.getMonth() + 1)
    }
  }
  return dates
}
