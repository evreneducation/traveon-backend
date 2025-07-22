-- Migration: Add children pricing to existing pricing tiers
-- This migration updates existing pricing tiers to include children pricing

-- For now, we'll manually update packages or let the application handle children pricing
-- The application will automatically calculate children pricing as 70% of adult price
-- when children_price is not available in the pricing tiers

-- This migration is a placeholder - the actual children pricing will be handled
-- by the application logic in the calculatePackagePrice function

-- If you need to manually update specific packages, you can run SQL like:
/*
UPDATE tour_packages 
SET pricing_tiers = '{
  "3_star": {
    "with_flights": {
      "price": "50000",
      "strikethrough_price": "60000",
      "children_price": "35000",
      "children_strikethrough_price": "42000"
    },
    "without_flights": {
      "price": "40000",
      "strikethrough_price": "50000", 
      "children_price": "28000",
      "children_strikethrough_price": "35000"
    }
  },
  "4_5_star": {
    "with_flights": {
      "price": "70000",
      "strikethrough_price": "80000",
      "children_price": "49000", 
      "children_strikethrough_price": "56000"
    },
    "without_flights": {
      "price": "60000",
      "strikethrough_price": "70000",
      "children_price": "42000",
      "children_strikethrough_price": "49000"
    }
  }
}'::json
WHERE id = 1;
*/ 