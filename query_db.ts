import { db } from './src/db/connection';
import { bookings } from './src/db/schema';
async function run() {
  const data = await db.select().from(bookings).limit(5);
  console.log(data.map(d => ({ rawDate: d.bookingDate, type: typeof d.bookingDate, iso: d.bookingDate instanceof Date ? d.bookingDate.toISOString() : null })));
  process.exit(0);
}
run();
