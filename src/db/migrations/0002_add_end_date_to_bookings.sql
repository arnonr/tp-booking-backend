-- Add end_date column to support multi-day bookings.
-- Semantics: booking spans [booking_date .. end_date], daily [start_time..end_time].
ALTER TABLE `bookings` ADD COLUMN `end_date` date NULL AFTER `booking_date`;

-- Backfill existing rows: single-day bookings → end_date = booking_date.
UPDATE `bookings` SET `end_date` = `booking_date` WHERE `end_date` IS NULL;

ALTER TABLE `bookings` MODIFY COLUMN `end_date` date NOT NULL;

-- Helpful index for date-range conflict queries.
CREATE INDEX `bookings_room_date_range_idx` ON `bookings` (`room_id`, `booking_date`, `end_date`);
