-- Migration: Add CRM tables
-- This migration adds comprehensive CRM functionality to the travel application

-- CRM: Customer profiles table
CREATE TABLE IF NOT EXISTS "customers" (
  "id" serial PRIMARY KEY,
  "user_id" varchar REFERENCES "users"("id"),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "phone" text,
  "date_of_birth" timestamp,
  "nationality" text,
  "preferred_language" text DEFAULT 'en',
  "address" jsonb,
  "source" text DEFAULT 'website',
  "status" text NOT NULL DEFAULT 'active',
  "customer_type" text NOT NULL DEFAULT 'individual',
  "total_spent" numeric(10,2) DEFAULT '0',
  "last_booking_date" timestamp,
  "notes" text,
  "tags" jsonb DEFAULT '[]',
  "assigned_to" varchar REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Leads table
CREATE TABLE IF NOT EXISTS "leads" (
  "id" serial PRIMARY KEY,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "company" text,
  "source" text NOT NULL DEFAULT 'website',
  "status" text NOT NULL DEFAULT 'new',
  "priority" text NOT NULL DEFAULT 'normal',
  "budget" numeric(10,2),
  "destination" text,
  "travel_date" timestamp,
  "group_size" integer,
  "requirements" text,
  "notes" text,
  "assigned_to" varchar REFERENCES "users"("id"),
  "next_follow_up" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Lead activities table
CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" serial PRIMARY KEY,
  "lead_id" integer NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "subject" text NOT NULL,
  "description" text,
  "outcome" text,
  "next_action" text,
  "scheduled_date" timestamp,
  "completed_date" timestamp,
  "created_by" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Sales opportunities table
CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" serial PRIMARY KEY,
  "lead_id" integer REFERENCES "leads"("id"),
  "customer_id" integer REFERENCES "customers"("id"),
  "title" text NOT NULL,
  "description" text,
  "stage" text NOT NULL DEFAULT 'prospecting',
  "probability" integer NOT NULL DEFAULT 0,
  "expected_value" numeric(10,2),
  "expected_close_date" timestamp,
  "actual_close_date" timestamp,
  "package_id" integer REFERENCES "tour_packages"("id"),
  "event_id" integer REFERENCES "events"("id"),
  "assigned_to" varchar REFERENCES "users"("id"),
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Customer interactions table
CREATE TABLE IF NOT EXISTS "customer_interactions" (
  "id" serial PRIMARY KEY,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "subject" text NOT NULL,
  "description" text,
  "outcome" text,
  "duration" integer,
  "booking_id" integer REFERENCES "bookings"("id"),
  "created_by" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Email templates table
CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "category" text NOT NULL DEFAULT 'general',
  "variables" jsonb DEFAULT '[]',
  "active" boolean DEFAULT true,
  "created_by" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Email campaigns table
CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "template_id" integer REFERENCES "email_templates"("id"),
  "status" text NOT NULL DEFAULT 'draft',
  "scheduled_at" timestamp,
  "sent_at" timestamp,
  "target_audience" jsonb,
  "sent_count" integer DEFAULT 0,
  "opened_count" integer DEFAULT 0,
  "clicked_count" integer DEFAULT 0,
  "created_by" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text,
  "type" text NOT NULL DEFAULT 'general',
  "priority" text NOT NULL DEFAULT 'normal',
  "status" text NOT NULL DEFAULT 'pending',
  "due_date" timestamp,
  "completed_date" timestamp,
  "assigned_to" varchar REFERENCES "users"("id"),
  "created_by" varchar NOT NULL REFERENCES "users"("id"),
  "related_to" text,
  "related_id" integer,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- CRM: Customer preferences table
CREATE TABLE IF NOT EXISTS "customer_preferences" (
  "id" serial PRIMARY KEY,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "category" text NOT NULL,
  "preferences" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_customers_email" ON "customers"("email");
CREATE INDEX IF NOT EXISTS "idx_customers_assigned_to" ON "customers"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_customers_status" ON "customers"("status");
CREATE INDEX IF NOT EXISTS "idx_customers_customer_type" ON "customers"("customer_type");

CREATE INDEX IF NOT EXISTS "idx_leads_email" ON "leads"("email");
CREATE INDEX IF NOT EXISTS "idx_leads_status" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "idx_leads_priority" ON "leads"("priority");
CREATE INDEX IF NOT EXISTS "idx_leads_assigned_to" ON "leads"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_leads_next_follow_up" ON "leads"("next_follow_up");

CREATE INDEX IF NOT EXISTS "idx_lead_activities_lead_id" ON "lead_activities"("lead_id");
CREATE INDEX IF NOT EXISTS "idx_lead_activities_type" ON "lead_activities"("type");
CREATE INDEX IF NOT EXISTS "idx_lead_activities_created_by" ON "lead_activities"("created_by");

CREATE INDEX IF NOT EXISTS "idx_opportunities_stage" ON "opportunities"("stage");
CREATE INDEX IF NOT EXISTS "idx_opportunities_assigned_to" ON "opportunities"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_opportunities_expected_close_date" ON "opportunities"("expected_close_date");

CREATE INDEX IF NOT EXISTS "idx_customer_interactions_customer_id" ON "customer_interactions"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_customer_interactions_type" ON "customer_interactions"("type");
CREATE INDEX IF NOT EXISTS "idx_customer_interactions_created_by" ON "customer_interactions"("created_by");

CREATE INDEX IF NOT EXISTS "idx_email_templates_category" ON "email_templates"("category");
CREATE INDEX IF NOT EXISTS "idx_email_templates_active" ON "email_templates"("active");

CREATE INDEX IF NOT EXISTS "idx_email_campaigns_status" ON "email_campaigns"("status");
CREATE INDEX IF NOT EXISTS "idx_email_campaigns_scheduled_at" ON "email_campaigns"("scheduled_at");

CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks"("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_priority" ON "tasks"("priority");
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_to" ON "tasks"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks"("due_date");

CREATE INDEX IF NOT EXISTS "idx_customer_preferences_customer_id" ON "customer_preferences"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_customer_preferences_category" ON "customer_preferences"("category");

-- Insert some default email templates
INSERT INTO "email_templates" ("name", "subject", "body", "category", "variables", "created_by") VALUES
(
  'Welcome Email',
  'Welcome to Traveon - Your Journey Begins Here!',
  'Dear {{name}},\n\nWelcome to Traveon! We''re excited to have you as part of our travel community.\n\nAt Traveon, we specialize in creating unforgettable travel experiences. Whether you''re looking for adventure, relaxation, or cultural immersion, we have the perfect package for you.\n\nHere are some ways to get started:\n- Browse our featured packages\n- Check out upcoming events\n- Contact our travel experts\n\nIf you have any questions, feel free to reach out to us.\n\nHappy travels!\nThe Traveon Team',
  'general',
  '["name"]',
  (SELECT "id" FROM "users" WHERE "role" = 'admin' LIMIT 1)
),
(
  'Booking Confirmation',
  'Your Booking Confirmation - {{package_name}}',
  'Dear {{name}},\n\nThank you for choosing Traveon! Your booking has been confirmed.\n\nBooking Details:\n- Booking ID: {{booking_id}}\n- Package: {{package_name}}\n- Travel Date: {{travel_date}}\n- Total Amount: {{total_amount}}\n\nWe''ll send you detailed itinerary and travel documents closer to your departure date.\n\nIf you have any questions, please don''t hesitate to contact us.\n\nSafe travels!\nThe Traveon Team',
  'booking',
  '["name", "booking_id", "package_name", "travel_date", "total_amount"]',
  (SELECT "id" FROM "users" WHERE "role" = 'admin' LIMIT 1)
),
(
  'Follow-up Email',
  'How was your trip with Traveon?',
  'Dear {{name}},\n\nWe hope you had an amazing time on your recent trip with Traveon!\n\nWe''d love to hear about your experience. Your feedback helps us improve our services and helps other travelers make informed decisions.\n\nPlease take a moment to share your thoughts by leaving a review.\n\nWe look forward to planning your next adventure!\n\nBest regards,\nThe Traveon Team',
  'follow_up',
  '["name"]',
  (SELECT "id" FROM "users" WHERE "role" = 'admin' LIMIT 1)
),
(
  'Special Offer',
  'Exclusive Offer Just for You - {{discount}}% Off!',
  'Dear {{name}},\n\nAs a valued Traveon customer, we''re excited to offer you an exclusive discount!\n\n{{offer_description}}\n\nThis offer is valid until {{expiry_date}}.\n\nBook now and save {{discount}}% on your next adventure!\n\nBest regards,\nThe Traveon Team',
  'marketing',
  '["name", "discount", "offer_description", "expiry_date"]',
  (SELECT "id" FROM "users" WHERE "role" = 'admin' LIMIT 1)
); 