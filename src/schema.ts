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
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const tourPackagesRelations = relations(tourPackages, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
  availability: many(availability),
  translations: many(translations),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
  availability: many(availability),
  translations: many(translations),
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