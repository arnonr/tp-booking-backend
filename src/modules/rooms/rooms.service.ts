import { db } from '../../db/connection'
import { rooms, roomImages, amenities, roomAmenities, timeSlots, bookings } from '../../db/schema'
import { eq, and, sql, like, or, inArray } from 'drizzle-orm'

// ─── Room CRUD ────────────────────────────────────────

export async function listRooms(params?: {
  status?: string
  building?: string
  minCapacity?: number
  search?: string
  amenityId?: number
}) {
  const conditions = []
  if (params?.status) conditions.push(eq(rooms.status, params.status as any))
  if (params?.building) conditions.push(eq(rooms.building, params.building))
  if (params?.minCapacity) conditions.push(sql`${rooms.capacity} >= ${params.minCapacity}`)
  if (params?.search) conditions.push(or(like(rooms.name, `%${params.search}%`), like(rooms.description, `%${params.search}%`))!)

  let roomRows: any[]
  if (params?.amenityId) {
    // Filter by amenity: join through roomAmenities
    const where = conditions.length > 0 ? and(...conditions, eq(roomAmenities.amenityId, params.amenityId)) : eq(roomAmenities.amenityId, params.amenityId)
    roomRows = await db.select({
      id: rooms.id, name: rooms.name, building: rooms.building, floor: rooms.floor,
      capacity: rooms.capacity, description: rooms.description, status: rooms.status,
      color: rooms.color,
      openTime: rooms.openTime, closeTime: rooms.closeTime, slotDurationMin: rooms.slotDurationMin,
    }).from(rooms)
      .innerJoin(roomAmenities, eq(rooms.id, roomAmenities.roomId))
      .where(where)
      .orderBy(rooms.name)
      .groupBy(rooms.id) as any
  } else {
    const where = conditions.length > 0 ? and(...conditions) : undefined
    roomRows = await db.select().from(rooms).where(where).orderBy(rooms.name) as any
  }

  if (roomRows.length === 0) return []

  // Batch fetch images and amenities for all rooms
  const roomIds = roomRows.map((r: any) => r.id)

  const allImages = await db.select().from(roomImages)
    .where(inArray(roomImages.roomId, roomIds))
    .orderBy(roomImages.sortOrder) as any

  const allAmenityRows = await db.select({
    roomId: roomAmenities.roomId,
    id: amenities.id, name: amenities.name, icon: amenities.icon,
  }).from(roomAmenities)
    .innerJoin(amenities, eq(roomAmenities.amenityId, amenities.id))
    .where(inArray(roomAmenities.roomId, roomIds)) as any

  // Group images and amenities by roomId
  const imageMap = new Map<number, any[]>()
  for (const img of allImages) {
    if (!imageMap.has(img.roomId)) imageMap.set(img.roomId, [])
    imageMap.get(img.roomId)!.push(img)
  }

  const amenityMap = new Map<number, any[]>()
  for (const a of allAmenityRows) {
    if (!amenityMap.has(a.roomId)) amenityMap.set(a.roomId, [])
    amenityMap.get(a.roomId)!.push({ id: a.id, name: a.name, icon: a.icon })
  }

  return roomRows.map((room: any) => ({
    ...room,
    images: imageMap.get(room.id) || [],
    amenities: amenityMap.get(room.id) || [],
  }))
}

export async function getRoomDetail(id: number) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1) as any
  if (!room) return null

  const images = await db.select().from(roomImages)
    .where(eq(roomImages.roomId, id))
    .orderBy(roomImages.sortOrder) as any

  const amenityRows = await db.select({ id: amenities.id, name: amenities.name, icon: amenities.icon })
    .from(roomAmenities)
    .innerJoin(amenities, eq(roomAmenities.amenityId, amenities.id))
    .where(eq(roomAmenities.roomId, id)) as any

  const slots = await db.select().from(timeSlots)
    .where(eq(timeSlots.roomId, id))
    .orderBy(timeSlots.dayOfWeek, timeSlots.startTime) as any

  return { ...room, images, amenities: amenityRows, timeSlots: slots }
}

export async function createRoom(data: {
  name: string
  building?: string
  floor?: string
  capacity: number
  description?: string
  status?: string
  color?: string
  openTime?: string
  closeTime?: string
  slotDurationMin?: number
}) {
  const result = await db.insert(rooms).values({
    name: data.name,
    building: data.building,
    floor: data.floor,
    capacity: data.capacity,
    description: data.description,
    status: (data.status ?? 'active') as any,
    color: data.color,
    openTime: data.openTime,
    closeTime: data.closeTime,
    slotDurationMin: data.slotDurationMin,
  })
  return Number((result as any)[0].insertId)
}

export async function updateRoom(id: number, data: {
  name?: string
  building?: string
  floor?: string
  capacity?: number
  description?: string
  status?: 'active' | 'maintenance' | 'inactive'
  color?: string
  openTime?: string
  closeTime?: string
  slotDurationMin?: number
}) {
  await db.update(rooms).set(data as any).where(eq(rooms.id, id)) as any
}

export async function softDeleteRoom(id: number) {
  await db.update(rooms).set({ status: 'inactive' }).where(eq(rooms.id, id)) as any
}

// ─── Images ───────────────────────────────────────────

export async function addRoomImage(roomId: number, imageUrl: string, sortOrder?: number) {
  const result = await db.insert(roomImages).values({ roomId, imageUrl, sortOrder: sortOrder ?? 0 })
  return Number((result as any)[0].insertId)
}

export async function deleteRoomImage(imageId: number) {
  await db.delete(roomImages).where(eq(roomImages.id, imageId))
}

// ─── Amenities ────────────────────────────────────────

export async function setRoomAmenities(roomId: number, amenityIds: number[]) {
  await db.delete(roomAmenities).where(eq(roomAmenities.roomId, roomId))
  if (amenityIds.length > 0) {
    await db.insert(roomAmenities).values(amenityIds.map((amenityId) => ({ roomId, amenityId })))
  }
}

export async function listAllAmenities() {
  return db.select().from(amenities)
}

// ─── Availability ─────────────────────────────────────

export async function getRoomAvailability(roomId: number, date: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1) as any
  if (!room) return null

  // Availability on a specific date: include any booking whose range covers it (multi-day aware)
  const bookedSlots = await db.select({
    startTime: bookings.startTime,
    endTime: bookings.endTime,
    status: bookings.status,
  }).from(bookings).where(
    and(
      eq(bookings.roomId, roomId),
      sql`${bookings.bookingDate} <= ${date}`,
      sql`${bookings.endDate} >= ${date}`,
      sql`${bookings.status} IN ('pending', 'approved')`,
    )
  ) as any

  return {
    openTime: room.openTime,
    closeTime: room.closeTime,
    slotDurationMin: room.slotDurationMin,
    bookedSlots,
  }
}
