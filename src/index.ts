import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { authController, authCallbackController, authLogoutController, authMeController } from './modules/auth/auth.controller'
import { usersController } from './modules/users/users.controller'
import { roomsController } from './modules/rooms/rooms.controller'
import { bookingsController } from './modules/bookings/bookings.controller'
import { approvalsController } from './modules/approvals/approvals.controller'
import { externalRequestsController } from './modules/external-requests/external-requests.controller'
import { notificationsController } from './modules/notifications/notifications.controller'
import { equipmentController } from './modules/equipment/equipment.controller'
import { feedbackController } from './modules/feedback/feedback.controller'
import { reportsController } from './modules/reports/reports.controller'
import { auditLogsController } from './modules/audit-logs/audit-logs.controller'
import { amenitiesController } from './modules/amenities/amenities.controller'
import { auditPlugin } from './middleware/audit.plugin'
import { env } from './utils/env'

const api = new Elysia({ prefix: '/tp-booking-api/api' })
  .use(cors({ origin: env.FRONTEND_URL, credentials: true }))
  .onError(({ error, code }) => {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = code === 'NOT_FOUND' ? 404 : code === 'VALIDATION' ? 400 : 500
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  .use(auditPlugin)
  .use(authController)
  .use(authCallbackController)
  .use(authLogoutController)
  .use(authMeController)
  .use(usersController)
  .use(roomsController)
  .use(amenitiesController)
  .use(bookingsController)
  .use(approvalsController)
  .use(externalRequestsController)
  .use(notificationsController)
  .use(equipmentController)
  .use(feedbackController)
  .use(reportsController)
  .use(auditLogsController)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const app = new Elysia()
  .use(staticPlugin({ assets: env.UPLOAD_DIR, prefix: '/uploads' }))
  .use(api)
  .listen({ port: env.APP_PORT, hostname: '0.0.0.0' })

console.log(`🚀 Server running at http://localhost:${app.server!.port}`)
