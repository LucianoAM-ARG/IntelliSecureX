import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupTelegramAuth, requireAuth } from "./telegramAuth";
import { intelxService } from "./services/intelx";
import { cryptoPricingService } from "./services/cryptoPricing";
import { coinPaymentsService } from "./services/coinPayments";
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

  // Get record details
  app.get('/api/record/:recordId/:bucket', requireAuth, async (req: any, res) => {
    try {
      const { recordId, bucket } = req.params;
      
      if (!recordId || !bucket) {
        return res.status(400).json({ message: "Record ID and bucket are required" });
      }

      console.log(`Fetching record details for ID: ${recordId}, bucket: ${bucket}`);
      const recordContent = await intelxService.getRecord(recordId, bucket);
      
      res.json({
        content: recordContent,
        recordId,
        bucket
      });
    } catch (error) {
      console.error("Error fetching record:", error);
      res.status(500).json({ message: "Failed to fetch record details" });
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

  // Get crypto prices
  app.get('/api/crypto/prices', requireAuth, async (req: any, res) => {
    try {
      if (coinPaymentsService.isConfigured()) {
        // Use CoinPayments for real rates
        const rates = await coinPaymentsService.getRates();
        const supportedCurrencies = coinPaymentsService.getSupportedCurrencies();
        
        const prices = Object.keys(supportedCurrencies).map(symbol => {
          const rateKey = Object.keys(rates).find(key => key.startsWith(`USD/${symbol}`));
          const rate = rateKey ? rates[rateKey] : null;
          
          return {
            id: symbol.toLowerCase(),
            name: supportedCurrencies[symbol],
            symbol: symbol,
            icon: symbol.toLowerCase(),
            priceUsd: rate ? 1 / parseFloat(rate.rate_btc) * rates['USD/BTC']?.rate_btc || 50000 : 1000,
            available: !!rate
          };
        }).filter(price => price.available);
        
        res.json(prices);
      } else {
        // Fallback to original service
        const prices = await cryptoPricingService.getCryptoPrices();
        res.json(prices);
      }
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      // Fallback to original service on error
      try {
        const prices = await cryptoPricingService.getCryptoPrices();
        res.json(prices);
      } catch (fallbackError) {
        res.status(500).json({ message: 'Failed to fetch crypto prices' });
      }
    }
  });

  // Create crypto payment
  app.post('/api/crypto/create-payment', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const { cryptoType } = req.body;
      
      if (!cryptoType) {
        return res.status(400).json({ message: 'Crypto type is required' });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const premiumPriceUsd = 29; // $29 USD

      if (coinPaymentsService.isConfigured()) {
        // Use CoinPayments for real transaction
        const transaction = await coinPaymentsService.createTransaction(
          premiumPriceUsd,
          'USD',
          cryptoType.toUpperCase(),
          'Intelligence Security X Premium Subscription',
          `user_${user.id}_premium_${Date.now()}`
        );

        if (!transaction) {
          throw new Error('Failed to create transaction with CoinPayments');
        }

        // Store payment record with CoinPayments transaction ID
        const expiresAt = new Date(Date.now() + transaction.timeout * 1000);
        
        const payment = await storage.createCryptoPayment({
          userId: user.id,
          cryptoType: cryptoType.toUpperCase(),
          amountUsd: premiumPriceUsd * 100, // Store in cents
          cryptoAmount: transaction.amount,
          paymentAddress: transaction.address,
          status: 'pending',
          expiresAt,
          transactionHash: transaction.txn_id, // Store CoinPayments txn_id
        });

        res.json({
          paymentId: payment.id,
          cryptoType: cryptoType.toUpperCase(),
          cryptoName: coinPaymentsService.getSupportedCurrencies()[cryptoType.toUpperCase()],
          cryptoSymbol: cryptoType.toUpperCase(),
          cryptoAmount: transaction.amount,
          usdAmount: premiumPriceUsd,
          paymentAddress: transaction.address,
          expiresAt,
          qrCodeUrl: transaction.qrcode_url,
          statusUrl: transaction.status_url,
          confirmsNeeded: transaction.confirms_needed,
          coinPaymentsTxnId: transaction.txn_id
        });
      } else {
        // Fallback to original system
        const cryptoPrices = await cryptoPricingService.getCryptoPrices();
        const selectedCrypto = cryptoPrices.find(crypto => crypto.id === cryptoType);
        
        if (!selectedCrypto) {
          return res.status(400).json({ message: 'Invalid crypto type' });
        }

        const cryptoAmount = cryptoPricingService.calculateCryptoAmount(cryptoType, selectedCrypto.priceUsd);
        const formattedAmount = cryptoPricingService.formatCryptoAmount(cryptoAmount, selectedCrypto.symbol);
        
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const paymentAddress = cryptoPricingService.generatePaymentAddress(cryptoType);
        
        const payment = await storage.createCryptoPayment({
          userId: user.id,
          cryptoType: selectedCrypto.id,
          amountUsd: premiumPriceUsd * 100,
          cryptoAmount: formattedAmount,
          paymentAddress,
          status: 'pending',
          expiresAt,
        });

        res.json({
          paymentId: payment.id,
          cryptoType: selectedCrypto.id,
          cryptoName: selectedCrypto.name,
          cryptoSymbol: selectedCrypto.symbol,
          cryptoAmount: formattedAmount,
          usdAmount: premiumPriceUsd,
          paymentAddress,
          expiresAt,
        });
      }
    } catch (error: any) {
      console.error('Crypto payment creation error:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Verify crypto payment
  app.post('/api/crypto/verify-payment', requireAuth, async (req: any, res) => {
    try {
      const telegramId = req.user.telegramId;
      const { paymentId, txHash } = req.body;

      if (!paymentId) {
        return res.status(400).json({ message: 'Payment ID is required' });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const payment = await storage.getCryptoPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (payment.userId !== user.id) {
        return res.status(403).json({ message: 'Payment does not belong to user' });
      }

      if (payment.status === 'confirmed') {
        return res.status(400).json({ message: 'Payment already confirmed' });
      }

      if (new Date() > payment.expiresAt) {
        await storage.updateCryptoPaymentStatus(paymentId, 'expired');
        return res.status(400).json({ message: 'Payment has expired' });
      }

      if (coinPaymentsService.isConfigured() && payment.transactionHash) {
        // Use CoinPayments to verify transaction status
        try {
          const txInfo = await coinPaymentsService.getTransactionInfo(payment.transactionHash);
          
          // CoinPayments status codes:
          // -1 = Cancelled / Timed Out
          // 0 = Waiting for buyer funds
          // 1 = We have confirmed coin reception from the buyer
          // 2 = Queued for nightly payout (if you have the 'payout_mode' for the coin set to 'nightly')
          // 100 = Payment Complete
          
          if (txInfo.status >= 1) {
            // Payment received and confirmed
            await storage.updateCryptoPaymentStatus(paymentId, 'confirmed', payment.transactionHash);
            
            // Update user subscription
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            await storage.updateSubscriptionStatus(user.id, 'active', expiresAt);

            res.json({ 
              success: true, 
              message: 'Payment verified successfully',
              subscriptionExpiresAt: expiresAt,
              status: txInfo.status_text,
              received: txInfo.receivedf
            });
          } else if (txInfo.status === -1) {
            // Payment cancelled or timed out
            await storage.updateCryptoPaymentStatus(paymentId, 'expired');
            res.status(400).json({ message: 'Payment was cancelled or timed out' });
          } else {
            // Still waiting for payment
            res.json({ 
              success: false, 
              message: 'Payment not yet received',
              status: txInfo.status_text,
              received: txInfo.receivedf,
              required: txInfo.amountf
            });
          }
        } catch (error) {
          console.error('CoinPayments verification error:', error);
          res.status(500).json({ message: 'Failed to verify payment with CoinPayments' });
        }
      } else {
        // Fallback verification (manual transaction hash)
        if (!txHash || txHash.length < 10) {
          return res.status(400).json({ message: 'Transaction hash is required for manual verification' });
        }

        // Update payment status
        await storage.updateCryptoPaymentStatus(paymentId, 'confirmed', txHash);
        
        // Update user subscription
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await storage.updateSubscriptionStatus(user.id, 'active', expiresAt);

        res.json({ 
          success: true, 
          message: 'Payment verified successfully',
          subscriptionExpiresAt: expiresAt 
        });
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // CoinPayments IPN (Instant Payment Notification) webhook
  app.post('/api/crypto/coinpayments-ipn', async (req, res) => {
    try {
      const body = JSON.stringify(req.body);
      const isValid = coinPaymentsService.verifyIPN(req.headers as Record<string, string>, body);
      
      if (!isValid) {
        console.error('Invalid CoinPayments IPN signature');
        return res.status(400).json({ message: 'Invalid IPN signature' });
      }

      const { txn_id, status, status_text, custom } = req.body;
      
      if (status >= 1) {
        // Payment confirmed, find and update payment record
        const payment = await storage.getCryptoPaymentByTxnId(txn_id);
        
        if (payment && payment.status === 'pending') {
          await storage.updateCryptoPaymentStatus(payment.id, 'confirmed', txn_id);
          
          // Update user subscription
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
          await storage.updateSubscriptionStatus(payment.userId, 'active', expiresAt);
          
          console.log(`Payment ${payment.id} confirmed via IPN: ${status_text}`);
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('CoinPayments IPN error:', error);
      res.status(500).json({ message: 'IPN processing failed' });
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
