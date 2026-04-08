import { t } from 'elysia'

export const createAmenitySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  icon: t.Optional(t.String({ maxLength: 50 })),
})

export const updateAmenitySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  icon: t.Optional(t.String({ maxLength: 50 })),
})
