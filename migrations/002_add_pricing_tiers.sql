-- Migration: Add pricing tiers support for hotel categories and flight inclusion
-- Date: 2024-01-15

-- Add pricing tiers column to tour_packages table
ALTER TABLE tour_packages 
ADD COLUMN pricing_tiers JSONB DEFAULT '{"3_star": {"with_flights": {"price": "0"}, "without_flights": {"price": "0"}}, "4_5_star": {"with_flights": {"price": "0"}, "without_flights": {"price": "0"}}}';

-- Add hotel category and flight inclusion columns to bookings table
ALTER TABLE bookings 
ADD COLUMN hotel_category TEXT NOT NULL DEFAULT '3_star';

ALTER TABLE bookings 
ADD COLUMN flight_included BOOLEAN NOT NULL DEFAULT false;

-- Update existing records to have default pricing tiers based on current startingPrice
UPDATE tour_packages 
SET pricing_tiers = jsonb_build_object(
  '3_star', jsonb_build_object(
    'with_flights', jsonb_build_object('price', starting_price::text),
    'without_flights', jsonb_build_object('price', (starting_price * 0.85)::text)
  ),
  '4_5_star', jsonb_build_object(
    'with_flights', jsonb_build_object('price', (starting_price * 1.3)::text),
    'without_flights', jsonb_build_object('price', (starting_price * 1.15)::text)
  )
)
WHERE pricing_tiers IS NULL OR pricing_tiers = '{"3_star": {"with_flights": {"price": "0"}, "without_flights": {"price": "0"}}, "4_5_star": {"with_flights": {"price": "0"}, "without_flights": {"price": "0"}}}'::jsonb;

-- Add strikethrough prices where they exist
UPDATE tour_packages 
SET pricing_tiers = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        pricing_tiers,
        '{3_star,with_flights,strikethrough_price}',
        to_jsonb(strike_through_price::text)
      ),
      '{3_star,without_flights,strikethrough_price}',
      to_jsonb((strike_through_price * 0.85)::text)
    ),
    '{4_5_star,with_flights,strikethrough_price}',
    to_jsonb((strike_through_price * 1.3)::text)
  ),
  '{4_5_star,without_flights,strikethrough_price}',
  to_jsonb((strike_through_price * 1.15)::text)
)
WHERE strike_through_price IS NOT NULL; 