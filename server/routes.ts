import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { intelxService } from "./services/intelx";
import { insertSearchQuerySchema } from "@shared/schema";
import { z } from "zod";

const FREE_DAILY_LIMIT = 3;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (user) {
        // Reset daily query count if needed
        user = await storage.resetDailyQueryCountIfNeeded(userId);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Search endpoint
  app.post('/api/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { queryType, queryTerm } = req.body;

      // Validate input
      if (!queryType || !queryTerm) {
        return res.status(400).json({ message: "Query type and term are required" });
      }

      if (!['domain', 'ip', 'email', 'hash'].includes(queryType)) {
        return res.status(400).json({ message: "Invalid query type" });
      }

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Reset daily count if needed
      user = await storage.resetDailyQueryCountIfNeeded(userId);

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
        user = await storage.incrementDailyQueryCount(userId);
      }

      // Save search query
      await storage.createSearchQuery(userId, {
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
  app.get('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const history = await storage.getUserSearchHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  // Repeat search from history
  app.post('/api/search/repeat/:queryId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { queryId } = req.params;
      
      const originalQuery = await storage.getSearchQuery(queryId);
      if (!originalQuery || originalQuery.userId !== userId) {
        return res.status(404).json({ message: "Query not found" });
      }

      // Perform new search with same parameters
      const user = await storage.getUser(userId);
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
        await storage.incrementDailyQueryCount(userId);
      }

      await storage.createSearchQuery(userId, {
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
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  // Generate crypto payment address
  app.post('/api/crypto/create-payment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate a unique payment address (in a real implementation, this would be generated by a crypto payment processor)
      const paymentAddress = `bc1q${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const amount = 0.001; // Amount in BTC for monthly subscription
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      res.json({
        paymentId,
        paymentAddress,
        amount,
        currency: 'BTC',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        qrCode: `bitcoin:${paymentAddress}?amount=${amount}`,
      });
    } catch (error: any) {
      console.error("Crypto payment creation error:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Verify crypto payment (mock implementation)
  app.post('/api/crypto/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { paymentId, txHash } = req.body;

      if (!paymentId || !txHash) {
        return res.status(400).json({ message: "Payment ID and transaction hash are required" });
      }

      // In a real implementation, this would verify the transaction on the blockchain
      // For demo purposes, we'll accept any transaction hash that looks valid
      if (txHash.length >= 32) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

        await storage.updateSubscriptionStatus(userId, 'active', expiresAt);
        await storage.updateUserCryptoInfo(userId, txHash);

        res.json({
          success: true,
          message: "Payment verified successfully",
          subscription: {
            status: 'active',
            expiresAt
          }
        });
      } else {
        res.status(400).json({ message: "Invalid transaction hash" });
      }
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
