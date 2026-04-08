import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  SSO_CLIENT_ID: z.string(),
  SSO_CLIENT_SECRET: z.string(),
  SSO_REDIRECT_URI: z.string(),
  SSO_SCOPE: z.string(),
  APP_PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(5242880),
  CANCEL_BEFORE_HOURS: z.coerce.number().default(2),
  CHECKIN_GRACE_MINUTES: z.coerce.number().default(15),
  REMINDER_BEFORE_MINUTES: z.coerce.number().default(30),
})

export const env = envSchema.parse(process.env)
