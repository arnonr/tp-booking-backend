import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import type { AuthUser } from '../../middleware/auth.guard'
import {
  listRooms, getRoomDetail, createRoom, updateRoom, softDeleteRoom,
  addRoomImage, deleteRoomImage, setRoomAmenities, getRoomAvailability,
} from './rooms.service'
import { createRoomSchema, updateRoomSchema, updateAmenitiesSchema, imageUploadSchema, availabilityQuerySchema } from './rooms.schema'

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
    const imageId = await addRoomImage(roomId, ctx.body.imageUrl, ctx.body.sortOrder)
    return { id: imageId, message: 'Image uploaded' }
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
