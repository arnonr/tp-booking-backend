import { db } from './src/db/connection.ts';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    await db.execute(sql`ALTER TABLE \`bookings\` ADD COLUMN \`end_date\` date NULL AFTER \`booking_date\``);
    console.log('Added end_date column');
    
    await db.execute(sql`UPDATE \`bookings\` SET \`end_date\` = \`booking_date\` WHERE \`end_date\` IS NULL`);
    console.log('Backfilled end_date colmun');
    
    await db.execute(sql`ALTER TABLE \`bookings\` MODIFY COLUMN \`end_date\` date NOT NULL`);
    console.log('Set end_date to NOT NULL');
    
    await db.execute(sql`CREATE INDEX \`bookings_room_date_range_idx\` ON \`bookings\` (\`room_id\`, \`booking_date\`, \`end_date\`)`);
    console.log('Created index');
  } catch (err: any) {
    if (err.message?.includes('Duplicate column name')) {
      console.log('Column already exists!');
    } else {
      console.error(err);
    }
  }
  process.exit(0);
}
migrate();
