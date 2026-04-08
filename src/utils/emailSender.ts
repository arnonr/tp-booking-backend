import nodemailer from 'nodemailer'
import { env } from './env'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST) {
    console.log(`[Email] Skipped (no SMTP config): ${subject} → ${to}`)
    return
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@company.com',
    to,
    subject,
    html,
  })
}
