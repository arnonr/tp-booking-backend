import { Elysia, t } from 'elysia'
import { authGuard } from '../../middleware/auth.guard'
import { listAmenities, createAmenity, updateAmenity, deleteAmenity } from './amenities.service'
import { createAmenitySchema, updateAmenitySchema } from './amenities.schema'

export const amenitiesController = new Elysia({ prefix: '/amenities' })
  // ─── Public: list ──────────────────────────────────
  .get('/', () => listAmenities())

  // ─── Admin only ────────────────────────────────────
  .use(authGuard(['admin']))

  .post('/', async (ctx: any) => {
    const amenity = await createAmenity(ctx.body)
    return amenity
  }, {
    body: createAmenitySchema,
  })

  .put('/:id', async (ctx: any) => {
    const amenity = await updateAmenity(Number(ctx.params.id), ctx.body)
    return amenity
  }, {
    params: t.Object({ id: t.String() }),
    body: updateAmenitySchema,
  })

  .delete('/:id', async (ctx: any) => {
    await deleteAmenity(Number(ctx.params.id))
    return { message: 'Amenity deleted' }
  }, {
    params: t.Object({ id: t.String() }),
  })
