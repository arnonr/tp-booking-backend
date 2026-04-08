import { db } from '../../db/connection'
import { users } from '../../db/schema'
import { eq, like, and, SQL } from 'drizzle-orm'

export async function listUsers(params: {
  page?: number
  limit?: number
  department?: string
  role?: string
  search?: string
}) {
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  const offset = (page - 1) * limit

  const conditions: SQL[] = []
  if (params.department) conditions.push(eq(users.department, params.department))
  if (params.role) conditions.push(eq(users.role, params.role as 'admin' | 'employee'))
  if (params.search) conditions.push(like(users.fullName, `%${params.search}%`))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db.select().from(users).where(where).limit(limit).offset(offset)
  const total = await db.select({ count: users.id }).from(users).where(where)

  return {
    data: rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      fullName: r.fullName,
      department: r.department,
      phone: r.phone,
      role: r.role,
      isActive: r.isActive,
      createdAt: r.createdAt,
    })),
    pagination: {
      page,
      limit,
      total: total.length,
    },
  }
}

export async function getUserById(id: number) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return row ?? null
}

export async function createUser(data: {
  username: string
  email: string
  fullName: string
  department?: string
  phone?: string
  role?: 'admin' | 'employee'
  ssoId: string
}) {
  const result = await db.insert(users).values({
    username: data.username,
    email: data.email,
    fullName: data.fullName,
    department: data.department,
    phone: data.phone,
    role: data.role ?? 'employee',
    ssoId: data.ssoId,
    provider: 'organization',
  })
  return Number(result[0].insertId)
}

export async function updateUser(id: number, data: {
  email?: string
  fullName?: string
  department?: string
  phone?: string
  role?: 'admin' | 'employee'
}) {
  await db.update(users).set(data).where(eq(users.id, id))
}

export async function updateUserStatus(id: number, isActive: boolean) {
  await db.update(users).set({ isActive }).where(eq(users.id, id))
}
