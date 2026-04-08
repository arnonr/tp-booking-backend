import { db } from '../../db/connection'
import { bookings, notifications } from '../../db/schema'
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

  const rows = await db.select().from(bookings)
    .where(and(...conditions))
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset(offset) as any

  const total = await db.select({ count: sql`count(*)` }).from(bookings)
    .where(and(...conditions)) as any

  return {
    data: rows,
    pagination: { page, limit, total: total.length },
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
