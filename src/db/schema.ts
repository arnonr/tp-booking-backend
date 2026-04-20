import { mysqlTable, int, varchar, text, boolean, timestamp, date, time, tinyint, json, mysqlEnum } from 'drizzle-orm/mysql-core'

// ─── Users ───────────────────────────────────────────
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  ssoId: varchar('sso_id', { length: 255 }).notNull().unique(),
  provider: varchar('provider', { length: 50 }).notNull().default('organization'),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  department: varchar('department', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  role: mysqlEnum('role', ['admin', 'employee']).default('employee'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── Rooms ───────────────────────────────────────────
export const rooms = mysqlTable('rooms', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  building: varchar('building', { length: 100 }),
  floor: varchar('floor', { length: 20 }),
  capacity: int('capacity').notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['active', 'maintenance', 'inactive']).default('active'),
  openTime: time('open_time').default('08:00:00'),
  closeTime: time('close_time').default('17:00:00'),
  slotDurationMin: int('slot_duration_min').default(60),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
})

export const roomImages = mysqlTable('room_images', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  sortOrder: int('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const amenities = mysqlTable('amenities', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
})

export const roomAmenities = mysqlTable('room_amenities', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  amenityId: int('amenity_id').notNull(),
})

export const timeSlots = mysqlTable('time_slots', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  dayOfWeek: mysqlEnum('day_of_week', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isAvailable: boolean('is_available').default(true),
})

// ─── Bookings ────────────────────────────────────────
export const bookings = mysqlTable('bookings', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  roomId: int('room_id').notNull(),
  bookingDate: date('booking_date').notNull(),
  endDate: date('end_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  purpose: varchar('purpose', { length: 500 }).notNull(),
  attendeeCount: int('attendee_count').notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'cancelled', 'completed']).default('pending'),
  adminRemark: text('admin_remark'),
  approvedBy: int('approved_by'),
  approvedAt: timestamp('approved_at'),
  checkedIn: boolean('checked_in').default(false),
  checkedInAt: timestamp('checked_in_at'),
  additionalRequirements: text('additional_requirements'),
  recurringGroupId: varchar('recurring_group_id', { length: 36 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
})

export const bookingParticipants = mysqlTable('booking_participants', {
  id: int('id').primaryKey().autoincrement(),
  bookingId: int('booking_id').notNull(),
  userId: int('user_id').notNull(),
})

export const bookingEquipment = mysqlTable('booking_equipment', {
  id: int('id').primaryKey().autoincrement(),
  bookingId: int('booking_id').notNull(),
  equipmentId: int('equipment_id').notNull(),
  quantity: int('quantity').default(1),
})

// ─── Equipment ───────────────────────────────────────
export const equipment = mysqlTable('equipment', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  totalQty: int('total_qty').default(1),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Feedback ────────────────────────────────────────
export const feedback = mysqlTable('feedback', {
  id: int('id').primaryKey().autoincrement(),
  bookingId: int('booking_id').notNull().unique(),
  userId: int('user_id').notNull(),
  rating: tinyint('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Notifications ───────────────────────────────────
export const notifications = mysqlTable('notifications', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  bookingId: int('booking_id'),
  type: mysqlEnum('type', [
    'booking_approved', 'booking_rejected',
    'new_booking_request', 'new_external_request',
    'booking_reminder', 'booking_cancelled', 'no_show_warning',
  ]).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── External Requests ───────────────────────────────
export const externalRequests = mysqlTable('external_requests', {
  id: int('id').primaryKey().autoincrement(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  organization: varchar('organization', { length: 200 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 200 }),
  roomId: int('room_id'),
  preferredDate: date('preferred_date'),
  preferredStart: time('preferred_start'),
  preferredEnd: time('preferred_end'),
  purpose: text('purpose').notNull(),
  refCode: varchar('ref_code', { length: 20 }).notNull().unique(),
  status: mysqlEnum('status', ['new', 'contacted', 'confirmed', 'declined']).default('new'),
  adminNote: text('admin_note'),
  handledBy: int('handled_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── Audit Logs ──────────────────────────────────────
export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id'),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: int('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  oldValues: json('old_values'),
  newValues: json('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
})
