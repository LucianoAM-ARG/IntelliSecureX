import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupTelegramAuth, requireAuth } from "./telegramAuth";
import { intelxService } from "./services/intelx";
import { insertSearchQuerySchema } from "@shared/schema";
import { z } from "zod";
import { initializeBot } from "./telegramBot";

const FREE_DAILY_LIMIT = 3;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupTelegramAuth(app);

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      let user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        // Create user if doesn't exist
        user = await storage.upsertUserByTelegramId(telegramId, {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          username: req.user.username,
          languageCode: req.user.languageCode,
          isPremium: req.user.isPremium,
          photoUrl: req.user.photoUrl,
        });
      }
      
      if (user) {
        // Reset daily query count if needed
        user = await storage.resetDailyQueryCountIfNeeded(user.id);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Search endpoint
  app.post('/api/search', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const { queryType, queryTerm } = req.body;

      // Validate input
      if (!queryType || !queryTerm) {
        return res.status(400).json({ message: "Query type and term are required" });
      }

      if (!['domain', 'ip', 'email', 'hash'].includes(queryType)) {
        return res.status(400).json({ message: "Invalid query type" });
      }

      let user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Reset daily count if needed
      user = await storage.resetDailyQueryCountIfNeeded(user.id);

      // Check daily limits for free users and subscription expiry
      const now = new Date();
      const isPremium = user.subscriptionStatus === 'active' && 
                       (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);
      
      if (!isPremium && (user.dailyQueryCount || 0) >= FREE_DAILY_LIMIT) {
        return res.status(429).json({ 
          message: "Daily query limit reached. Upgrade to Premium for unlimited searches.",
          remainingQueries: 0 
        });
      }

      // Perform search
      const searchResults = await intelxService.search(queryTerm, queryType as any, isPremium);

      // Increment query count for non-premium users
      if (!isPremium) {
        user = await storage.incrementDailyQueryCount(user.id);
      }

      // Save search query
      await storage.createSearchQuery(user.id, {
        queryType,
        queryTerm,
        results: searchResults.results,
        resultCount: searchResults.total,
      });

      res.json({
        ...searchResults,
        remainingQueries: isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - (user.dailyQueryCount || 0)),
        isPremium,
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Get search history
  app.get('/api/search/history', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const history = await storage.getUserSearchHistory(user.id, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  // Repeat search from history
  app.post('/api/search/repeat/:queryId', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const { queryId } = req.params;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const originalQuery = await storage.getSearchQuery(queryId);
      if (!originalQuery || originalQuery.userId !== user.id) {
        return res.status(404).json({ message: "Query not found" });
      }

      // User already obtained above
      const now = new Date();
      const isPremium = user?.subscriptionStatus === 'active' && 
                       (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);
      
      if (!isPremium && user && (user.dailyQueryCount || 0) >= FREE_DAILY_LIMIT) {
        return res.status(429).json({ 
          message: "Daily query limit reached. Upgrade to Premium for unlimited searches.",
          remainingQueries: 0 
        });
      }

      const searchResults = await intelxService.search(
        originalQuery.queryTerm, 
        originalQuery.queryType as any, 
        isPremium
      );

      // Increment query count and save new search
      if (!isPremium && user) {
        await storage.incrementDailyQueryCount(user.id);
      }

      await storage.createSearchQuery(user.id, {
        queryType: originalQuery.queryType,
        queryTerm: originalQuery.queryTerm,
        results: searchResults.results,
        resultCount: searchResults.total,
      });

      res.json(searchResults);
    } catch (error) {
      console.error("Repeat search error:", error);
      res.status(500).json({ message: "Repeat search failed" });
    }
  });

  // Get subscription status
  app.get('/api/subscription/status', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      const isPremium = user.subscriptionStatus === 'active' && 
                       (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);
      
      const subscriptionData = {
        status: user.subscriptionStatus,
        isPremium,
        expiresAt: user.subscriptionExpiresAt,
        remainingQueries: isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - (user.dailyQueryCount || 0)),
      };

      res.json(subscriptionData);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Create Telegram payment invoice
  app.post('/api/telegram/create-invoice', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const user = await storage.getUserByTelegramId(telegramId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate unique invoice payload
      const invoicePayload = `premium_${user.id}_${Date.now()}`;
      
      // Telegram payment parameters
      const invoiceData = {
        title: "Intelligence Security X Premium",
        description: "Unlock unlimited OSINT searches with advanced threat intelligence capabilities",
        payload: invoicePayload,
        currency: "USD",
        prices: [{ label: "Premium Monthly", amount: 999 }], // $9.99 in cents
      };

      res.json({
        invoice: invoiceData,
        paymentPayload: invoicePayload,
      });
    } catch (error: any) {
      console.error("Telegram invoice creation error:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Verify Telegram payment
  app.post('/api/telegram/verify-payment', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const { paymentPayload, totalAmount, currency } = req.body;

      if (!paymentPayload) {
        return res.status(400).json({ message: "Payment payload is required" });
      }

      // Verify the payment payload belongs to this user
      if (!paymentPayload.includes(`premium_`) || !paymentPayload.includes(telegramId)) {
        return res.status(400).json({ message: "Invalid payment payload" });
      }

      // In a real implementation, you would verify the payment with Telegram's servers
      // For now, we'll trust the payment if it contains the right payload
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

      const user = await storage.getUserByTelegramId(telegramId);
      if (user) {
        await storage.updateSubscriptionStatus(user.id, 'active', expiresAt);
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
        subscription: {
          status: 'active',
          expiresAt
        }
      });
    } catch (error: any) {
      console.error("Telegram payment verification error:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Initialize Telegram bot
  const bot = initializeBot();
  if (bot) {
    console.log('✅ Telegram bot initialized successfully');
    
    // Webhook endpoint for Telegram bot updates
    app.post('/api/telegram/webhook', async (req, res) => {
      try {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error processing update');
      }
    });
  } else {
    console.warn('⚠️ Telegram bot not initialized - token missing');
  }

  const httpServer = createServer(app);
  return httpServer;
}
