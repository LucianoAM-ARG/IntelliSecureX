import crypto from 'crypto';

interface CoinPaymentsCreateTransactionResponse {
  error: string;
  result?: {
    amount: string;
    txn_id: string;
    address: string;
    confirms_needed: string;
    timeout: number;
    status_url: string;
    qrcode_url: string;
  };
}

interface CoinPaymentsGetTxResponse {
  error: string;
  result?: {
    time_created: number;
    time_expires: number;
    status: number;
    status_text: string;
    type: string;
    coin: string;
    amount: string;
    amountf: string;
    received: string;
    receivedf: string;
    recv_confirms: number;
    payment_address: string;
  };
}

class CoinPaymentsService {
  private readonly API_URL = 'https://www.coinpayments.net/api.php';
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly merchantId: string;
  private readonly ipnSecret: string;

  constructor() {
    this.publicKey = process.env.COINPAYMENTS_PUBLIC_KEY || '';
    this.privateKey = process.env.COINPAYMENTS_PRIVATE_KEY || '';
    this.merchantId = process.env.COINPAYMENTS_MERCHANT_ID || '';
    this.ipnSecret = process.env.COINPAYMENTS_IPN_SECRET || '';
    
    if (!this.publicKey || !this.privateKey) {
      console.warn('CoinPayments credentials not configured. Crypto payments will not work.');
    }
  }

  private generateHMAC(params: Record<string, any>): string {
    const encodedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return crypto
      .createHmac('sha512', this.privateKey)
      .update(encodedParams)
      .digest('hex');
  }

  private async makeRequest(cmd: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.publicKey || !this.privateKey) {
      throw new Error('CoinPayments credentials not configured');
    }

    const requestParams: Record<string, any> = {
      version: 1,
      cmd,
      key: this.publicKey,
      format: 'json',
      ...params
    };

    const hmac = this.generateHMAC(requestParams);
    
    const formData = new URLSearchParams();
    Object.keys(requestParams).forEach(key => {
      formData.append(key, requestParams[key].toString());
    });

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'HMAC': hmac
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`CoinPayments API error: ${response.status}`);
    }

    return await response.json();
  }

  async createTransaction(
    amount: number,
    currency1: string = 'USD',
    currency2: string = 'BTC',
    itemName: string = 'Premium Subscription',
    customData?: string
  ): Promise<CoinPaymentsCreateTransactionResponse['result']> {
    const params = {
      amount: amount.toFixed(2),
      currency1,
      currency2,
      item_name: itemName,
      item_number: `premium_${Date.now()}`,
      custom: customData || '',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/subscription/success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/subscription/cancel`
    };

    const response: CoinPaymentsCreateTransactionResponse = await this.makeRequest('create_transaction', params);
    
    if (response.error && response.error !== 'ok') {
      throw new Error(`CoinPayments error: ${response.error}`);
    }

    return response.result;
  }

  async getTransactionInfo(txnId: string): Promise<CoinPaymentsGetTxResponse['result']> {
    const response: CoinPaymentsGetTxResponse = await this.makeRequest('get_tx_info', { txnid: txnId });
    
    if (response.error && response.error !== 'ok') {
      throw new Error(`CoinPayments error: ${response.error}`);
    }

    return response.result;
  }

  async getRates(): Promise<Record<string, any>> {
    const response = await this.makeRequest('rates');
    
    if (response.error && response.error !== 'ok') {
      throw new Error(`CoinPayments error: ${response.error}`);
    }

    return response.result;
  }

  verifyIPN(headers: Record<string, string>, body: string): boolean {
    const hmac = headers['hmac'] || headers['HMAC'];
    if (!hmac) return false;

    const calculatedHmac = crypto
      .createHmac('sha512', this.ipnSecret)
      .update(body)
      .digest('hex');

    return hmac === calculatedHmac;
  }

  // Mapeo de monedas soportadas
  getSupportedCurrencies(): Record<string, string> {
    return {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum', 
      'LTC': 'Litecoin',
      'BCH': 'Bitcoin Cash',
      'DOGE': 'Dogecoin',
      'XMR': 'Monero',
      'ADA': 'Cardano',
      'DOT': 'Polkadot',
      'USDT': 'Tether',
      'USDC': 'USD Coin'
    };
  }

  isConfigured(): boolean {
    return !!(this.publicKey && this.privateKey);
  }
}

export const coinPaymentsService = new CoinPaymentsService();