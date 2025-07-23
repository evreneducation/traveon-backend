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
  customers,
  leads,
  leadActivities,
  opportunities,
  customerInteractions,
  emailTemplates,
  emailCampaigns,
  tasks,
  customerPreferences,
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
  type Customer,
  type InsertCustomer,
  type Lead,
  type InsertLead,
  type LeadActivity,
  type InsertLeadActivity,
  type Opportunity,
  type InsertOpportunity,
  type CustomerInteraction,
  type InsertCustomerInteraction,
  type EmailTemplate,
  type InsertEmailTemplate,
  type EmailCampaign,
  type InsertEmailCampaign,
  type Task,
  type InsertTask,
  type CustomerPreference,
  type InsertCustomerPreference,
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
  
  // CRM: Customer operations
  getCustomers(filters?: {
    status?: string;
    customerType?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  
  // CRM: Lead operations
  getLeads(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    source?: string;
    search?: string;
  }): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  
  // CRM: Lead activity operations
  getLeadActivities(leadId: number): Promise<LeadActivity[]>;
  getLeadActivity(id: number): Promise<LeadActivity | undefined>;
  createLeadActivity(activity: InsertLeadActivity): Promise<LeadActivity>;
  updateLeadActivity(id: number, activity: Partial<InsertLeadActivity>): Promise<LeadActivity | undefined>;
  deleteLeadActivity(id: number): Promise<boolean>;
  
  // CRM: Opportunity operations
  getOpportunities(filters?: {
    stage?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<Opportunity[]>;
  getOpportunity(id: number): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: number, opportunity: Partial<InsertOpportunity>): Promise<Opportunity | undefined>;
  deleteOpportunity(id: number): Promise<boolean>;
  
  // CRM: Customer interaction operations
  getCustomerInteractions(customerId: number): Promise<CustomerInteraction[]>;
  getCustomerInteraction(id: number): Promise<CustomerInteraction | undefined>;
  createCustomerInteraction(interaction: InsertCustomerInteraction): Promise<CustomerInteraction>;
  updateCustomerInteraction(id: number, interaction: Partial<InsertCustomerInteraction>): Promise<CustomerInteraction | undefined>;
  deleteCustomerInteraction(id: number): Promise<boolean>;
  
  // CRM: Email template operations
  getEmailTemplates(category?: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  
  // CRM: Email campaign operations
  getEmailCampaigns(status?: string): Promise<EmailCampaign[]>;
  getEmailCampaign(id: number): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: number): Promise<boolean>;
  
  // CRM: Task operations
  getTasks(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    type?: string;
  }): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // CRM: Customer preference operations
  getCustomerPreferences(customerId: number, category?: string): Promise<CustomerPreference[]>;
  getCustomerPreference(id: number): Promise<CustomerPreference | undefined>;
  createCustomerPreference(preference: InsertCustomerPreference): Promise<CustomerPreference>;
  updateCustomerPreference(id: number, preference: Partial<InsertCustomerPreference>): Promise<CustomerPreference | undefined>;
  deleteCustomerPreference(id: number): Promise<boolean>;
  
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
      // Convert Date to string format for comparison with text field
      const dateFromStr = filters.dateFrom.toISOString().split('T')[0];
      conditions.push(gte(events.startDate, dateFromStr));
    }
    
    if (filters?.dateTo) {
      // Convert Date to string format for comparison with text field
      const dateToStr = filters.dateTo.toISOString().split('T')[0];
      conditions.push(lte(events.startDate, dateToStr));
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

  // CRM: Customer operations
  async getCustomers(filters?: {
    status?: string;
    customerType?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<Customer[]> {
    try {
      let query = db.select().from(customers);
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(customers.status, filters.status));
      }
      if (filters?.customerType) {
        conditions.push(eq(customers.customerType, filters.customerType));
      }
      if (filters?.assignedTo) {
        conditions.push(eq(customers.assignedTo, filters.assignedTo));
      }
      if (filters?.search) {
        conditions.push(
          or(
            like(customers.firstName, `%${filters.search}%`),
            like(customers.lastName, `%${filters.search}%`),
            like(customers.email, `%${filters.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = withWhere(query, and(...conditions));
      }

      return await query.orderBy(desc(customers.createdAt));
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching customer:", error);
      throw error;
    }
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.email, email));
      return result[0];
    } catch (error) {
      console.error("Error fetching customer by email:", error);
      throw error;
    }
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    try {
      const result = await db.insert(customers).values(customerData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  async updateCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const result = await db.update(customers)
        .set({ ...customerData, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  }

  async deleteCustomer(id: number): Promise<boolean> {
    try {
      const result = await db.delete(customers).where(eq(customers.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
  }

  // CRM: Lead operations
  async getLeads(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    source?: string;
    search?: string;
  }): Promise<Lead[]> {
    try {
      let query = db.select().from(leads);
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(leads.status, filters.status));
      }
      if (filters?.priority) {
        conditions.push(eq(leads.priority, filters.priority));
      }
      if (filters?.assignedTo) {
        conditions.push(eq(leads.assignedTo, filters.assignedTo));
      }
      if (filters?.source) {
        conditions.push(eq(leads.source, filters.source));
      }
      if (filters?.search) {
        conditions.push(
          or(
            like(leads.firstName, `%${filters.search}%`),
            like(leads.lastName, `%${filters.search}%`),
            like(leads.email, `%${filters.search}%`),
            like(leads.company, `%${filters.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = withWhere(query, and(...conditions));
      }

      return await query.orderBy(desc(leads.createdAt));
    } catch (error) {
      console.error("Error fetching leads:", error);
      throw error;
    }
  }

  async getLead(id: number): Promise<Lead | undefined> {
    try {
      const result = await db.select().from(leads).where(eq(leads.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching lead:", error);
      throw error;
    }
  }

  async createLead(leadData: InsertLead): Promise<Lead> {
    try {
      const result = await db.insert(leads).values(leadData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating lead:", error);
      throw error;
    }
  }

  async updateLead(id: number, leadData: Partial<InsertLead>): Promise<Lead | undefined> {
    try {
      const result = await db.update(leads)
        .set({ ...leadData, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating lead:", error);
      throw error;
    }
  }

  async deleteLead(id: number): Promise<boolean> {
    try {
      const result = await db.delete(leads).where(eq(leads.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting lead:", error);
      throw error;
    }
  }

  // CRM: Lead activity operations
  async getLeadActivities(leadId: number): Promise<LeadActivity[]> {
    try {
      return await db.select().from(leadActivities)
        .where(eq(leadActivities.leadId, leadId))
        .orderBy(desc(leadActivities.createdAt));
    } catch (error) {
      console.error("Error fetching lead activities:", error);
      throw error;
    }
  }

  async getLeadActivity(id: number): Promise<LeadActivity | undefined> {
    try {
      const result = await db.select().from(leadActivities).where(eq(leadActivities.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching lead activity:", error);
      throw error;
    }
  }

  async createLeadActivity(activityData: InsertLeadActivity): Promise<LeadActivity> {
    try {
      const result = await db.insert(leadActivities).values(activityData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating lead activity:", error);
      throw error;
    }
  }

  async updateLeadActivity(id: number, activityData: Partial<InsertLeadActivity>): Promise<LeadActivity | undefined> {
    try {
      const result = await db.update(leadActivities)
        .set({ ...activityData, updatedAt: new Date() })
        .where(eq(leadActivities.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating lead activity:", error);
      throw error;
    }
  }

  async deleteLeadActivity(id: number): Promise<boolean> {
    try {
      const result = await db.delete(leadActivities).where(eq(leadActivities.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting lead activity:", error);
      throw error;
    }
  }

  // CRM: Opportunity operations
  async getOpportunities(filters?: {
    stage?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<Opportunity[]> {
    try {
      let query = db.select().from(opportunities);
      const conditions = [];

      if (filters?.stage) {
        conditions.push(eq(opportunities.stage, filters.stage));
      }
      if (filters?.assignedTo) {
        conditions.push(eq(opportunities.assignedTo, filters.assignedTo));
      }
      if (filters?.search) {
        conditions.push(
          or(
            like(opportunities.title, `%${filters.search}%`),
            like(opportunities.description, `%${filters.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = withWhere(query, and(...conditions));
      }

      return await query.orderBy(desc(opportunities.createdAt));
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      throw error;
    }
  }

  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    try {
      const result = await db.select().from(opportunities).where(eq(opportunities.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      throw error;
    }
  }

  async createOpportunity(opportunityData: InsertOpportunity): Promise<Opportunity> {
    try {
      const result = await db.insert(opportunities).values(opportunityData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating opportunity:", error);
      throw error;
    }
  }

  async updateOpportunity(id: number, opportunityData: Partial<InsertOpportunity>): Promise<Opportunity | undefined> {
    try {
      const result = await db.update(opportunities)
        .set({ ...opportunityData, updatedAt: new Date() })
        .where(eq(opportunities.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating opportunity:", error);
      throw error;
    }
  }

  async deleteOpportunity(id: number): Promise<boolean> {
    try {
      const result = await db.delete(opportunities).where(eq(opportunities.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      throw error;
    }
  }

  // CRM: Customer interaction operations
  async getCustomerInteractions(customerId: number): Promise<CustomerInteraction[]> {
    try {
      return await db.select().from(customerInteractions)
        .where(eq(customerInteractions.customerId, customerId))
        .orderBy(desc(customerInteractions.createdAt));
    } catch (error) {
      console.error("Error fetching customer interactions:", error);
      throw error;
    }
  }

  async getCustomerInteraction(id: number): Promise<CustomerInteraction | undefined> {
    try {
      const result = await db.select().from(customerInteractions).where(eq(customerInteractions.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching customer interaction:", error);
      throw error;
    }
  }

  async createCustomerInteraction(interactionData: InsertCustomerInteraction): Promise<CustomerInteraction> {
    try {
      const result = await db.insert(customerInteractions).values(interactionData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating customer interaction:", error);
      throw error;
    }
  }

  async updateCustomerInteraction(id: number, interactionData: Partial<InsertCustomerInteraction>): Promise<CustomerInteraction | undefined> {
    try {
      const result = await db.update(customerInteractions)
        .set({ ...interactionData, updatedAt: new Date() })
        .where(eq(customerInteractions.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating customer interaction:", error);
      throw error;
    }
  }

  async deleteCustomerInteraction(id: number): Promise<boolean> {
    try {
      const result = await db.delete(customerInteractions).where(eq(customerInteractions.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting customer interaction:", error);
      throw error;
    }
  }

  // CRM: Email template operations
  async getEmailTemplates(category?: string): Promise<EmailTemplate[]> {
    try {
      let query = db.select().from(emailTemplates);
      
      if (category) {
        query = withWhere(query, eq(emailTemplates.category, category));
      }

      return await query.orderBy(desc(emailTemplates.createdAt));
    } catch (error) {
      console.error("Error fetching email templates:", error);
      throw error;
    }
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    try {
      const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching email template:", error);
      throw error;
    }
  }

  async createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate> {
    try {
      const result = await db.insert(emailTemplates).values(templateData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating email template:", error);
      throw error;
    }
  }

  async updateEmailTemplate(id: number, templateData: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    try {
      const result = await db.update(emailTemplates)
        .set({ ...templateData, updatedAt: new Date() })
        .where(eq(emailTemplates.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating email template:", error);
      throw error;
    }
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    try {
      const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting email template:", error);
      throw error;
    }
  }

  // CRM: Email campaign operations
  async getEmailCampaigns(status?: string): Promise<EmailCampaign[]> {
    try {
      let query = db.select().from(emailCampaigns);
      
      if (status) {
        query = withWhere(query, eq(emailCampaigns.status, status));
      }

      return await query.orderBy(desc(emailCampaigns.createdAt));
    } catch (error) {
      console.error("Error fetching email campaigns:", error);
      throw error;
    }
  }

  async getEmailCampaign(id: number): Promise<EmailCampaign | undefined> {
    try {
      const result = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching email campaign:", error);
      throw error;
    }
  }

  async createEmailCampaign(campaignData: InsertEmailCampaign): Promise<EmailCampaign> {
    try {
      const result = await db.insert(emailCampaigns).values(campaignData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating email campaign:", error);
      throw error;
    }
  }

  async updateEmailCampaign(id: number, campaignData: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    try {
      const result = await db.update(emailCampaigns)
        .set({ ...campaignData, updatedAt: new Date() })
        .where(eq(emailCampaigns.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating email campaign:", error);
      throw error;
    }
  }

  async deleteEmailCampaign(id: number): Promise<boolean> {
    try {
      const result = await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting email campaign:", error);
      throw error;
    }
  }

  // CRM: Task operations
  async getTasks(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    type?: string;
  }): Promise<Task[]> {
    try {
      let query = db.select().from(tasks);
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(tasks.status, filters.status));
      }
      if (filters?.priority) {
        conditions.push(eq(tasks.priority, filters.priority));
      }
      if (filters?.assignedTo) {
        conditions.push(eq(tasks.assignedTo, filters.assignedTo));
      }
      if (filters?.type) {
        conditions.push(eq(tasks.type, filters.type));
      }

      if (conditions.length > 0) {
        query = withWhere(query, and(...conditions));
      }

      return await query.orderBy(asc(tasks.dueDate), desc(tasks.createdAt));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    try {
      const result = await db.select().from(tasks).where(eq(tasks.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching task:", error);
      throw error;
    }
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    try {
      const result = await db.insert(tasks).values(taskData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    try {
      const result = await db.update(tasks)
        .set({ ...taskData, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      const result = await db.delete(tasks).where(eq(tasks.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }

  // CRM: Customer preference operations
  async getCustomerPreferences(customerId: number, category?: string): Promise<CustomerPreference[]> {
    try {
      let query = db.select().from(customerPreferences)
        .where(eq(customerPreferences.customerId, customerId));
      
      if (category) {
        query = withWhere(query, eq(customerPreferences.category, category));
      }

      return await query.orderBy(asc(customerPreferences.category));
    } catch (error) {
      console.error("Error fetching customer preferences:", error);
      throw error;
    }
  }

  async getCustomerPreference(id: number): Promise<CustomerPreference | undefined> {
    try {
      const result = await db.select().from(customerPreferences).where(eq(customerPreferences.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching customer preference:", error);
      throw error;
    }
  }

  async createCustomerPreference(preferenceData: InsertCustomerPreference): Promise<CustomerPreference> {
    try {
      const result = await db.insert(customerPreferences).values(preferenceData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating customer preference:", error);
      throw error;
    }
  }

  async updateCustomerPreference(id: number, preferenceData: Partial<InsertCustomerPreference>): Promise<CustomerPreference | undefined> {
    try {
      const result = await db.update(customerPreferences)
        .set({ ...preferenceData, updatedAt: new Date() })
        .where(eq(customerPreferences.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating customer preference:", error);
      throw error;
    }
  }

  async deleteCustomerPreference(id: number): Promise<boolean> {
    try {
      const result = await db.delete(customerPreferences).where(eq(customerPreferences.id, id));
      return (result.rowCount && result.rowCount > 0) as boolean;
    } catch (error) {
      console.error("Error deleting customer preference:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage(); 