import { getSSORedirectUrl } from './src/modules/auth/auth.service'
try {
  console.log('URL:', getSSORedirectUrl())
} catch (e) {
  console.error('Error:', e)
}
