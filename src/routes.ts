import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { storage } from "./storage.js";
import { isAuthenticated } from "./index.js";
import { EmailService } from "./emailService.js";
import {
  insertTourPackageSchema,
  insertEventSchema,
  insertBookingSchema,
  insertReviewSchema,
  insertPaymentSchema,
  insertAvailabilitySchema,
  insertTranslationSchema,
  insertNewsletterSchema,
  insertContactQuerySchema,
  type TourPackage,
  type Event,
  type Booking,
} from "./schema.js";
import { z } from "zod";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

// Initialize Razorpay
let razorpay: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Initialize S3
const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// File upload function
export const uploadFile = async (buffer: Buffer, filename: string, contentType: string): Promise<string> => {
  const key = `traveon/packageImg-${filename}`;
  const params = {
    Bucket: "xclusive-oman",
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentDisposition: "inline",
    CacheControl: "public, max-age=31536000",
    Metadata: {
      "Content-Type": contentType,
    },
  };

  try {
    await s3.send(new PutObjectCommand(params));
    const fileUrl = `https://${params.Bucket}.s3.amazonaws.com/${key}`;
    return fileUrl;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error(`Error uploading file to S3: ${errorMessage}`);
    throw err;
  }
};

export function registerRoutes() {
  const router = Router();

  // Auth routes
  router.get('/auth/user', (req, res) => {
    console.log('Auth user request - Session ID:', req.sessionID);
    console.log('Auth user request - Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('Auth user request - User:', req.user);
    console.log('Auth user request - Session:', req.session);
    console.log('Auth user request - Headers:', {
      'user-agent': req.headers['user-agent'],
      'origin': req.headers['origin'],
      'referer': req.headers['referer'],
      'cookie': req.headers['cookie'] ? 'present' : 'missing'
    });
    
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  router.get('/auth/debug', (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user || null,
      sessionID: req.sessionID,
      session: req.session,
      headers: {
        'user-agent': req.headers['user-agent'],
        'origin': req.headers['origin'],
        'referer': req.headers['referer'],
        'cookie': req.headers['cookie'] ? 'present' : 'missing'
      }
    });
  });

  router.get('/auth/admin', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).role === 'admin') {
      res.json({ isAdmin: true });
    } else {
      res.status(403).json({ isAdmin: false, message: 'Admin access required', user: req.user });
    }
  });

  // Test endpoint to manually set a cookie and test cross-domain
  router.get('/auth/test-cookie', (req, res) => {
    // Set a test cookie
    res.cookie('test-cookie', 'test-value', {
      secure: true,
      httpOnly: false, // Allow JS access for testing
      sameSite: 'none',
      maxAge: 60000, // 1 minute
    });
    
    res.json({ 
      message: 'Test cookie set',
      sessionId: req.sessionID,
      cookies: req.headers.cookie || 'no cookies received'
    });
  });

  // Alternative auth endpoint that returns user data with session info
  router.get('/auth/user-with-session', (req, res) => {
    console.log('User with session request - Session ID:', req.sessionID);
    console.log('User with session request - Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('User with session request - Headers:', {
      'cookie': req.headers['cookie'] ? 'present' : 'missing',
      'origin': req.headers['origin']
    });

    const response = {
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user || null,
      cookiesReceived: req.headers['cookie'] ? 'yes' : 'no',
      origin: req.headers['origin']
    };

    res.json(response);
  });

  // Special endpoint for post-OAuth session establishment
  router.get('/auth/verify-session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    console.log('Session verification request for:', sessionId);
    console.log('Current session ID:', req.sessionID);
    console.log('Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('Headers:', {
      'cookie': req.headers['cookie'] ? 'present' : 'missing',
      'origin': req.headers['origin']
    });

    // If the session IDs match and user is authenticated, return user data
    if (req.sessionID === sessionId && req.isAuthenticated && req.isAuthenticated() && req.user) {
      res.json({
        success: true,
        user: req.user,
        sessionId: req.sessionID,
        message: 'Session verified successfully'
      });
    } else {
      res.status(401).json({
        success: false,
        sessionId: req.sessionID,
        requestedSessionId: sessionId,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        message: 'Session verification failed'
      });
    }
  });

  // Simple token storage (in production, use Redis or database)
  // Use global storage so tokens created in OAuth callback can be accessed here
  const activeTokens = (global as any).activeTokens || new Map<string, { userId: string, expires: number }>();
  (global as any).activeTokens = activeTokens;

  // Clean up expired tokens periodically
  if (!(global as any).tokenCleanupInterval) {
    (global as any).tokenCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [token, data] of activeTokens.entries()) {
        if (data.expires < now) {
          activeTokens.delete(token);
        }
      }
    }, 60000); // Clean up every minute
  }

  // Token-based auth endpoint - generates simple token for authenticated users
  router.get('/auth/token', (req, res) => {
    console.log('Token request - Session ID:', req.sessionID);
    console.log('Token request - Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('Token request - User:', req.user);
    
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      // Generate simple token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      // Store token
      activeTokens.set(token, {
        userId: (req.user as any).id,
        expires
      });
      
      res.json({
        success: true,
        token,
        user: req.user,
        message: 'Token generated successfully'
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Not authenticated - cannot generate token'
      });
    }
  });

  // Verify token endpoint
  router.get('/auth/verify-token', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const tokenData = activeTokens.get(token);
    
    if (!tokenData) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    if (tokenData.expires < Date.now()) {
      activeTokens.delete(token);
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    
    try {
      const user = await storage.getUser(tokenData.userId);
      if (user) {
        res.json({
          success: true,
          user,
          message: 'Token is valid'
        });
      } else {
        activeTokens.delete(token);
        res.status(401).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ success: false, message: 'Error fetching user' });
    }
  });

  // Logout endpoint - clears tokens
  router.post('/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (token) {
      const tokenData = activeTokens.get(token);
      if (tokenData) {
        // Clear this specific token
        activeTokens.delete(token);
        
        // Clear all tokens for this user
        const userId = tokenData.userId;
        for (const [t, data] of activeTokens.entries()) {
          if (data.userId === userId) {
            activeTokens.delete(t);
          }
        }
        
        res.json({ success: true, message: 'Logged out successfully' });
      } else {
        res.json({ success: true, message: 'Token not found, already logged out' });
      }
    } else {
      res.json({ success: true, message: 'No token provided, already logged out' });
    }
  });

  // Tour packages routes
  router.get("/packages", async (req, res) => {
    try {
      const {
        destination,
        featured,
        active,
        minPrice,
        maxPrice,
        duration,
        difficulty,
        search,
      } = req.query;

      const filters: any = {};

      if (destination) filters.destination = destination as string;
      if (featured !== undefined) filters.featured = featured === "true";
      if (active !== undefined) filters.active = active === "true";
      if (minPrice) filters.minPrice = parseInt(minPrice as string);
      if (maxPrice) filters.maxPrice = parseInt(maxPrice as string);
      if (duration) filters.duration = duration as string;
      if (difficulty) filters.difficulty = difficulty as string;
      if (search) filters.search = search as string;

      const packages = await storage.getTourPackages(filters);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch tour packages" });
    }
  });

  router.get("/packages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid package ID" });
      }

      const pkg = await storage.getTourPackage(id);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      return res.json(pkg);
    } catch (error) {
      console.error("Error fetching package:", error);
      return res.status(500).json({ message: "Failed to fetch package" });
    }
  });

  router.post("/packages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertTourPackageSchema.parse(req.body);
      const pkg = await storage.createTourPackage(validated);
      return res.status(201).json(pkg);
    } catch (error) {
      console.error("Error creating package:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create package" });
    }
  });

  router.put("/packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid package ID" });
      }

      const pkg = await storage.updateTourPackage(id, req.body);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      return res.json(pkg);
    } catch (error) {
      console.error("Error updating package:", error);
      return res.status(500).json({ message: "Failed to update package" });
    }
  });

  router.delete("/packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid package ID" });
      }

      const deleted = await storage.deleteTourPackage(id);
      if (!deleted) {
        return res.status(404).json({ message: "Package not found" });
      }

      return res.json({ message: "Package deleted successfully" });
    } catch (error) {
      console.error("Error deleting package:", error);
      return res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Events routes
  router.get("/events", async (req, res) => {
    try {
      const { category, featured, active, location, dateFrom, dateTo, search } =
        req.query;

      const filters: any = {};

      if (category) filters.category = category as string;
      if (featured !== undefined) filters.featured = featured === "true";
      if (active !== undefined) filters.active = active === "true";
      if (location) filters.location = location as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (search) filters.search = search as string;

      const events = await storage.getEvents(filters);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  router.get("/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      return res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  router.post("/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validated);
      return res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create event" });
    }
  });

  router.put("/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const validated = insertEventSchema.parse(req.body);
      const event = await storage.updateEvent(id, validated);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update event" });
    }
  });

  router.delete("/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const deleted = await storage.deleteEvent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      return res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Booking routes
  router.get("/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.user.id);
      return res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  router.get("/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check if user owns this booking or is admin
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (booking.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      return res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      return res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  router.post("/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertBookingSchema.parse({
        ...req.body,
        userId,
      });

      // Check availability before creating booking
      const { packageId, eventId, checkInDate, guestCount } = validated;
      if (packageId && checkInDate) {
        const available = await storage.checkAvailability(
          packageId,
          0,
          new Date(checkInDate),
          guestCount,
        );
        if (!available) {
          return res
            .status(400)
            .json({ message: "Not enough availability for selected date" });
        }
      }

      const booking = await storage.createBooking(validated);

      // Reserve slots
      if (packageId && checkInDate) {
        await storage.reserveSlots(
          packageId,
          0,
          new Date(checkInDate),
          guestCount,
        );
      }

      return res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Payment routes
  router.post("/payments/create-order", isAuthenticated, async (req: any, res) => {
    try {
      if (!razorpay) {
        return res
          .status(500)
          .json({ message: "Payment system not configured" });
      }

      const { bookingId, amount, currency = "INR" } = req.body;

      if (!bookingId || !amount) {
        return res
          .status(400)
          .json({ message: "Booking ID and amount are required" });
      }

      // Verify booking exists and belongs to user
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: `booking_${bookingId}`,
        notes: {
          bookingId: bookingId.toString(),
        },
      };

      const order = await razorpay.orders.create(options);

      // Create payment record
      const payment = await storage.createPayment({
        bookingId,
        razorpayOrderId: order.id,
        amount: amount.toString(),
        currency,
        status: "created",
      });

      return res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment.id,
      });
    } catch (error) {
      console.error("Error creating payment order:", error);
      return res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  router.post("/payments/verify", async (req: any, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: "Missing payment verification data" });
      }

      // Verify signature
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(text)
        .digest("hex");

      if (signature !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      // Update payment status
      const payments = await storage.getPayments();
      const payment = payments.find(p => p.razorpayOrderId === razorpay_order_id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const updatedPayment = await storage.updatePayment(payment.id, {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
      });

      // Update booking status
      if (updatedPayment) {
        await storage.updateBooking(payment.bookingId, {
          paymentStatus: "paid",
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        });
      }

      return res.json({ message: "Payment verified successfully" });
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Reviews routes
  router.get("/reviews", async (req, res) => {
    try {
      const { packageId, eventId } = req.query;
      const filters: any = {};

      if (packageId) filters.packageId = parseInt(packageId as string);
      if (eventId) filters.eventId = parseInt(eventId as string);

      const reviews = await storage.getReviews(
        filters.packageId,
        filters.eventId,
      );
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  router.post("/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertReviewSchema.parse({
        ...req.body,
        userId,
      });

      const review = await storage.createReview(validated);

      // Update package/event rating
      if (validated.packageId) {
        await storage.updatePackageRating(validated.packageId);
      } else if (validated.eventId) {
        await storage.updateEventRating(validated.eventId);
      }

      return res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Availability routes
  router.get("/availability", async (req, res) => {
    try {
      const { packageId, eventId, date } = req.query;
      const filters: any = {};

      if (packageId) filters.packageId = parseInt(packageId as string);
      if (eventId) filters.eventId = parseInt(eventId as string);
      if (date) filters.date = new Date(date as string);

      const availability = await storage.getAvailability(
        filters.packageId,
        filters.eventId,
        filters.date,
      );
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  router.post("/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertAvailabilitySchema.parse(req.body);
      const availability = await storage.createAvailability(validated);
      return res.status(201).json(availability);
    } catch (error) {
      console.error("Error creating availability:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create availability" });
    }
  });

  // Translation routes
  router.get("/translations/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { language } = req.query;

      const translations = await storage.getTranslations(
        entityType,
        parseInt(entityId),
        language as string,
      );
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  router.post("/translations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertTranslationSchema.parse(req.body);
      const translation = await storage.createTranslation(validated);
      return res.status(201).json(translation);
    } catch (error) {
      console.error("Error creating translation:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create translation" });
    }
  });

  // Newsletter routes
  router.post("/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const newsletter = await storage.subscribeNewsletter(email);
      return res.status(201).json(newsletter);
    } catch (error) {
      console.error("Error subscribing to newsletter:", error);
      return res.status(500).json({ message: "Failed to subscribe to newsletter" });
    }
  });

  router.post("/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const success = await storage.unsubscribeNewsletter(email);
      if (!success) {
        return res.status(404).json({ message: "Email not found in newsletter" });
      }

      return res.json({ message: "Successfully unsubscribed from newsletter" });
    } catch (error) {
      console.error("Error unsubscribing from newsletter:", error);
      return res.status(500).json({ message: "Failed to unsubscribe from newsletter" });
    }
  });

  // Contact Query routes
  router.post("/contact-queries", async (req, res) => {
    try {
      const validated = insertContactQuerySchema.parse(req.body);
      const query = await storage.createContactQuery(validated);

      // Send email notifications
      try {
        await EmailService.sendContactQueryEmails(query);
      } catch (emailError) {
        console.error('Failed to send emails:', emailError);
        // Don't fail the request if emails fail
      }

      return res.status(201).json(query);
    } catch (error) {
      console.error("Error creating contact query:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create contact query" });
    }
  });

  // Admin dashboard routes
  router.get("/admin/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
  
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get statistics
      const [packages, events, bookings, reviews, contactQueries] = await Promise.all([
        storage.getTourPackages(),
        storage.getEvents(),
        storage.getBookings(),
        storage.getReviews(),
        storage.getContactQueries(),
      ]);

      const stats = {
        totalPackages: packages.length,
        totalEvents: events.length,
        totalBookings: bookings.length,
        totalReviews: reviews.length,
        totalContactQueries: contactQueries.length,
        activePackages: packages.filter(p => p.active).length,
        activeEvents: events.filter(e => e.active).length,
        pendingBookings: bookings.filter(b => b.status === "pending").length,
        confirmedBookings: bookings.filter(b => b.status === "confirmed").length,
        newContactQueries: contactQueries.filter(q => q.status === "new").length,
        urgentContactQueries: contactQueries.filter(q => q.priority === "urgent").length,
      };

      return res.json(stats);
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      return res.status(500).json({ message: "Failed to fetch admin dashboard" });
    }
  });

  // Admin contact queries routes
  router.get("/admin/contact-queries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { status, priority, assignedTo } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;
      if (assignedTo) filters.assignedTo = assignedTo as string;

      const queries = await storage.getContactQueries(filters);
      return res.json(queries);
    } catch (error) {
      console.error("Error fetching contact queries:", error);
      return res.status(500).json({ message: "Failed to fetch contact queries" });
    }
  });

  router.get("/admin/contact-queries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid query ID" });
      }

      const query = await storage.getContactQuery(id);
      if (!query) {
        return res.status(404).json({ message: "Contact query not found" });
      }

      return res.json(query);
    } catch (error) {
      console.error("Error fetching contact query:", error);
      return res.status(500).json({ message: "Failed to fetch contact query" });
    }
  });

  router.put("/admin/contact-queries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid query ID" });
      }

      const validated = insertContactQuerySchema.partial().parse(req.body);
      const query = await storage.updateContactQuery(id, validated);
      
      if (!query) {
        return res.status(404).json({ message: "Contact query not found" });
      }

      return res.json(query);
    } catch (error) {
      console.error("Error updating contact query:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update contact query" });
    }
  });

  router.delete("/admin/contact-queries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid query ID" });
      }

      const success = await storage.deleteContactQuery(id);
      if (!success) {
        return res.status(404).json({ message: "Contact query not found" });
      }

      return res.json({ message: "Contact query deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact query:", error);
      return res.status(500).json({ message: "Failed to delete contact query" });
    }
  });

  // Image upload endpoint for admin
  const upload = multer();
  router.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { buffer, originalname, mimetype } = req.file;
      const filename = `${Date.now()}-${originalname}`;
      
      const imageUrl = await uploadFile(buffer, filename, mimetype);
      return res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  });

  return router;
} 
