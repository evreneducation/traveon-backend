import { pgTable, text, serial, integer, boolean, timestamp, json, numeric, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  password: varchar("password"), // <-- Add this line
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  nationality: varchar("nationality"),
  preferredLanguage: varchar("preferred_language").default("en"),
  role: varchar("role").notNull().default("user"), // user, admin
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tour packages table
export const tourPackages = pgTable("tour_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  productName: text("product_name").notNull(),
  description: text("description"),
  overview: text("overview"),
  destination: text("destination").notNull(),
  durationType: text("duration_type").notNull().default("days_and_nights"),
  durationDays: integer("duration_days").notNull(),
  durationNights: integer("duration_nights").notNull(),
  durationHours: integer("duration_hours").default(0),
  durationMinutes: integer("duration_minutes").default(0),
  inventoryType: text("inventory_type").notNull().default("pax"),
  hasTimeSlots: boolean("has_time_slots").default(false),
  bookingType: text("booking_type").notNull().default("private"),
  minPassengerCount: integer("min_passenger_count").default(1),
  maxPassengerCount: integer("max_passenger_count"),
  startingPrice: numeric("starting_price", { precision: 10, scale: 2 }).notNull(),
  strikeThroughPrice: numeric("strike_through_price", { precision: 10, scale: 2 }),
  // New pricing structure for hotel categories and flight inclusion with children pricing
  pricingTiers: json("pricing_tiers").$type<{
    "3_star": {
      with_flights: { 
        price: string; 
        strikethrough_price?: string;
        children_price?: string;
        children_strikethrough_price?: string;
      };
      without_flights: { 
        price: string; 
        strikethrough_price?: string;
        children_price?: string;
        children_strikethrough_price?: string;
      };
    };
    "4_5_star": {
      with_flights: { 
        price: string; 
        strikethrough_price?: string;
        children_price?: string;
        children_strikethrough_price?: string;
      };
      without_flights: { 
        price: string; 
        strikethrough_price?: string;
        children_price?: string;
        children_strikethrough_price?: string;
      };
    };
  }>().default({
    "3_star": {
      with_flights: { price: "0", children_price: "0" },
      without_flights: { price: "0", children_price: "0" }
    },
    "4_5_star": {
      with_flights: { price: "0", children_price: "0" },
      without_flights: { price: "0", children_price: "0" }
    }
  }),
  leastPricedInventory: text("least_priced_inventory"),
  currency: text("currency").notNull().default("INR"),
  termsAndConditions: text("terms_and_conditions"),
  inclusions: json("inclusions").$type<Array<{ name: string; description?: string }>>().default([]),
  exclusions: json("exclusions").$type<Array<{ name: string; description?: string }>>().default([]),
  customHighlights: json("custom_highlights").$type<Array<string>>().default([]),
  galleryImages: json("gallery_images").$type<Array<{ url: string; alt: string }>>().default([]),
  itinerary: json("itinerary").$type<Array<{
    day: number;
    title: string;
    description?: string;
    activities: string[];
    meals?: string[];
    accommodation?: string;
  }>>().default([]),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0.0"),
  reviewCount: integer("review_count").default(0),
  featured: boolean("featured").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table - simplified
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  startDate: text("event_date").notNull(),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table with enhanced features
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  packageId: integer("package_id").references(() => tourPackages.id),
  eventId: integer("event_id").references(() => events.id),
  travelDate: timestamp("travel_date"),
  adults: integer("adults").notNull(),
  children: integer("children").notNull().default(0),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  // Selected pricing options
  hotelCategory: text("hotel_category").notNull().default("3_star"), // "3_star" or "4_5_star"
  flightIncluded: boolean("flight_included").notNull().default(false),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed
  paymentId: text("payment_id"), // Razorpay payment ID
  orderId: text("order_id"), // Razorpay order ID
  specialRequests: text("special_requests"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual traveler details table
export const travelers = pgTable("travelers", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'adult' or 'child'
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"), // 'male', 'female', 'other'
  nationality: text("nationality"),
  passportNumber: text("passport_number"),
  passportExpiry: timestamp("passport_expiry"),
  dietaryRequirements: text("dietary_requirements"),
  medicalConditions: text("medical_conditions"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  specialRequests: text("special_requests"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews and ratings table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageId: integer("package_id").references(() => tourPackages.id),
  eventId: integer("event_id").references(() => events.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  rating: integer("rating").notNull(), // 1-5 stars
  title: text("title"),
  comment: text("comment"),
  images: json("images").$type<Array<string>>().default([]),
  helpful: integer("helpful").default(0),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table for Razorpay integration
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  razorpayOrderId: text("razorpay_order_id").notNull(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("created"), // created, attempted, paid, failed
  method: text("method"), // card, netbanking, wallet, upi
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Availability tracking for real-time booking
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => tourPackages.id),
  eventId: integer("event_id").references(() => events.id),
  date: timestamp("date").notNull(),
  totalSlots: integer("total_slots").notNull(),
  bookedSlots: integer("booked_slots").default(0),
  price: numeric("price", { precision: 10, scale: 2 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multi-language content
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // package, event
  entityId: integer("entity_id").notNull(),
  language: text("language").notNull().default("en"),
  fieldName: text("field_name").notNull(), // name, description, overview
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Newsletter subscriptions
export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribed: boolean("subscribed").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact queries table
export const contactQueries = pgTable("contact_queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, resolved, closed
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  assignedTo: varchar("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Customer profiles table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  nationality: text("nationality"),
  preferredLanguage: text("preferred_language").default("en"),
  address: json("address").$type<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }>(),
  source: text("source").default("website"), // website, referral, social_media, etc.
  status: text("status").notNull().default("active"), // active, inactive, blocked
  customerType: text("customer_type").notNull().default("individual"), // individual, corporate, vip
  totalSpent: numeric("total_spent", { precision: 10, scale: 2 }).default("0"),
  lastBookingDate: timestamp("last_booking_date"),
  notes: text("notes"),
  tags: json("tags").$type<string[]>().default([]),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  source: text("source").notNull().default("website"), // website, referral, social_media, cold_call
  status: text("status").notNull().default("new"), // new, contacted, qualified, proposal, won, lost
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  budget: numeric("budget", { precision: 10, scale: 2 }),
  destination: text("destination"),
  travelDate: timestamp("travel_date"),
  groupSize: integer("group_size"),
  requirements: text("requirements"),
  notes: text("notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  nextFollowUp: timestamp("next_follow_up"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Lead activities table
export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // call, email, meeting, note, task
  subject: text("subject").notNull(),
  description: text("description"),
  outcome: text("outcome"), // positive, negative, neutral
  nextAction: text("next_action"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Sales opportunities table
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  customerId: integer("customer_id").references(() => customers.id),
  title: text("title").notNull(),
  description: text("description"),
  stage: text("stage").notNull().default("prospecting"), // prospecting, qualification, proposal, negotiation, closed_won, closed_lost
  probability: integer("probability").notNull().default(0), // 0-100
  expectedValue: numeric("expected_value", { precision: 10, scale: 2 }),
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  packageId: integer("package_id").references(() => tourPackages.id),
  eventId: integer("event_id").references(() => events.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Customer interactions table
export const customerInteractions = pgTable("customer_interactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // call, email, chat, meeting, booking, review
  subject: text("subject").notNull(),
  description: text("description"),
  outcome: text("outcome"), // positive, negative, neutral
  duration: integer("duration"), // in minutes
  bookingId: integer("booking_id").references(() => bookings.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"), // general, booking, follow_up, marketing
  variables: json("variables").$type<string[]>().default([]), // {{name}}, {{booking_id}}, etc.
  active: boolean("active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Email campaigns table
export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  templateId: integer("template_id").references(() => emailTemplates.id),
  status: text("status").notNull().default("draft"), // draft, scheduled, sent, paused, cancelled
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  targetAudience: json("target_audience").$type<{
    customerTypes?: string[];
    tags?: string[];
    lastBookingDate?: string; // "30d", "90d", "1y"
    totalSpent?: { min?: number; max?: number };
  }>(),
  sentCount: integer("sent_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("general"), // general, follow_up, call, email, meeting
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  relatedTo: text("related_to"), // customer_id, lead_id, opportunity_id, booking_id
  relatedId: integer("related_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM: Customer preferences table
export const customerPreferences = pgTable("customer_preferences", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // destinations, activities, accommodation, dining, budget
  preferences: json("preferences").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
  customers: many(customers),
  leads: many(leads),
  opportunities: many(opportunities),
  tasks: many(tasks),
  emailTemplates: many(emailTemplates),
  emailCampaigns: many(emailCampaigns),
}));

export const tourPackagesRelations = relations(tourPackages, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
  availability: many(availability),
  translations: many(translations),
  opportunities: many(opportunities),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
  availability: many(availability),
  translations: many(translations),
  opportunities: many(opportunities),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  package: one(tourPackages, {
    fields: [bookings.packageId],
    references: [tourPackages.id],
  }),
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
  travelers: many(travelers),
  customerInteractions: many(customerInteractions),
}));

export const travelersRelations = relations(travelers, ({ one }) => ({
  booking: one(bookings, {
    fields: [travelers.bookingId],
    references: [bookings.id],
  }),
}));

export const contactQueriesRelations = relations(contactQueries, ({ one }) => ({
  assignedTo: one(users, {
    fields: [contactQueries.assignedTo],
    references: [users.id],
  }),
}));

// CRM Relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [customers.assignedTo],
    references: [users.id],
  }),
  interactions: many(customerInteractions),
  opportunities: many(opportunities),
  preferences: many(customerPreferences),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  activities: many(leadActivities),
  opportunities: many(opportunities),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id],
  }),
  createdBy: one(users, {
    fields: [leadActivities.createdBy],
    references: [users.id],
  }),
}));

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  lead: one(leads, {
    fields: [opportunities.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [opportunities.customerId],
    references: [customers.id],
  }),
  package: one(tourPackages, {
    fields: [opportunities.packageId],
    references: [tourPackages.id],
  }),
  event: one(events, {
    fields: [opportunities.eventId],
    references: [events.id],
  }),
  assignedTo: one(users, {
    fields: [opportunities.assignedTo],
    references: [users.id],
  }),
}));

export const customerInteractionsRelations = relations(customerInteractions, ({ one }) => ({
  customer: one(customers, {
    fields: [customerInteractions.customerId],
    references: [customers.id],
  }),
  booking: one(bookings, {
    fields: [customerInteractions.bookingId],
    references: [bookings.id],
  }),
  createdBy: one(users, {
    fields: [customerInteractions.createdBy],
    references: [users.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [emailTemplates.createdBy],
    references: [users.id],
  }),
  campaigns: many(emailCampaigns),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one }) => ({
  template: one(emailTemplates, {
    fields: [emailCampaigns.templateId],
    references: [emailTemplates.id],
  }),
  createdBy: one(users, {
    fields: [emailCampaigns.createdBy],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedTo: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
}));

export const customerPreferencesRelations = relations(customerPreferences, ({ one }) => ({
  customer: one(customers, {
    fields: [customerPreferences.customerId],
    references: [customers.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const upsertUserSchema = insertUserSchema.partial({ id: true });

export const insertTourPackageSchema = createInsertSchema(tourPackages);
export const insertEventSchema = createInsertSchema(events);
export const insertBookingSchema = createInsertSchema(bookings);
export const insertTravelerSchema = createInsertSchema(travelers);
export const insertReviewSchema = createInsertSchema(reviews);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertAvailabilitySchema = createInsertSchema(availability);
export const insertTranslationSchema = createInsertSchema(translations);
export const insertNewsletterSchema = createInsertSchema(newsletters);
export const insertContactQuerySchema = createInsertSchema(contactQueries);

// CRM Zod schemas
export const insertCustomerSchema = createInsertSchema(customers);
export const insertLeadSchema = createInsertSchema(leads);
export const insertLeadActivitySchema = createInsertSchema(leadActivities);
export const insertOpportunitySchema = createInsertSchema(opportunities);
export const insertCustomerInteractionSchema = createInsertSchema(customerInteractions);
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertCustomerPreferenceSchema = createInsertSchema(customerPreferences);

export const validateTravelerSchema = insertTravelerSchema.omit({ bookingId: true });

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type TourPackage = typeof tourPackages.$inferSelect;
export type InsertTourPackage = z.infer<typeof insertTourPackageSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Traveler = typeof travelers.$inferSelect;
export type InsertTraveler = z.infer<typeof insertTravelerSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;

export type ContactQuery = typeof contactQueries.$inferSelect;
export type InsertContactQuery = z.infer<typeof insertContactQuerySchema>;

// CRM Type exports
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;

export type CustomerInteraction = typeof customerInteractions.$inferSelect;
export type InsertCustomerInteraction = z.infer<typeof insertCustomerInteractionSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type CustomerPreference = typeof customerPreferences.$inferSelect;
export type InsertCustomerPreference = z.infer<typeof insertCustomerPreferenceSchema>; 