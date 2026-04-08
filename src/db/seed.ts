import { db } from './connection'
import { users, amenities, rooms, equipment } from './schema'

async function seed() {
  console.log('Seeding database...')

  // Admin user (SSO upsert will handle real users; this is fallback)
  const existingAdmin = await db.select().from(users).limit(1)
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      ssoId: 'admin-local',
      username: 'admin',
      email: 'admin@company.com',
      fullName: 'System Admin',
      role: 'admin',
      provider: 'organization',
    })
    console.log('  ✓ Admin user created')
  }

  // Amenities
  const amenityRows = await db.select().from(amenities).limit(1)
  if (amenityRows.length === 0) {
    await db.insert(amenities).values([
      { name: 'โปรเจกเตอร์', icon: 'projector' },
      { name: 'ไมโครโฟน', icon: 'mic' },
      { name: 'Whiteboard', icon: 'whiteboard' },
      { name: 'จอ TV', icon: 'tv' },
      { name: 'ระบบ Video Conference', icon: 'video' },
      { name: 'เครื่องเสียง', icon: 'speaker' },
      { name: 'WiFi', icon: 'wifi' },
    ])
    console.log('  ✓ Amenities seeded')
  }

  // Sample rooms
  const roomRows = await db.select().from(rooms).limit(1)
  if (roomRows.length === 0) {
    await db.insert(rooms).values([
      { name: 'ห้องประชุม A101', building: 'อาคาร A', floor: 'ชั้น 1', capacity: 10, description: 'ห้องประชุมขนาดเล็ก เหมาะสำหรับประชุมทีม' },
      { name: 'ห้องประชุม B201', building: 'อาคาร B', floor: 'ชั้น 2', capacity: 30, description: 'ห้องประชุมขนาดกลาง มีระบบ Video Conference' },
      { name: 'ห้องอบรม C301', building: 'อาคาร C', floor: 'ชั้น 3', capacity: 80, description: 'ห้องอบรมขนาดใหญ่ รองรับงานสัมมนา' },
    ])
    console.log('  ✓ Rooms seeded')
  }

  // Equipment
  const equipRows = await db.select().from(equipment).limit(1)
  if (equipRows.length === 0) {
    await db.insert(equipment).values([
      { name: 'ไมค์ไร้สาย', totalQty: 5, description: 'ไมค์ไร้สาย Shure' },
      { name: 'Laser Pointer', totalQty: 3, description: 'ตัวชี้เลเซอร์สำหรับนำเสนอ' },
      { name: 'กล้อง Webcam HD', totalQty: 2, description: 'กล้อง Webcam สำหรับ Video Conference' },
    ])
    console.log('  ✓ Equipment seeded')
  }

  console.log('Seeding complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
