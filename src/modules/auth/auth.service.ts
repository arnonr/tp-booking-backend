import { db } from '../../db/connection'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { env } from '../../utils/env'

const SSO_BASE_URL = 'https://sso.kmutnb.ac.th'

function getAuthConfig() {
  return {
    clientId: env.SSO_CLIENT_ID,
    clientSecret: env.SSO_CLIENT_SECRET,
    redirectUri: env.SSO_REDIRECT_URI,
    scope: env.SSO_SCOPE,
  }
}

// Build SSO authorization URL for frontend redirect
export function getSSORedirectUrl(): string {
  const config = getAuthConfig()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
  })
  return `${SSO_BASE_URL}/auth/authorize?${params.toString()}`
}

// Exchange authorization code for access token
async function getSSOToken(code: string) {
  const config = getAuthConfig()

  const params = new URLSearchParams()
  params.append('grant_type', 'authorization_code')
  params.append('code', code)
  params.append('redirect_uri', config.redirectUri)

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch(`${SSO_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: params.toString(),
  })


  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SSO token exchange failed: ${text}`)
  }

  return response.json() as Promise<{ access_token: string; token_type: string }>
}

// Get user info from SSO using access token
async function getUserInfoFromSSO(accessToken: string) {
  const response = await fetch(`${SSO_BASE_URL}/resources/userinfo?access_token=${accessToken}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json() as SSOUserInfoResponse

  if (!response.ok) {
    throw new Error('Failed to fetch user info from SSO')
  }

  return data
}

interface SSOUserInfoResponse {
  sub?: string
  preferred_username?: string
  name?: string
  given_name?: string
  family_name?: string
  email?: string
  email_verified?: boolean
  locale?: string
  kmutnb_account_type?: string
  kmutnb_personnel_info?: {
    person_key?: string
    full_prefix_name_th?: string
    firstname_th?: string
    lastname_th?: string
    firstname_en?: string
    lastname_en?: string
    faculty_code?: string
    faculty_name?: string
    department_code?: string
    department_name?: string
    position_name?: string
    photo?: string
  }
}

function normalizeSSOUserInfo(data: SSOUserInfoResponse) {
  const personnel = data.kmutnb_personnel_info

  return {
    pid: data.sub ?? null,
    username: data.preferred_username ?? data.sub ?? null,
    email: data.email ?? null,
    accountType: data.kmutnb_account_type ?? null,
    prefix: personnel?.full_prefix_name_th ?? null,
    firstname: personnel?.firstname_th ?? data.given_name ?? null,
    surname: personnel?.lastname_th ?? data.family_name ?? null,
    department: personnel?.department_name ?? null,
    facultyCode: personnel?.faculty_code ?? null,
    departmentCode: personnel?.department_code ?? null,
  }
}

// Handle SSO callback — exchange code, get user info, upsert user
export async function handleSSOCallback(code: string) {
  const tokenData = await getSSOToken(code)
  const userInfoData = await getUserInfoFromSSO(tokenData.access_token)
  const info = normalizeSSOUserInfo(userInfoData)

  if (!info.pid) throw new Error('SSO profile is missing pid')

  const fullName = `${info.prefix ?? ''}${info.firstname ?? ''} ${info.surname ?? ''}`.trim()

  // Upsert user by ssoId (pid)
  const [existingUser] = await db.select().from(users).where(eq(users.ssoId, info.pid)).limit(1)

  if (existingUser) {
    await db.update(users)
      .set({
        email: info.email ?? existingUser.email,
        fullName: fullName || existingUser.fullName,
        department: info.department ?? existingUser.department,
      })
      .where(eq(users.id, existingUser.id))
    return existingUser.id
  }

  // Create new user
  const result = await db.insert(users).values({
    ssoId: info.pid,
    username: info.username ?? info.pid,
    email: info.email ?? '',
    fullName: fullName || info.pid,
    department: info.department,
    role: 'employee',
    provider: 'organization',
  })

  return Number(result[0].insertId)
}
