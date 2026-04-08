import { db } from '../../db/connection'
import { bookings, notifications, users, rooms } from '../../db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'

import type { AuthUser } from '../../middleware/auth.guard'

 const CANCEL_BEFORE_HOURS = Number(process.env.CANCEL_BEFORE_HOURS ?? 2)

// ─── List Pending Approvals ────────────────────────
export async function listPending(params: {
  roomId?: number
  department?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) {
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = [eq(bookings.status, 'pending')]

  if (params.roomId) conditions.push(eq(bookings.roomId, params.roomId))
  if (params.dateFrom) conditions.push(sql`${bookings.bookingDate} >= ${params.dateFrom}`)
  if (params.dateTo) conditions.push(sql`${bookings.bookingDate} <= ${params.dateTo}`)

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
      adminRemark: bookings.adminRemark,
      approvedBy: bookings.approvedBy,
      approvedAt: bookings.approvedAt,
      checkedIn: bookings.checkedIn,
      checkedInAt: bookings.checkedInAt,
      recurringGroupId: bookings.recurringGroupId,
      createdAt: bookings.createdAt,
      user: {
        id: users.id,
        fullName: users.fullName,
        department: users.department,
        email: users.email,
      },
      room: {
        id: rooms.id,
        name: rooms.name,
        building: rooms.building,
        floor: rooms.floor,
        capacity: rooms.capacity,
      },
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(and(...conditions))
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset(offset) as any

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(bookings)
    .where(and(...conditions)) as any

  return {
    data: rows,
    pagination: { page, limit, total: Number(count) },
  }
}

// ─── Approve Booking ─────────────────────────────────
export async function approveBooking(bookingId: number, adminId: number) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1) as any
  if (!booking) throw new Error('Booking not found')
  if (booking.status !== 'pending') throw new Error('Only pending bookings can be approved')

  await db.update(bookings).set({
    status: 'approved',
    approvedBy: adminId,
    approvedAt: new Date(),
  }).where(eq(bookings.id, bookingId)) as any

  // Notify the employee
  await db.insert(notifications).values({
    userId: booking.userId,
    bookingId,
    type: 'booking_approved',
    title: 'การจองได้รับการอนุมัติ',
    message: `การจองห้องของคุณในวันที่ ${booking.bookingDate} ได้รับการอนุมัติแล้ว`,
  }) as any
}

// ─── Reject Booking ──────────────────────────────────
export async function rejectBooking(bookingId: number, adminId: number, remark: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1) as any
  if (!booking) throw new Error('Booking not found')
  if (booking.status !== 'pending') throw new Error('Only pending bookings can be rejected')

  await db.update(bookings).set({
    status: 'rejected',
    approvedBy: adminId,
    approvedAt: new Date(),
    adminRemark: remark,
  }).where(eq(bookings.id, bookingId)) as any

  // Notify the employee
  await db.insert(notifications).values({
    userId: booking.userId,
    bookingId,
    type: 'booking_rejected',
    title: 'การจองถูกปฏิเสธ',
    message: `การจองห้องของคุณในวันที่ ${booking.bookingDate} ถูกปฏิเสธ${remark ? `: ${remark}` : ''}`,
  }) as any
}

// ─── Bulk Action ─────────────────────────────────────
export async function bulkAction(
  items: Array<{ bookingId: number; action: 'approve' | 'reject'; remark?: string }>,
  adminId: number,
) {
  let approved = 0
  let rejected = 0
  let errors = 0

  for (const item of items) {
    try {
      if (item.action === 'approve') {
        await approveBooking(item.bookingId, adminId)
        approved++
      } else {
        await rejectBooking(item.bookingId, adminId, item.remark ?? '')
        rejected++
      }
    } catch {
      errors++
    }
  }

  return { approved, rejected, errors }
}
