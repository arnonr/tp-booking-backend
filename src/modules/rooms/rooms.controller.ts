import { Elysia, t } from 'elysia'
import { mkdirSync } from 'fs'
import { authGuard } from '../../middleware/auth.guard'
import type { AuthUser } from '../../middleware/auth.guard'
import {
  listRooms, getRoomDetail, createRoom, updateRoom, softDeleteRoom,
  addRoomImage, deleteRoomImage, setRoomAmenities, getRoomAvailability,
} from './rooms.service'
import { createRoomSchema, updateRoomSchema, updateAmenitiesSchema, imageUploadSchema, availabilityQuerySchema } from './rooms.schema'
import { env } from '../../utils/env'

export const roomsController = new Elysia({ prefix: '/rooms' })
  // ─── Public Routes ──────────────────────────────────
  .get('/', async ({ query }) => {
    return listRooms({
      status: query.status ?? 'active',
      building: query.building,
      minCapacity: query.minCapacity ? Number(query.minCapacity) : undefined,
      search: query.search,
      amenityId: query.amenityId ? Number(query.amenityId) : undefined,
    })
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      building: t.Optional(t.String()),
      minCapacity: t.Optional(t.String()),
      search: t.Optional(t.String()),
      amenityId: t.Optional(t.String()),
    }),
  })

  .get('/:id', async ({ params }) => {
    const room = await getRoomDetail(Number(params.id))
    if (!room) throw new Error('Room not found')
    return room
  }, {
    params: t.Object({ id: t.String() }),
  })

  // ─── Admin Routes ───────────────────────────────────
  .use(authGuard(['admin']))

  .post('/', async (ctx: any) => {
    const user: AuthUser = ctx.user
    const id = await createRoom(ctx.body)
    return { id, message: 'Room created' }
  }, {
    body: createRoomSchema,
  })

  .put('/:id', async (ctx: any) => {
    const id = Number(ctx.params.id)
    await updateRoom(id, ctx.body)
    return { message: 'Room updated' }
  }, {
    params: t.Object({ id: t.String() }),
    body: updateRoomSchema,
  })

  .delete('/:id', async (ctx: any) => {
    await softDeleteRoom(Number(ctx.params.id))
    return { message: 'Room deleted (soft)' }
  }, {
    params: t.Object({ id: t.String() }),
  })

  // ─── Images ─────────────────────────────────────────
  .post('/:id/images', async (ctx: any) => {
    const roomId = Number(ctx.params.id)
    mkdirSync(env.UPLOAD_DIR, { recursive: true })
    const raw = ctx.body.images
    const files: File[] = Array.isArray(raw) ? raw : [raw]
    const ids: number[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
      const filename = `room-${roomId}-${Date.now()}-${i}.${ext}`
      await Bun.write(`${env.UPLOAD_DIR}/${filename}`, file)
      const id = await addRoomImage(roomId, `/tp-booking-api/uploads/${filename}`, i)
      ids.push(id)
    }
    return { ids, message: 'Images uploaded' }
  }, {
    params: t.Object({ id: t.String() }),
    body: imageUploadSchema,
  })

  .delete('/:id/images/:imageId', async (ctx: any) => {
    await deleteRoomImage(Number(ctx.params.imageId))
    return { message: 'Image deleted' }
  }, {
    params: t.Object({ id: t.String(), imageId: t.String() }),
  })

  // ─── Amenities ──────────────────────────────────────
  .put('/:id/amenities', async (ctx: any) => {
    const roomId = Number(ctx.params.id)
    await setRoomAmenities(roomId, ctx.body.amenityIds)
    return { message: 'Amenities updated' }
  }, {
    params: t.Object({ id: t.String() }),
    body: updateAmenitiesSchema,
  })

  // ─── Availability (auth) ────────────────────────────
  .use(authGuard())
  .get('/:id/availability', async (ctx: any) => {
    return getRoomAvailability(Number(ctx.params.id), ctx.query.date)
  }, {
    params: t.Object({ id: t.String() }),
    query: availabilityQuerySchema,
  })
