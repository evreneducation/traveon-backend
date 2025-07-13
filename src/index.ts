import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Profile, VerifyCallback } from "passport-google-oauth20";
import { storage } from "./storage.js";
import type { User, UpsertUser } from "./schema.js";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import cors from "cors";
import pgSession from 'connect-pg-simple';
import { Pool } from 'pg';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
// app.use(
//   cors({
//     origin: [
//       process.env.FRONTEND_URL || "http://localhost:5173",
//       "http://localhost:5000",
//       "http://localhost:3000",
//       "http://localhost:5174",
//       "https://traveon.vercel.app",
//     ],
//     credentials: true,
//   })
// );
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://localhost:5174",
  "https://traveon.vercel.app",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", 1);

// Environment-aware session configuration
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Postgres session store setup
const PgSession = pgSession(session);
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

// Add session middleware
app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'changeme',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Always use secure cookies for cross-domain
      httpOnly: true,
      sameSite: 'none', // Always use 'none' for cross-domain cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: undefined, // Let the browser handle domain
    },
    name: 'traveon.sid', // Custom session name
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialize/deserialize
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

// Signup endpoint
app.post("/auth/signup", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const existing = await storage.getUserByEmail(email);
  if (existing) return res.status(409).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await storage.upsertUser({
    id: email, // or generate a UUID
    email,
    password: hashed,
    firstName,
    lastName,
    role: "user",
  });

  req.login(user, (err) => {
    if (err) return res.status(500).json({ message: "Login failed" });
    return res.json({ user });
  });
});

// Update local strategy for email/password
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password)
          return done(null, false, { message: "Invalid credentials" });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
          return done(null, false, { message: "Invalid credentials" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: `${
        process.env.BACKEND_URL || "http://localhost:5000"
      }/auth/google/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        // Upsert user by Google profile
        const upsertData: UpsertUser = {
          id: profile.id,
          email: profile.emails?.[0]?.value || "",
          password: null, // Explicitly set password to null for Google users
          firstName: profile.name?.givenName || "",
          lastName: profile.name?.familyName || "",
          profileImageUrl: profile.photos?.[0]?.value || "",
          isEmailVerified: profile.emails?.[0]?.verified || false,
          role: "user",
        };
        const user = await storage.upsertUser(upsertData);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Auth routes
app.post("/auth/login", passport.authenticate("local"), (req, res) => {
  res.json({ message: "Logged in", user: req.user });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
  async (req, res) => {
    // Log authentication status for debugging
    console.log('Google OAuth callback - User authenticated:', req.isAuthenticated());
    console.log('Google OAuth callback - User:', req.user);
    console.log('Google OAuth callback - Session ID:', req.sessionID);
    
    if (req.isAuthenticated() && req.user) {
      try {
        // Generate token directly in the callback
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        // Get the activeTokens map from routes (we'll need to move this to a shared location)
        // For now, we'll create a simple token storage here
        const activeTokens = (global as any).activeTokens || new Map();
        (global as any).activeTokens = activeTokens;
        
        // Store token
        activeTokens.set(token, {
          userId: (req.user as any).id,
          expires
        });
        
        console.log('Token generated for OAuth user:', token);
        
        // Force session save before redirect
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.redirect(process.env.FRONTEND_URL || "http://localhost:5173");
          }
          
          console.log('Session saved successfully');
          
          // Successful authentication - redirect to frontend with token
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
          res.redirect(`${frontendUrl}?auth=success&token=${token}`);
        });
      } catch (error) {
        console.error('Error generating token in OAuth callback:', error);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}?auth=error`);
      }
    } else {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(`${frontendUrl}?auth=error`);
    }
  }
);

app.get("/auth/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Middleware to protect routes
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Add authentication info for auth-related endpoints
      if (path.includes("/auth/")) {
        const isAuth = req.isAuthenticated ? req.isAuthenticated() : false;
        const userId = (req.user as any)?.id || "none";
        logLine += ` [Auth: ${isAuth}, User: ${userId}]`;
      }

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Register API routes
app.use("/api", registerRoutes());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error("Error:", err);
  res.status(status).json({ message });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});
