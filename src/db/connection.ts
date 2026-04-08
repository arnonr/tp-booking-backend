import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'
import { env } from '../utils/env'

const pool = mysql.createPool(env.DATABASE_URL)
export const db = drizzle(pool, {
  schema,
  mode: 'default',
  logger: process.env.NODE_ENV !== 'production',
})
export type Database = typeof db
