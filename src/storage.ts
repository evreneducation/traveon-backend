import {
  users,
  tourPackages,
  events,
  bookings,
  travelers,
  newsletters,
  reviews,
  payments,
  availability,
  translations,
  contactQueries,
  type User,
  type UpsertUser,
  type TourPackage,
  type InsertTourPackage,
  type Event,
  type InsertEvent,
  type Booking,
  type InsertBooking,
  type Traveler,
  type InsertTraveler,
  type Review,
  type InsertReview,
  type Payment,
  type InsertPayment,
  type Availability,
  type InsertAvailability,
  type Translation,
  type InsertTranslation,
  type Newsletter,
  type InsertNewsletter,
  type ContactQuery,
  type InsertContactQuery,
} from "./schema.js";
import { db } from "./db.js";
import { eq, and, or, like, gte, lte, desc, asc, count, sql } from "drizzle-orm";

// Utility function to handle Drizzle ORM type assertions
const withWhere = <T>(query: T, condition: any): T => {
  // @ts-ignore - Drizzle ORM type system limitation
  return query.where(condition) as T;
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tour package operations
  getTourPackages(filters?: { 
    destination?: string; 
    featured?: boolean; 
    active?: boolean;
    minPrice?: number;
    maxPrice?: number;
    duration?: string;
    difficulty?: string;
    search?: string;
  }): Promise<TourPackage[]>;
  getTourPackage(id: number): Promise<TourPackage | undefined>;
  createTourPackage(pkg: InsertTourPackage): Promise<TourPackage>;
  updateTourPackage(id: number, pkg: Partial<InsertTourPackage>): Promise<TourPackage | undefined>;
  deleteTourPackage(id: number): Promise<boolean>;
  
  // Event operations
  getEvents(filters?: { 
    active?: boolean;
    location?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  }): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Booking operations
  getBookings(userId?: string): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  
  // Traveler operations
  getTravelers(bookingId: number): Promise<Traveler[]>;
  getTraveler(id: number): Promise<Traveler | undefined>;
  createTraveler(traveler: InsertTraveler): Promise<Traveler>;
  createTravelers(travelers: InsertTraveler[]): Promise<Traveler[]>;
  updateTraveler(id: number, traveler: Partial<InsertTraveler>): Promise<Traveler | undefined>;
  deleteTraveler(id: number): Promise<boolean>;
  deleteTravelersByBooking(bookingId: number): Promise<boolean>;
  
  // Review operations
  getReviews(packageId?: number, eventId?: number): Promise<Review[]>;
  getReview(id: number): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  
  // Payment operations
  getPayments(bookingId?: number): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  
  // Availability operations
  getAvailability(packageId?: number, eventId?: number, date?: Date): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, availability: Partial<InsertAvailability>): Promise<Availability | undefined>;
  
  // Translation operations
  getTranslations(entityType: string, entityId: number, language?: string): Promise<Translation[]>;
  createTranslation(translation: InsertTranslation): Promise<Translation>;
  updateTranslation(id: number, translation: Partial<InsertTranslation>): Promise<Translation | undefined>;
  
  // Newsletter operations
  subscribeNewsletter(email: string): Promise<Newsletter>;
  unsubscribeNewsletter(email: string): Promise<boolean>;
  
  // Contact query operations
  getContactQueries(filters?: { 
    status?: string; 
    priority?: string;
    assignedTo?: string;
  }): Promise<ContactQuery[]>;
  getContactQuery(id: number): Promise<ContactQuery | undefined>;
  createContactQuery(query: InsertContactQuery): Promise<ContactQuery>;
  updateContactQuery(id: number, query: Partial<InsertContactQuery>): Promise<ContactQuery | undefined>;
  deleteContactQuery(id: number): Promise<boolean>;
  
  // Real-time availability
  checkAvailability(packageId: number, eventId: number, date: Date, slots: number): Promise<boolean>;
  reserveSlots(packageId: number, eventId: number, date: Date, slots: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!userData.id) {
      throw new Error('User ID is required for upsert operation');
    }
    
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    if (!user) {
      throw new Error('Failed to upsert user');
    }
    
    return user;
  }

  // Tour package operations
  async getTourPackages(filters?: { 
    destination?: string; 
    featured?: boolean; 
    active?: boolean;
    minPrice?: number;
    maxPrice?: number;
    duration?: string;
    difficulty?: string;
    search?: string;
  }): Promise<TourPackage[]> {
    let query = db.select().from(tourPackages);
    
    const conditions = [];
    
    if (filters?.active !== undefined) {
      conditions.push(eq(tourPackages.active, filters.active));
    }
    
    if (filters?.featured !== undefined) {
      conditions.push(eq(tourPackages.featured, filters.featured));
    }
    
    if (filters?.destination) {
      conditions.push(like(tourPackages.destination, `%${filters.destination}%`));
    }
    
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(tourPackages.startingPrice, filters.minPrice.toString()));
    }
    
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(tourPackages.startingPrice, filters.maxPrice.toString()));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          like(tourPackages.name, `%${filters.search}%`),
          like(tourPackages.description, `%${filters.search}%`),
          like(tourPackages.destination, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(tourPackages.featured), desc(tourPackages.createdAt));
  }

  async getTourPackage(id: number): Promise<TourPackage | undefined> {
    const [pkg] = await db.select().from(tourPackages).where(eq(tourPackages.id, id));
    return pkg;
  }

  async createTourPackage(pkg: InsertTourPackage): Promise<TourPackage> {
    const [newPackage] = await db.insert(tourPackages).values(pkg).returning();
    if (!newPackage) {
      throw new Error('Failed to create tour package');
    }
    return newPackage;
  }

  async updateTourPackage(id: number, pkg: Partial<InsertTourPackage>): Promise<TourPackage | undefined> {
    const [updated] = await db
      .update(tourPackages)
      .set({ ...pkg, updatedAt: new Date() } as any)
      .where(eq(tourPackages.id, id))
      .returning();
    return updated;
  }

  async deleteTourPackage(id: number): Promise<boolean> {
    const [deleted] = await db.delete(tourPackages).where(eq(tourPackages.id, id)).returning();
    return !!deleted;
  }

  // Event operations
  async getEvents(filters?: { 
    active?: boolean;
    location?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  }): Promise<Event[]> {
    let query = db.select().from(events);
    
    const conditions = [];
    
    if (filters?.active !== undefined) {
      conditions.push(eq(events.active, filters.active));
    }
    
    if (filters?.location) {
      conditions.push(like(events.location, `%${filters.location}%`));
    }
    
    if (filters?.dateFrom) {
      conditions.push(gte(events.startDate, filters.dateFrom));
    }
    
    if (filters?.dateTo) {
      conditions.push(lte(events.endDate, filters.dateTo));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          like(events.name, `%${filters.search}%`),
          like(events.description, `%${filters.search}%`),
          like(events.location, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(events.startDate));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    if (!newEvent) {
      throw new Error('Failed to create event');
    }
    return newEvent;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db
      .update(events)
      .set({ ...event, updatedAt: new Date() } as any)
      .where(eq(events.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
    return !!deleted;
  }

  // Booking operations
  async getBookings(userId?: string): Promise<Booking[]> {
    let query = db.select().from(bookings);
    
    if (userId) {
      query = query.where(eq(bookings.userId, userId)) as any;
    }
    
    return await query.orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    if (!newBooking) {
      throw new Error('Failed to create booking');
    }
    return newBooking;
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() } as any)
      .where(eq(bookings.id, id))
      .returning();
    return updated || undefined;
  }

  // Traveler operations
  async getTravelers(bookingId: number): Promise<Traveler[]> {
    return await db.select().from(travelers).where(eq(travelers.bookingId, bookingId)).orderBy(asc(travelers.id));
  }

  async getTraveler(id: number): Promise<Traveler | undefined> {
    const [traveler] = await db.select().from(travelers).where(eq(travelers.id, id));
    return traveler;
  }

  async createTraveler(traveler: InsertTraveler): Promise<Traveler> {
    const [newTraveler] = await db.insert(travelers).values(traveler).returning();
    if (!newTraveler) {
      throw new Error('Failed to create traveler');
    }
    return newTraveler;
  }

  async createTravelers(travelersData: InsertTraveler[]): Promise<Traveler[]> {
    if (travelersData.length === 0) {
      return [];
    }
    const newTravelers = await db.insert(travelers).values(travelersData).returning();
    return newTravelers;
  }

  async updateTraveler(id: number, traveler: Partial<InsertTraveler>): Promise<Traveler | undefined> {
    const [updated] = await db
      .update(travelers)
      .set({ ...traveler, updatedAt: new Date() } as any)
      .where(eq(travelers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTraveler(id: number): Promise<boolean> {
    const result = await db.delete(travelers).where(eq(travelers.id, id));
    return (result as any).rowCount > 0;
  }

  async deleteTravelersByBooking(bookingId: number): Promise<boolean> {
    const result = await db.delete(travelers).where(eq(travelers.bookingId, bookingId));
    return (result as any).rowCount >= 0; // Return true even if no travelers exist
  }

  // Review operations
  async getReviews(packageId?: number, eventId?: number): Promise<Review[]> {
    let query = db.select().from(reviews);
    
    const conditions = [];
    
    if (packageId) {
      conditions.push(eq(reviews.packageId, packageId));
    }
    
    if (eventId) {
      conditions.push(eq(reviews.eventId, eventId));
    }
    
    if (conditions.length > 0) {
      // @ts-ignore - Drizzle ORM type system limitation
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(reviews.createdAt));
  }

  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    if (!newReview) {
      throw new Error('Failed to create review');
    }
    return newReview;
  }

  async updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined> {
    const [updated] = await db
      .update(reviews)
      .set({ ...review, updatedAt: new Date() } as any)
      .where(eq(reviews.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteReview(id: number): Promise<boolean> {
    const [deleted] = await db.delete(reviews).where(eq(reviews.id, id)).returning();
    return !!deleted;
  }

  // Payment operations
  async getPayments(bookingId?: number): Promise<Payment[]> {
    let query = db.select().from(payments);
    
    if (bookingId) {
      // @ts-ignore - Drizzle ORM type system limitation
      query = query.where(eq(payments.bookingId, bookingId));
    }
    
    return await query.orderBy(desc(payments.createdAt));
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    if (!newPayment) {
      throw new Error('Failed to create payment');
    }
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db
      .update(payments)
      .set({ ...payment, updatedAt: new Date() } as any)
      .where(eq(payments.id, id))
      .returning();
    return updated || undefined;
  }

  // Availability operations
  async getAvailability(packageId?: number, eventId?: number, date?: Date): Promise<Availability[]> {
    let query = db.select().from(availability);
    
    const conditions = [];
    
    if (packageId) {
      conditions.push(eq(availability.packageId, packageId));
    }
    
    if (eventId) {
      conditions.push(eq(availability.eventId, eventId));
    }
    
    if (date) {
      conditions.push(eq(availability.date, date));
    }
    
    if (conditions.length > 0) {
      // @ts-ignore - Drizzle ORM type system limitation
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(availability.date);
  }

  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const [newAvailability] = await db.insert(availability).values(availabilityData).returning();
    if (!newAvailability) {
      throw new Error('Failed to create availability');
    }
    return newAvailability;
  }

  async updateAvailability(id: number, availabilityData: Partial<InsertAvailability>): Promise<Availability | undefined> {
    const [updated] = await db
      .update(availability)
      .set({ ...availabilityData, updatedAt: new Date() } as any)
      .where(eq(availability.id, id))
      .returning();
    return updated || undefined;
  }

  // Translation operations
  async getTranslations(entityType: string, entityId: number, language?: string): Promise<Translation[]> {
    let query = db.select().from(translations);
    
    const conditions = [
      eq(translations.entityType, entityType),
      eq(translations.entityId, entityId)
    ];
    
    if (language) {
      conditions.push(eq(translations.language, language));
    }
    
    // @ts-ignore - Drizzle ORM type system limitation
    query = query.where(and(...conditions));
    
    return await query;
  }

  async createTranslation(translation: InsertTranslation): Promise<Translation> {
    const [newTranslation] = await db.insert(translations).values(translation).returning();
    if (!newTranslation) {
      throw new Error('Failed to create translation');
    }
    return newTranslation;
  }

  async updateTranslation(id: number, translation: Partial<InsertTranslation>): Promise<Translation | undefined> {
    const [updated] = await db
      .update(translations)
      .set({ ...translation, updatedAt: new Date() } as any)
      .where(eq(translations.id, id))
      .returning();
    return updated || undefined;
  }

  // Newsletter operations
  async subscribeNewsletter(email: string): Promise<Newsletter> {
    const [newsletter] = await db
      .insert(newsletters)
      .values({ email })
      .onConflictDoUpdate({
        target: newsletters.email,
        set: { subscribed: true },
      })
      .returning();
    
    if (!newsletter) {
      throw new Error('Failed to subscribe to newsletter');
    }
    
    return newsletter;
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    const [updated] = await db
      .update(newsletters)
      .set({ subscribed: false })
      .where(eq(newsletters.email, email))
      .returning();
    
    return !!updated;
  }

  // Contact query operations
  async getContactQueries(filters?: { 
    status?: string; 
    priority?: string;
    assignedTo?: string;
  }): Promise<ContactQuery[]> {
    let query = db.select().from(contactQueries);
    
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(contactQueries.status, filters.status));
    }
    
    if (filters?.priority) {
      conditions.push(eq(contactQueries.priority, filters.priority));
    }
    
    if (filters?.assignedTo) {
      conditions.push(eq(contactQueries.assignedTo, filters.assignedTo));
    }
    
    if (conditions.length > 0) {
      // @ts-ignore - Drizzle ORM type system limitation
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(contactQueries.createdAt));
  }

  async getContactQuery(id: number): Promise<ContactQuery | undefined> {
    const [query] = await db.select().from(contactQueries).where(eq(contactQueries.id, id));
    return query;
  }

  async createContactQuery(queryData: InsertContactQuery): Promise<ContactQuery> {
    const [newQuery] = await db.insert(contactQueries).values(queryData).returning();
    if (!newQuery) {
      throw new Error('Failed to create contact query');
    }
    return newQuery;
  }

  async updateContactQuery(id: number, queryData: Partial<InsertContactQuery>): Promise<ContactQuery | undefined> {
    const [updated] = await db
      .update(contactQueries)
      .set({ ...queryData, updatedAt: new Date() } as any)
      .where(eq(contactQueries.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContactQuery(id: number): Promise<boolean> {
    const [deleted] = await db.delete(contactQueries).where(eq(contactQueries.id, id)).returning();
    return !!deleted;
  }

  // Real-time availability
  async checkAvailability(packageId: number, eventId: number, date: Date, slots: number): Promise<boolean> {
    const conditions = [];
    
    if (packageId) {
      conditions.push(eq(availability.packageId, packageId));
    }
    
    if (eventId) {
      conditions.push(eq(availability.eventId, eventId));
    }
    
    conditions.push(eq(availability.date, date));
    conditions.push(eq(availability.active, true));
    
    const [avail] = await db
      .select()
      .from(availability)
      .where(and(...conditions));
    
    if (!avail) {
      return false;
    }
    
    const bookedSlots = avail.bookedSlots || 0;
    return (avail.totalSlots - bookedSlots) >= slots;
  }

  async reserveSlots(packageId: number, eventId: number, date: Date, slots: number): Promise<boolean> {
    const conditions = [];
    
    if (packageId) {
      conditions.push(eq(availability.packageId, packageId));
    }
    
    if (eventId) {
      conditions.push(eq(availability.eventId, eventId));
    }
    
    conditions.push(eq(availability.date, date));
    conditions.push(eq(availability.active, true));
    
    const [avail] = await db
      .select()
      .from(availability)
      .where(and(...conditions));
    
    if (!avail) {
      return false;
    }
    
    const bookedSlots = avail.bookedSlots || 0;
    if ((avail.totalSlots - bookedSlots) < slots) {
      return false;
    }
    
    await db
      .update(availability)
      .set({ 
        bookedSlots: bookedSlots + slots,
        updatedAt: new Date()
      })
      .where(eq(availability.id, avail.id));
    
    return true;
  }

  // Private methods for updating ratings
  async updatePackageRating(packageId: number): Promise<void> {
    const reviews = await this.getReviews(packageId);
    if (reviews.length === 0) return;
    
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    await db
      .update(tourPackages)
      .set({ 
        rating: avgRating.toFixed(1),
        reviewCount: reviews.length,
        updatedAt: new Date()
      })
      .where(eq(tourPackages.id, packageId));
  }

  async updateEventRating(eventId: number): Promise<void> {
    const reviews = await this.getReviews(undefined, eventId);
    if (reviews.length === 0) return;
    
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    // Note: Events don't have rating fields in the current schema
    // You might want to add rating and reviewCount fields to the events table
  }
}

export const storage = new DatabaseStorage(); 