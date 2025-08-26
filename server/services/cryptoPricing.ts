interface CryptoPrice {
  symbol: string;
  name: string;
  price_usd: number;
  icon: string;
}

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  priceUsd: number;
}

// Lista de criptomonedas soportadas
const SUPPORTED_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'monero', symbol: 'XMR', name: 'Monero' },
];

class CryptoPricingService {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private readonly PREMIUM_PRICE_USD = 29; // $29 USD por mes

  async getCryptoPrices(): Promise<CryptoOption[]> {
    try {
      const prices: CryptoOption[] = [];
      
      for (const crypto of SUPPORTED_CRYPTOS) {
        const price = await this.getCryptoPrice(crypto.id);
        prices.push({
          id: crypto.id,
          name: crypto.name,
          symbol: crypto.symbol,
          icon: crypto.symbol.toLowerCase(),
          priceUsd: price,
        });
      }
      
      return prices;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      // Fallback prices if API fails
      return this.getFallbackPrices();
    }
  }

  private async getCryptoPrice(cryptoId: string): Promise<number> {
    const cached = this.priceCache.get(cryptoId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      // Using CoinGecko API (free tier)
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const price = data[cryptoId]?.usd;
      
      if (typeof price !== 'number') {
        throw new Error(`Invalid price data for ${cryptoId}`);
      }
      
      this.priceCache.set(cryptoId, { price, timestamp: now });
      return price;
    } catch (error) {
      console.error(`Error fetching price for ${cryptoId}:`, error);
      return this.getFallbackPrice(cryptoId);
    }
  }

  private getFallbackPrice(cryptoId: string): number {
    const fallbackPrices: Record<string, number> = {
      'bitcoin': 45000,
      'ethereum': 2500,
      'litecoin': 150,
      'bitcoin-cash': 400,
      'dogecoin': 0.08,
      'monero': 180,
    };
    
    return fallbackPrices[cryptoId] || 1000;
  }

  private getFallbackPrices(): CryptoOption[] {
    return SUPPORTED_CRYPTOS.map(crypto => ({
      id: crypto.id,
      name: crypto.name,
      symbol: crypto.symbol,
      icon: crypto.symbol.toLowerCase(),
      priceUsd: this.getFallbackPrice(crypto.id),
    }));
  }

  calculateCryptoAmount(cryptoId: string, priceUsd: number): number {
    return this.PREMIUM_PRICE_USD / priceUsd;
  }

  formatCryptoAmount(amount: number, symbol: string): string {
    if (symbol === 'BTC' || symbol === 'LTC' || symbol === 'BCH' || symbol === 'XMR') {
      return amount.toFixed(6);
    } else if (symbol === 'ETH') {
      return amount.toFixed(4);
    } else if (symbol === 'DOGE') {
      return amount.toFixed(2);
    }
    return amount.toFixed(4);
  }

  // Generar direcciones de pago simuladas (en producción se usaría un proveedor real)
  generatePaymentAddress(cryptoType: string): string {
    const addresses: Record<string, string> = {
      'bitcoin': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'ethereum': '0x742d35Cc62F2E8AC5B8E87c5b85a1c6A0e0F0e73',
      'litecoin': 'LTC1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'bitcoin-cash': 'bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy',
      'dogecoin': 'DANHz6EQVoWyZ9rER56DwTXHWUxfkv9k2o',
      'monero': '4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRJ5C6HG7nE5JfKvNpWQYHTCbXNNQ1xjT7S6qUEJFKMhw',
    };
    
    return addresses[cryptoType] || 'address_not_found';
  }

  getPremiumPriceUsd(): number {
    return this.PREMIUM_PRICE_USD;
  }
}

export const cryptoPricingService = new CryptoPricingService();