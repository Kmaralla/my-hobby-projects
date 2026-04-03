import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { supabaseAdminClient, hasSupabaseServerAuth } from "./supabase";

// Extend Express Request to include session
declare module "express-session" {
  interface SessionData {
    userId?: string;
    username?: string;
    isAdmin?: boolean;
  }
}

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: any) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(req: Request, res: Response, next: any) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}

/**
 * Register authentication routes
 */
export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/providers", (_req: Request, res: Response) => {
    res.json({
      supabase: hasSupabaseServerAuth,
      local: true,
    });
  });

  // User registration
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Create user (for now, password is optional - we'll add proper auth later)
      const user = await storage.createUser({
        username,
        credits: 0,
        streak: 0,
        totalCorrect: 0,
        totalAnswered: 0,
        currentLevel: "beginner",
      });

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = false;

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          credits: user.credits,
          streak: user.streak,
          currentLevel: user.currentLevel,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // User login (simple username-based for now)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      // Find or create user
      let user = await storage.getUserByUsername(username);
      if (!user) {
        // Auto-create user if doesn't exist (backward compatibility)
        user = await storage.createUser({
          username,
          credits: 0,
          streak: 0,
          totalCorrect: 0,
          totalAnswered: 0,
          currentLevel: "beginner",
        });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = false;

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          credits: user.credits,
          streak: user.streak,
          currentLevel: user.currentLevel,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Supabase token login (recommended for Vercel + Supabase deployment)
  app.post("/api/auth/supabase-login", async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body as { accessToken?: string };

      if (!accessToken) {
        return res.status(400).json({ error: "accessToken is required" });
      }

      if (!supabaseAdminClient) {
        return res.status(400).json({
          error:
            "Supabase server auth is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        });
      }

      const { data, error } = await supabaseAdminClient.auth.getUser(accessToken);
      if (error || !data.user) {
        return res.status(401).json({ error: "Invalid Supabase token" });
      }

      const supabaseUser = data.user;
      const userId = supabaseUser.id;
      const preferredUsername =
        (supabaseUser.user_metadata?.full_name as string | undefined)?.trim() ||
        (supabaseUser.email ? supabaseUser.email.split("@")[0] : undefined) ||
        `user-${userId.slice(0, 8)}`;

      let appUser = await storage.getUser(userId);
      if (!appUser) {
        const existingByName = await storage.getUserByUsername(preferredUsername);
        const safeUsername = existingByName
          ? `${preferredUsername}-${userId.slice(0, 6)}`
          : preferredUsername;

        await db.insert(users).values({
          id: userId,
          username: safeUsername,
          credits: 0,
          streak: 0,
          totalCorrect: 0,
          totalAnswered: 0,
          currentLevel: "beginner",
          startDate: new Date(),
        });
        appUser = await storage.getUser(userId);
      }

      if (!appUser) {
        return res.status(500).json({ error: "Failed to create local user profile" });
      }

      req.session.userId = appUser.id;
      req.session.username = appUser.username;
      req.session.isAdmin = false;

      return res.json({
        success: true,
        user: {
          id: appUser.id,
          username: appUser.username,
          credits: appUser.credits,
          streak: appUser.streak,
          currentLevel: appUser.currentLevel,
        },
      });
    } catch (error: any) {
      console.error("Supabase login error:", error);
      return res.status(500).json({ error: "Supabase login failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        credits: user.credits,
        streak: user.streak,
        currentLevel: user.currentLevel,
        totalCorrect: user.totalCorrect,
        totalAnswered: user.totalAnswered,
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}
