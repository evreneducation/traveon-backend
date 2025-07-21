-- Migration: Comprehensive fix for booking schema data types
-- This migration handles all possible text types and provides better error handling

-- First, let's see what we're working with
-- Check current column types
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

-- Convert adults column from any text type to integer
DO $$ 
BEGIN
    -- Check if adults column exists and is a text type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'adults' 
               AND data_type IN ('character varying', 'text', 'character')) THEN
        
        -- First, ensure all values are valid integers
        UPDATE bookings 
        SET adults = CASE 
            WHEN adults ~ '^[0-9]+$' THEN adults 
            ELSE '1' 
        END 
        WHERE adults IS NOT NULL;
        
        -- Then convert the column type
        ALTER TABLE bookings ALTER COLUMN adults TYPE integer USING adults::integer;
        
        -- Set NOT NULL constraint if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'adults' 
                       AND is_nullable = 'NO') THEN
            ALTER TABLE bookings ALTER COLUMN adults SET NOT NULL;
        END IF;
        
        -- Set default if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'adults' 
                       AND column_default IS NOT NULL) THEN
            ALTER TABLE bookings ALTER COLUMN adults SET DEFAULT 1;
        END IF;
    END IF;
END $$;

-- Convert children column from any text type to integer
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'children' 
               AND data_type IN ('character varying', 'text', 'character')) THEN
        
        -- First, ensure all values are valid integers
        UPDATE bookings 
        SET children = CASE 
            WHEN children ~ '^[0-9]+$' THEN children 
            ELSE '0' 
        END 
        WHERE children IS NOT NULL;
        
        -- Then convert the column type
        ALTER TABLE bookings ALTER COLUMN children TYPE integer USING children::integer;
        
        -- Set NOT NULL constraint if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'children' 
                       AND is_nullable = 'NO') THEN
            ALTER TABLE bookings ALTER COLUMN children SET NOT NULL;
        END IF;
        
        -- Set default if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'children' 
                       AND column_default IS NOT NULL) THEN
            ALTER TABLE bookings ALTER COLUMN children SET DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Convert total_amount column from any text type to numeric
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'total_amount' 
               AND data_type IN ('character varying', 'text', 'character')) THEN
        
        -- First, ensure all values are valid numbers
        UPDATE bookings 
        SET total_amount = CASE 
            WHEN total_amount ~ '^[0-9]+(\.[0-9]+)?$' THEN total_amount 
            ELSE '0.00' 
        END 
        WHERE total_amount IS NOT NULL;
        
        -- Then convert the column type
        ALTER TABLE bookings ALTER COLUMN total_amount TYPE numeric(10,2) USING total_amount::numeric(10,2);
    END IF;
END $$;

-- Handle column renames
DO $$ 
BEGIN
    -- Rename check_in_date to travel_date if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'check_in_date') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'travel_date') THEN
        ALTER TABLE bookings RENAME COLUMN check_in_date TO travel_date;
    END IF;
    
    -- Rename guest_name to contact_name if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'guest_name') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'contact_name') THEN
        ALTER TABLE bookings RENAME COLUMN guest_name TO contact_name;
    END IF;
    
    -- Rename guest_email to contact_email if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'guest_email') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'contact_email') THEN
        ALTER TABLE bookings RENAME COLUMN guest_email TO contact_email;
    END IF;
    
    -- Rename guest_phone to contact_phone if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'guest_phone') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'contact_phone') THEN
        ALTER TABLE bookings RENAME COLUMN guest_phone TO contact_phone;
    END IF;
    
    -- Rename guest_count to adults if it exists and adults doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'guest_count') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'bookings' AND column_name = 'adults') THEN
        ALTER TABLE bookings RENAME COLUMN guest_count TO adults;
    END IF;
END $$;

-- Add missing columns
DO $$ 
BEGIN
    -- Add adults column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'adults') THEN
        ALTER TABLE bookings ADD COLUMN adults integer NOT NULL DEFAULT 1;
    END IF;
    
    -- Add children column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'children') THEN
        ALTER TABLE bookings ADD COLUMN children integer NOT NULL DEFAULT 0;
    END IF;
    
    -- Add travel_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'travel_date') THEN
        ALTER TABLE bookings ADD COLUMN travel_date timestamp;
    END IF;
    
    -- Add contact_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'contact_name') THEN
        ALTER TABLE bookings ADD COLUMN contact_name text;
    END IF;
    
    -- Add contact_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'contact_email') THEN
        ALTER TABLE bookings ADD COLUMN contact_email text;
    END IF;
    
    -- Add contact_phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'contact_phone') THEN
        ALTER TABLE bookings ADD COLUMN contact_phone text;
    END IF;
    
    -- Add hotel_category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'hotel_category') THEN
        ALTER TABLE bookings ADD COLUMN hotel_category text NOT NULL DEFAULT '3_star';
    END IF;
    
    -- Add flight_included column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'flight_included') THEN
        ALTER TABLE bookings ADD COLUMN flight_included boolean NOT NULL DEFAULT false;
    END IF;
    
    -- Add total_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'total_amount') THEN
        ALTER TABLE bookings ADD COLUMN total_amount numeric(10,2);
    END IF;
    
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'currency') THEN
        ALTER TABLE bookings ADD COLUMN currency text NOT NULL DEFAULT 'INR';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'status') THEN
        ALTER TABLE bookings ADD COLUMN status text NOT NULL DEFAULT 'pending';
    END IF;
    
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE bookings ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
    END IF;
    
    -- Add special_requests column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'special_requests') THEN
        ALTER TABLE bookings ADD COLUMN special_requests text;
    END IF;
END $$;

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position; 