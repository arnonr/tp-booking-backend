CREATE TABLE `amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`icon` varchar(50),
	CONSTRAINT `amenities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`old_values` json,
	`new_values` json,
	`ip_address` varchar(45),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`equipment_id` int NOT NULL,
	`quantity` int DEFAULT 1,
	CONSTRAINT `booking_equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `booking_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`room_id` int NOT NULL,
	`booking_date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`purpose` varchar(500) NOT NULL,
	`attendee_count` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled','completed') DEFAULT 'pending',
	`admin_remark` text,
	`approved_by` int,
	`approved_at` timestamp,
	`checked_in` boolean DEFAULT false,
	`checked_in_at` timestamp,
	`recurring_group_id` varchar(36),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`total_qty` int DEFAULT 1,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `external_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`full_name` varchar(200) NOT NULL,
	`organization` varchar(200),
	`phone` varchar(20) NOT NULL,
	`email` varchar(200),
	`room_id` int,
	`preferred_date` date,
	`preferred_start` time,
	`preferred_end` time,
	`purpose` text NOT NULL,
	`ref_code` varchar(20) NOT NULL,
	`status` enum('new','contacted','confirmed','declined') DEFAULT 'new',
	`admin_note` text,
	`handled_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `external_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `external_requests_ref_code_unique` UNIQUE(`ref_code`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`user_id` int NOT NULL,
	`rating` tinyint NOT NULL,
	`comment` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_booking_id_unique` UNIQUE(`booking_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`booking_id` int,
	`type` enum('booking_approved','booking_rejected','new_booking_request','new_external_request','booking_reminder','booking_cancelled','no_show_warning') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`amenity_id` int NOT NULL,
	CONSTRAINT `room_amenities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`image_url` varchar(500) NOT NULL,
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `room_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`building` varchar(100),
	`floor` varchar(20),
	`capacity` int NOT NULL,
	`description` text,
	`status` enum('active','maintenance','inactive') DEFAULT 'active',
	`open_time` time DEFAULT '08:00:00',
	`close_time` time DEFAULT '17:00:00',
	`slot_duration_min` int DEFAULT 60,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `time_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`day_of_week` enum('mon','tue','wed','thu','fri','sat','sun') NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`is_available` boolean DEFAULT true,
	CONSTRAINT `time_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sso_id` varchar(255) NOT NULL,
	`provider` varchar(50) NOT NULL DEFAULT 'organization',
	`username` varchar(50) NOT NULL,
	`email` varchar(200) NOT NULL,
	`full_name` varchar(200) NOT NULL,
	`department` varchar(100),
	`phone` varchar(20),
	`role` enum('admin','employee') DEFAULT 'employee',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_sso_id_unique` UNIQUE(`sso_id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
