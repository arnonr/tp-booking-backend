import { t } from 'elysia'

export const createRoomSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  building: t.Optional(t.String({ maxLength: 100 })),
  floor: t.Optional(t.String({ maxLength: 20 })),
  capacity: t.Number({ minimum: 1 }),
  description: t.Optional(t.String()),
  status: t.Optional(t.UnionEnum(['active', 'maintenance', 'inactive'])),
  openTime: t.Optional(t.String()),  // HH:mm
  closeTime: t.Optional(t.String()), // HH:mm
  slotDurationMin: t.Optional(t.Number({ minimum: 15 })),
})

export const updateRoomSchema = t.Partial(createRoomSchema)

export const updateAmenitiesSchema = t.Object({
  amenityIds: t.Array(t.Number()),
})

export const imageUploadSchema = t.Object({
  images: t.Files({ type: 'image/', maxSize: '10m' }),
})

export const availabilityQuerySchema = t.Object({
  date: t.String(), // YYYY-MM-DD
})
