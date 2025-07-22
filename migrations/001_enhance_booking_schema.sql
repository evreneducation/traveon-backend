-- Migration: Enhance booking schema for detailed traveler information
-- Created: 2024

-- First, let's backup existing data
-- Create a temporary table to store existing booking data
CREATE TABLE IF NOT EXISTS bookings_backup AS 
SELECT * FROM bookings;

-- Drop and recreate bookings table with new schema
DROP TABLE IF EXISTS bookings CASCADE;

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  package_id INTEGER REFERENCES tour_packages(id),
  event_id INTEGER REFERENCES events(id),
  travel_date TIMESTAMP,
  adults INTEGER NOT NULL,
  children INTEGER NOT NULL DEFAULT 0,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed
  payment_id TEXT, -- Razorpay payment ID
  order_id TEXT, -- Razorpay order ID
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create travelers table for individual traveler details
CREATE TABLE travelers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'adult' or 'child'
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT, -- 'male', 'female', 'other'
  nationality TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  dietary_requirements TEXT,
  medical_conditions TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Migrate existing data from backup (if any exists)
-- This is a simplified migration - in production you'd want more sophisticated mapping
INSERT INTO bookings (
  id, user_id, package_id, event_id, travel_date, adults, children,
  contact_name, contact_email, contact_phone, total_amount, currency,
  status, payment_status, payment_id, order_id, special_requests,
  created_at, updated_at
)
SELECT 
  id, user_id, package_id, event_id, 
  check_in_date, -- Map old check_in_date to travel_date
  COALESCE(guest_count, 1), -- Map guest_count to adults, default to 1
  0, -- Default children to 0
  guest_name, guest_email, guest_phone, -- Map old guest fields to contact fields
  total_amount, currency, status, payment_status, payment_id, order_id,
  special_requests, created_at, updated_at
FROM bookings_backup
WHERE EXISTS (SELECT 1 FROM bookings_backup);

-- Create basic traveler records for existing bookings (if any)
-- This creates one adult traveler per existing booking
INSERT INTO travelers (
  booking_id, type, first_name, last_name, date_of_birth
)
SELECT 
  id, 'adult',
  SPLIT_PART(guest_name, ' ', 1), -- First name
  CASE 
    WHEN POSITION(' ' IN guest_name) > 0 
    THEN SUBSTRING(guest_name FROM POSITION(' ' IN guest_name) + 1)
    ELSE ''
  END, -- Last name
  NULL -- No date of birth available
FROM bookings_backup
WHERE guest_name IS NOT NULL AND guest_name != ''
AND EXISTS (SELECT 1 FROM bookings_backup);

-- Create indexes for better performance
CREATE INDEX idx_travelers_booking_id ON travelers(booking_id);
CREATE INDEX idx_travelers_type ON travelers(type);
CREATE INDEX idx_bookings_travel_date ON bookings(travel_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Clean up backup table (optional - keep it for safety during transition)
-- DROP TABLE bookings_backup;

-- Update sequence for bookings table
SELECT setval('bookings_id_seq', COALESCE((SELECT MAX(id) FROM bookings), 1), true);

-- Add comments for documentation
COMMENT ON TABLE bookings IS 'Enhanced bookings table with detailed contact information';
COMMENT ON TABLE travelers IS 'Individual traveler information for each booking';
COMMENT ON COLUMN travelers.type IS 'Type of traveler: adult or child';
COMMENT ON COLUMN travelers.date_of_birth IS 'Used for age verification and special requirements';
COMMENT ON COLUMN travelers.dietary_requirements IS 'Dietary restrictions, allergies, preferences';
COMMENT ON COLUMN travelers.medical_conditions IS 'Medical conditions or mobility requirements'; 