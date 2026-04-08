import { db } from '../../db/connection'
import { bookings, rooms, users, auditLogs } from '../../db/schema'
import { eq, sql, and, desc, gte, lte } from 'drizzle-orm'

// ─── Summary ──────────────────────────────────────────

export async function getSummary() {
  const today = new Date()
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const [totalBookingsRow]: any = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)

  const [todayBookingsRow]: any = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .where(eq(bookings.bookingDate as any, todayStr as any))

  const [totalRoomsRow]: any = await db
    .select({ count: sql<number>`count(*)` })
    .from(rooms)
    .where(sql`${rooms.status} != 'inactive'`)

  const [totalUsersRow]: any = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.isActive, true))

  const [pendingRow]: any = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .where(eq(bookings.status as any, 'pending' as any))

  // Occupancy rate: ratio of today's booked room-hours to total possible room-hours
  const [occupiedRow]: any = await db
    .select({
      totalSlots: sql<number>`count(*)`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.bookingDate as any, todayStr as any),
        sql`${bookings.status} IN ('pending', 'approved')`,
      ),
    )

  const totalRooms = Number(totalRoomsRow.count)
  // Assume 8 working hours per room per day (open_time to close_time)
  const workingHoursPerRoom = 8
  const totalPossibleSlots = totalRooms * workingHoursPerRoom
  const occupiedSlots = Number(occupiedRow.totalSlots)
  const occupancyRate = totalPossibleSlots > 0 ? occupiedSlots / totalPossibleSlots : 0

  return {
    totalBookings: Number(totalBookingsRow.count),
    totalRooms,
    totalUsers: Number(totalUsersRow.count),
    pendingApprovals: Number(pendingRow.count),
    todayBookings: Number(todayBookingsRow.count),
    occupancyRate: Math.round(occupancyRate * 1000) / 1000, // 3 decimal places
  }
}

// ─── Monthly Stats ────────────────────────────────────

export async function getMonthlyStats(year?: number) {
  const targetYear = year ?? new Date().getFullYear()

  const rows: any = await db
    .select({
      month: sql<string>`DATE_FORMAT(${bookings.bookingDate}, '%Y-%m')`,
      totalBookings: sql<number>`count(*)`,
      approved: sql<number>`sum(case when ${bookings.status} = 'approved' then 1 else 0 end)`,
      rejected: sql<number>`sum(case when ${bookings.status} = 'rejected' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${bookings.status} = 'cancelled' then 1 else 0 end)`,
      completed: sql<number>`sum(case when ${bookings.status} = 'completed' then 1 else 0 end)`,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.bookingDate as any, `${targetYear}-01-01` as any),
        lte(bookings.bookingDate as any, `${targetYear}-12-31` as any),
      ),
    )
    .groupBy(sql`DATE_FORMAT(${bookings.bookingDate}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${bookings.bookingDate}, '%Y-%m')`)

  return rows.map((row: any) => ({
    month: row.month,
    totalBookings: Number(row.totalBookings),
    approved: Number(row.approved),
    rejected: Number(row.rejected),
    cancelled: Number(row.cancelled),
    completed: Number(row.completed),
  }))
}

// ─── Room Usage ───────────────────────────────────────

export async function getRoomUsage() {
  const rows: any = await db
    .select({
      roomId: rooms.id,
      roomName: rooms.name,
      totalBookings: sql<number>`count(${bookings.id})`,
      totalHours: sql<number>`coalesce(sum(time_to_sec(timediff(${bookings.endTime}, ${bookings.startTime})) / 3600), 0)`,
    })
    .from(rooms)
    .leftJoin(
      bookings,
      and(
        eq(bookings.roomId, rooms.id),
        sql`${bookings.status} IN ('approved', 'completed')`,
      ),
    )
    .where(sql`${rooms.status} != 'inactive'`)
    .groupBy(rooms.id)
    .orderBy(desc(sql`count(${bookings.id})`))

  // Calculate occupancy rate per room based on last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)

  const totalWorkingHours30Days = 22 * 8 // 22 working days * 8 hours

  return rows.map((row: any) => ({
    roomId: Number(row.roomId),
    roomName: row.roomName,
    totalBookings: Number(row.totalBookings),
    totalHours: Math.round(Number(row.totalHours) * 100) / 100,
    occupancyRate: totalWorkingHours30Days > 0
      ? Math.round((Number(row.totalHours) / totalWorkingHours30Days) * 1000) / 1000
      : 0,
  }))
}

// ─── Peak Hours ───────────────────────────────────────

export async function getPeakHours() {
  const rows: any = await db
    .select({
      hour: sql<string>`DATE_FORMAT(${bookings.startTime}, '%H:00')`,
      bookingCount: sql<number>`count(*)`,
    })
    .from(bookings)
    .where(sql`${bookings.status} IN ('approved', 'completed')`)
    .groupBy(sql`DATE_FORMAT(${bookings.startTime}, '%H:00')`)
    .orderBy(sql`DATE_FORMAT(${bookings.startTime}, '%H:00')`)

  return rows.map((row: any) => ({
    hour: row.hour,
    bookingCount: Number(row.bookingCount),
  }))
}
