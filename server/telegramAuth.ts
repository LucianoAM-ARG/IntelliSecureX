import { createHash, createHmac } from 'crypto';
import type { Express, RequestHandler } from "express";

// Extend Express Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        telegramId: string;
        firstName: string;
        lastName?: string;
        username?: string;
        languageCode?: string;
        isPremium?: boolean;
        photoUrl?: string;
      };
    }
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  user: TelegramUser;
  chat_instance?: string;
  chat_type?: string;
  auth_date: number;
  hash: string;
}

// Validate Telegram Web App init data
export function validateTelegramWebAppData(initData: string, botToken: string): TelegramWebAppInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // Create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    
    // Calculate hash
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return null;
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      return null;
    }

    const user = JSON.parse(userParam) as TelegramUser;
    const authDate = parseInt(urlParams.get('auth_date') || '0');

    // Check if data is not older than 24 hours
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return null;
    }

    return {
      user,
      chat_instance: urlParams.get('chat_instance') || undefined,
      chat_type: urlParams.get('chat_type') || undefined,
      auth_date: authDate,
      hash: hash!
    };
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return null;
  }
}

export function setupTelegramAuth(app: Express) {
  // Middleware to handle Telegram Web App authentication
  app.use('/api', (req, res, next) => {
    // Skip auth for certain endpoints
    if (req.path === '/auth/telegram' || req.path === '/health') {
      return next();
    }

    const initData = req.headers['authorization']?.replace('twa ', '') || req.query.initData as string;
    
    // Debug logging
    console.log('Auth middleware - Path:', req.path);
    console.log('Auth middleware - Init data present:', !!initData);
    console.log('Auth middleware - Init data length:', initData?.length || 0);
    
    if (!initData) {
      console.log('Auth middleware - No init data, using development fallback');
      // Development mode fallback for testing outside Telegram
      if (process.env.NODE_ENV === 'development') {
        req.user = {
          telegramId: 'dev_user_123',
          firstName: 'Dev',
          lastName: 'User', 
          username: 'devuser',
          languageCode: 'en',
          isPremium: false,
        };
        return next();
      }
      return res.status(401).json({ message: 'No Telegram data provided' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ message: 'Bot token not configured' });
    }

    const telegramData = validateTelegramWebAppData(initData, botToken);
    if (!telegramData) {
      console.log('Auth middleware - Invalid Telegram data validation failed');
      return res.status(401).json({ message: 'Invalid Telegram data' });
    }

    console.log('Auth middleware - Telegram data validated successfully:', {
      userId: telegramData.user.id,
      firstName: telegramData.user.first_name,
      username: telegramData.user.username
    });

    // Add user to request
    req.user = {
      telegramId: telegramData.user.id.toString(),
      firstName: telegramData.user.first_name,
      lastName: telegramData.user.last_name,
      username: telegramData.user.username,
      languageCode: telegramData.user.language_code,
      isPremium: telegramData.user.is_premium,
      photoUrl: telegramData.user.photo_url,
    };

    next();
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

