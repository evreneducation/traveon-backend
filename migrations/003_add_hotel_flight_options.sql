-- Migration: Add hotel category and flight inclusion options to bookings table
-- This migration adds the hotel_category and flight_included fields to the bookings table

-- Add hotel_category column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'hotel_category') THEN
        ALTER TABLE bookings ADD COLUMN hotel_category TEXT NOT NULL DEFAULT '3_star';
    END IF;
END $$;

-- Add flight_included column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'flight_included') THEN
        ALTER TABLE bookings ADD COLUMN flight_included BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add comments to the columns
COMMENT ON COLUMN bookings.hotel_category IS 'Hotel category selection: 3_star or 4_5_star';
COMMENT ON COLUMN bookings.flight_included IS 'Whether flights are included in the package'; 