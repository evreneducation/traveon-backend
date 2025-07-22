import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { storage } from "./storage.js";
import { isAuthenticated, isAuthenticatedToken } from "./index.js";
import { EmailService } from "./emailService.js";
import {
  insertTourPackageSchema,
  insertEventSchema,
  insertBookingSchema,
  insertTravelerSchema,
  insertReviewSchema,
  insertPaymentSchema,
  insertAvailabilitySchema,
  insertTranslationSchema,
  insertNewsletterSchema,
  insertContactQuerySchema,
  type TourPackage,
  type Event,
  type Booking,
  type Traveler,
  type InsertTraveler,
  validateTravelerSchema,
} from "./schema.js";
import { z } from "zod";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

// Helper function to calculate pricing based on hotel category and flight inclusion
const calculatePackagePrice = (pkg: TourPackage, hotelCategory: '3_star' | '4_5_star', flightIncluded: boolean) => {
  if (!pkg.pricingTiers) {
    // Fallback to original pricing if no tiers defined
    return {
      price: pkg.startingPrice,
      strikeThroughPrice: pkg.strikeThroughPrice,
      childrenPrice: (parseFloat(pkg.startingPrice) * 0.7).toString(), // 30% discount for children
      childrenStrikeThroughPrice: pkg.strikeThroughPrice ? (parseFloat(pkg.strikeThroughPrice) * 0.7).toString() : null
    };
  }

  const categoryPricing = pkg.pricingTiers[hotelCategory];
  if (!categoryPricing) {
    return {
      price: pkg.startingPrice,
      strikeThroughPrice: pkg.strikeThroughPrice,
      childrenPrice: (parseFloat(pkg.startingPrice) * 0.7).toString(),
      childrenStrikeThroughPrice: pkg.strikeThroughPrice ? (parseFloat(pkg.strikeThroughPrice) * 0.7).toString() : null
    };
  }

  const selectedPricing = flightIncluded ? categoryPricing.with_flights : categoryPricing.without_flights;
  
  return {
    price: selectedPricing.price,
    strikeThroughPrice: selectedPricing.strikethrough_price || null,
    childrenPrice: selectedPricing.children_price || (parseFloat(selectedPricing.price) * 0.7).toString(),
    childrenStrikeThroughPrice: selectedPricing.children_strikethrough_price || 
      (selectedPricing.strikethrough_price ? (parseFloat(selectedPricing.strikethrough_price) * 0.7).toString() : null)
  };
};

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

  // Get pricing for specific hotel category and flight inclusion
  router.get("/packages/:id/pricing", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { hotelCategory = '3_star', flightIncluded = 'false' } = req.query;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid package ID" });
      }

      const pkg = await storage.getTourPackage(id);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      const hotelCat = hotelCategory as '3_star' | '4_5_star';
      const includeFlight = flightIncluded === 'true';
      
      const pricing = calculatePackagePrice(pkg, hotelCat, includeFlight);
      
      return res.json({
        packageId: id,
        hotelCategory: hotelCat,
        flightIncluded: includeFlight,
        ...pricing
      });
    } catch (error) {
      console.error("Error fetching package pricing:", error);
      return res.status(500).json({ message: "Failed to fetch package pricing" });
    }
  });

  router.post("/packages", isAuthenticatedToken, async (req: any, res) => {
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

  router.put("/packages/:id", isAuthenticatedToken, async (req: any, res) => {
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

  router.delete("/packages/:id", isAuthenticatedToken, async (req: any, res) => {
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

  router.post("/events", isAuthenticatedToken, async (req: any, res) => {
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

  router.put("/events/:id", isAuthenticatedToken, async (req: any, res) => {
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

  router.delete("/events/:id", isAuthenticatedToken, async (req: any, res) => {
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
  router.get("/bookings", isAuthenticatedToken, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.user.id);
      return res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  router.get("/bookings/:id", isAuthenticatedToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const booking = await storage.getBooking(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const travelers = await storage.getTravelers(id);
    let packageName = "";
    if (booking.packageId) {
      const pkg = await storage.getTourPackage(booking.packageId);
      packageName = pkg?.name || "";
    }
    return res.json({ ...booking, travelers, packageName });
  });

  // 1. Validate booking (no DB writes)
  router.post("/bookings/validate", isAuthenticatedToken, async (req, res) => {
    try {
      if (!req.user || !(req.user as any).id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).id;
      const { travelers: travelersData, ...bookingData } = req.body;
      // Convert travelDate to Date
      if (bookingData.travelDate && typeof bookingData.travelDate === 'string') {
        bookingData.travelDate = new Date(bookingData.travelDate);
      }
      // Validate booking (max passengers, etc)
      const validated = insertBookingSchema.parse({ ...bookingData, userId });
      // Calculate total (use your pricing logic)
      // ...
      // Validate travelers (dateOfBirth as Date)
      if (travelersData && Array.isArray(travelersData)) {
        travelersData.forEach(traveler => {
          validateTravelerSchema.parse({
            ...traveler,
            dateOfBirth: traveler.dateOfBirth ? new Date(traveler.dateOfBirth) : undefined,
          });
        });
      }
      return res.json({ totalAmount: validated.totalAmount });
    } catch (err: any) {
      return res.status(400).json({ message: "Validation error", errors: err.errors });
    }
  });

  // 2. Create Razorpay order
  router.post("/payments/create-order", isAuthenticatedToken, async (req, res) => {
    try {
      if (!razorpay) {
        return res.status(500).json({ message: "Payment system not configured" });
      }
      const { amount, bookingData } = req.body;
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `booking_${Date.now()}`,
        notes: { bookingData: JSON.stringify(bookingData) },
      });
      return res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  // 3. Verify payment and create booking
  router.post("/payments/verify", isAuthenticatedToken, async (req, res) => {
    try {
      if (!req.user || !(req.user as any).id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ message: "Payment system not configured" });
      }
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData } = req.body;
      // Debug logs for signature verification
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const maskedSecret = secret.length > 4 ? '*'.repeat(secret.length - 4) + secret.slice(-4) : secret;
      console.log("[Razorpay Verify] order_id:", razorpay_order_id);
      console.log("[Razorpay Verify] payment_id:", razorpay_payment_id);
      console.log("[Razorpay Verify] signature (from Razorpay):", razorpay_signature);
      console.log("[Razorpay Verify] secret used:", maskedSecret);
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const signature = crypto.createHmac("sha256", secret).update(text).digest("hex");
      console.log("[Razorpay Verify] computed signature:", signature);
      if (signature !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }
      // Create booking
      const { travelers: travelersData, ...bookingInfo } = bookingData;
      if (bookingInfo.travelDate && typeof bookingInfo.travelDate === 'string') {
        bookingInfo.travelDate = new Date(bookingInfo.travelDate);
      }
      const validated = insertBookingSchema.parse({
        ...bookingInfo,
        userId: (req.user as any).id,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        paymentStatus: 'paid',
        status: 'confirmed',
      });
      const booking = await storage.createBooking(validated);
      // Create travelers
      if (travelersData && Array.isArray(travelersData)) {
        const validatedTravelers = travelersData.map(traveler =>
          insertTravelerSchema.parse({
            ...traveler,
            bookingId: booking.id,
            dateOfBirth: traveler.dateOfBirth ? new Date(traveler.dateOfBirth) : undefined,
          })
        );
        await storage.createTravelers(validatedTravelers);
      }
      // Save payment record
      await storage.createPayment({
        bookingId: booking.id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        amount: validated.totalAmount,
        currency: validated.currency || 'INR',
        status: "paid",
      });
      return res.json({ message: "Booking confirmed", bookingId: booking.id });
    } catch (err: any) {
      return res.status(400).json({ message: "Payment verification failed", errors: err.errors });
    }
  });

  // Traveler routes
  router.get("/bookings/:bookingId/travelers", isAuthenticatedToken, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      // Verify booking belongs to user or user is admin
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (booking.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const travelers = await storage.getTravelers(bookingId);
      return res.json(travelers);
    } catch (error) {
      console.error("Error fetching travelers:", error);
      return res.status(500).json({ message: "Failed to fetch travelers" });
    }
  });

  router.post("/bookings/:bookingId/travelers", isAuthenticatedToken, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      // Verify booking belongs to user or user is admin
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (booking.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const validated = insertTravelerSchema.parse({
        ...req.body,
        bookingId,
      });

      const traveler = await storage.createTraveler(validated);
      return res.status(201).json(traveler);
    } catch (error) {
      console.error("Error creating traveler:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create traveler" });
    }
  });

  router.put("/travelers/:id", isAuthenticatedToken, async (req: any, res) => {
    try {
      const travelerId = parseInt(req.params.id);
      if (isNaN(travelerId)) {
        return res.status(400).json({ message: "Invalid traveler ID" });
      }

      // Verify traveler exists and belongs to user's booking
      const traveler = await storage.getTraveler(travelerId);
      if (!traveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }

      const booking = await storage.getBooking(traveler.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Associated booking not found" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (booking.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTraveler = await storage.updateTraveler(travelerId, req.body);
      if (!updatedTraveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }

      return res.json(updatedTraveler);
    } catch (error) {
      console.error("Error updating traveler:", error);
      return res.status(500).json({ message: "Failed to update traveler" });
    }
  });

  router.delete("/travelers/:id", isAuthenticatedToken, async (req: any, res) => {
    try {
      const travelerId = parseInt(req.params.id);
      if (isNaN(travelerId)) {
        return res.status(400).json({ message: "Invalid traveler ID" });
      }

      // Verify traveler exists and belongs to user's booking
      const traveler = await storage.getTraveler(travelerId);
      if (!traveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }

      const booking = await storage.getBooking(traveler.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Associated booking not found" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (booking.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteTraveler(travelerId);
      if (!deleted) {
        return res.status(404).json({ message: "Traveler not found" });
      }

      return res.json({ message: "Traveler deleted successfully" });
    } catch (error) {
      console.error("Error deleting traveler:", error);
      return res.status(500).json({ message: "Failed to delete traveler" });
    }
  });

  // Payment routes
  // The old /payments/create-order, /payments/verify, and /payments/verify-session/:sessionId
  // are now handled by the new /api/payments/create-order, /api/payments/verify, and
  // /auth/verify-session/:sessionId respectively. This section is now redundant for new payment flows.

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

  router.post("/reviews", isAuthenticatedToken, async (req: any, res) => {
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
  // The old /availability endpoint is now handled by the new /api/bookings/validate
  // and /api/payments/verify. This section is now redundant for new booking flows.

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

  router.post("/translations", isAuthenticatedToken, async (req: any, res) => {
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
  router.get("/admin/dashboard", isAuthenticatedToken, async (req: any, res) => {
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
  router.get("/admin/contact-queries", isAuthenticatedToken, async (req: any, res) => {
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

  router.get("/admin/contact-queries/:id", isAuthenticatedToken, async (req: any, res) => {
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

  router.put("/admin/contact-queries/:id", isAuthenticatedToken, async (req: any, res) => {
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

  router.delete("/admin/contact-queries/:id", isAuthenticatedToken, async (req: any, res) => {
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

  // Admin: Get all bookings
  router.get("/admin/bookings", isAuthenticatedToken, async (req, res) => {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const bookings = await storage.getBookings(); // No userId filter!
      return res.json(bookings);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      return res.status(500).json({ message: "Failed to fetch all bookings" });
    }
  });

  return router;
} 
