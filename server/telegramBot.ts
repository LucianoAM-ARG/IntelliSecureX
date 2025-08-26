import { storage } from "./storage";

interface TelegramBotConfig {
  token: string;
  webhookUrl?: string;
}

export class TelegramBot {
  private token: string;
  private baseUrl: string;

  constructor(config: TelegramBotConfig) {
    this.token = config.token;
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
  }

  // Send message to user
  async sendMessage(chatId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Set bot commands
  async setCommands() {
    const commands = [
      {
        command: "start",
        description: "🚀 Start using Intelligence Security X"
      },
      {
        command: "search",
        description: "🔍 Open OSINT search interface"
      },
      {
        command: "premium",
        description: "👑 Upgrade to Premium subscription"
      },
      {
        command: "status",
        description: "📊 Check your subscription status"
      },
      {
        command: "help",
        description: "❓ Get help and support"
      }
    ];

    try {
      const response = await fetch(`${this.baseUrl}/setMyCommands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commands }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error setting bot commands:', error);
      throw error;
    }
  }

  // Set bot menu button to launch web app
  async setMenuButton(webAppUrl: string) {
    try {
      const response = await fetch(`${this.baseUrl}/setChatMenuButton`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menu_button: {
            type: "web_app",
            text: "🔒 Open Security X",
            web_app: {
              url: webAppUrl
            }
          }
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error setting menu button:', error);
      throw error;
    }
  }

  // Handle webhook updates
  async handleUpdate(update: any) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error('Error handling update:', error);
    }
  }

  // Handle incoming messages
  private async handleMessage(message: any) {
    const chatId = message.chat.id;
    const text = message.text;
    const userId = message.from.id;

    // Create or update user in database
    await this.ensureUser(message.from);

    if (text?.startsWith('/')) {
      await this.handleCommand(chatId, text, userId);
    }
  }

  // Handle bot commands
  private async handleCommand(chatId: number, command: string, userId: number) {
    const cmd = command.split(' ')[0].toLowerCase();

    switch (cmd) {
      case '/start':
        await this.sendWelcomeMessage(chatId);
        break;
      
      case '/search':
        await this.sendSearchMessage(chatId);
        break;
      
      case '/premium':
        await this.sendPremiumMessage(chatId);
        break;
      
      case '/status':
        await this.sendStatusMessage(chatId, userId);
        break;
      
      case '/help':
        await this.sendHelpMessage(chatId);
        break;
      
      default:
        await this.sendMessage(chatId, 
          "❓ Unknown command. Use /help to see available commands."
        );
    }
  }

  // Ensure user exists in database
  private async ensureUser(telegramUser: any) {
    try {
      const existingUser = await storage.getUserByTelegramId(telegramUser.id.toString());
      
      if (!existingUser) {
        await storage.upsertUserByTelegramId(telegramUser.id.toString(), {
          username: telegramUser.username || `user_${telegramUser.id}`,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
        });
      }
    } catch (error) {
      console.error('Error ensuring user:', error);
    }
  }

  // Send welcome message
  private async sendWelcomeMessage(chatId: number) {
    const message = `
🔒 <b>Welcome to Intelligence Security X!</b>

Your professional OSINT (Open Source Intelligence) platform for advanced threat intelligence.

🔍 <b>What you can do:</b>
• Search domains, IPs, emails, and hashes
• Get detailed threat intelligence reports
• Access professional-grade security data
• Export results for analysis

🆓 <b>Free Plan:</b> 3 searches per day
👑 <b>Premium:</b> Unlimited searches + advanced features

Tap the menu button below to start your investigation!
    `;

    await this.sendMessage(chatId, message);
  }

  // Send search instructions
  private async sendSearchMessage(chatId: number) {
    const message = `
🔍 <b>OSINT Search</b>

Use the web app to perform intelligence searches:

🌐 <b>Domain Intelligence:</b> example.com
🌍 <b>IP Address Lookup:</b> 192.168.1.1  
📧 <b>Email Investigation:</b> user@domain.com
🔐 <b>Hash Analysis:</b> MD5, SHA1, SHA256

Click the menu button to open the search interface!
    `;

    await this.sendMessage(chatId, message);
  }

  // Send premium upgrade message
  private async sendPremiumMessage(chatId: number) {
    const message = `
👑 <b>Upgrade to Premium</b>

Unlock the full power of Intelligence Security X:

✅ Unlimited searches
✅ Advanced analytics
✅ Priority processing
✅ Team collaboration
✅ Export capabilities
✅ 24/7 Priority support

💰 <b>Price:</b> $9.99/month

Open the app to upgrade with Telegram Payments!
    `;

    await this.sendMessage(chatId, message);
  }

  // Send subscription status
  private async sendStatusMessage(chatId: number, userId: number) {
    try {
      const user = await storage.getUserByTelegramId(userId.toString());
      
      if (!user) {
        await this.sendMessage(chatId, "❌ User not found. Please start the bot first with /start");
        return;
      }

      const now = new Date();
      const isPremium = user.subscriptionStatus === 'active' && 
                       (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);
      
      const message = isPremium ? `
👑 <b>Premium Subscription Active</b>

🟢 Status: Active
📅 Expires: ${user.subscriptionExpiresAt?.toLocaleDateString() || 'Never'}
🔍 Searches: Unlimited
      ` : `
🆓 <b>Free Plan</b>

🟡 Status: Free
🔍 Daily searches: ${user.dailyQueryCount || 0}/3
📅 Resets: Daily at midnight

Upgrade to Premium for unlimited access!
      `;

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error getting user status:', error);
      await this.sendMessage(chatId, "❌ Error getting status. Please try again.");
    }
  }

  // Send help message
  private async sendHelpMessage(chatId: number) {
    const message = `
❓ <b>Intelligence Security X Help</b>

🤖 <b>Bot Commands:</b>
/start - Start using the platform
/search - Open search interface
/premium - Upgrade to Premium
/status - Check subscription status
/help - Show this help message

🔍 <b>Search Types:</b>
• Domain intelligence
• IP address lookup
• Email investigation
• Hash analysis (MD5, SHA1, SHA256)

💬 <b>Support:</b> Contact @YourSupportBot for assistance

🌐 <b>Web App:</b> Use the menu button for full interface
    `;

    await this.sendMessage(chatId, message);
  }

  // Handle callback queries (inline keyboard buttons)
  private async handleCallbackQuery(callbackQuery: any) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Answer the callback query to remove loading state
    await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
      }),
    });

    // Handle specific callback data
    if (data === 'upgrade_premium') {
      await this.sendPremiumMessage(chatId);
    }
  }
}

// Initialize bot if token is provided
export function initializeBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not provided. Bot features disabled.');
    return null;
  }

  const bot = new TelegramBot({ token });
  
  // Set up bot commands and menu
  bot.setCommands().catch(console.error);
  
  // Set menu button (you'll need to replace with your actual web app URL)
  const webAppUrl = process.env.REPLIT_URL || 'https://your-repl-url.replit.app';
  bot.setMenuButton(webAppUrl).catch(console.error);

  return bot;
}