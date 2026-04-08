import { db } from '../../db/connection'
import { amenities, roomAmenities } from '../../db/schema'
import { eq, count } from 'drizzle-orm'

export async function listAmenities() {
  return db.select().from(amenities).orderBy(amenities.name)
}

export async function createAmenity(data: { name: string; icon?: string }) {
  const result: any = await db.insert(amenities).values({
    name: data.name,
    icon: data.icon ?? null,
  })
  const id = Number(result[0].insertId)
  const [row] = await db.select().from(amenities).where(eq(amenities.id, id))
  return row
}

export async function updateAmenity(id: number, data: { name: string; icon?: string }) {
  const [existing] = await db.select().from(amenities).where(eq(amenities.id, id))
  if (!existing) throw new Error('Amenity not found')

  await db.update(amenities).set({
    name: data.name,
    icon: data.icon ?? null,
  }).where(eq(amenities.id, id))

  const [updated] = await db.select().from(amenities).where(eq(amenities.id, id))
  return updated
}

export async function deleteAmenity(id: number) {
  const [existing] = await db.select().from(amenities).where(eq(amenities.id, id))
  if (!existing) throw new Error('Amenity not found')

  const [usage] = await db
    .select({ cnt: count() })
    .from(roomAmenities)
    .where(eq(roomAmenities.amenityId, id))

  if (Number(usage.cnt) > 0) {
    throw new Error(`ไม่สามารถลบได้ เนื่องจาก amenity นี้ยังถูกใช้งานอยู่ใน ${usage.cnt} ห้อง`)
  }

  await db.delete(amenities).where(eq(amenities.id, id))
}
