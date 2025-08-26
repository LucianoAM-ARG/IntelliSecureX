import { HttpsProxyAgent } from 'https-proxy-agent';

interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  auth?: {
    username: string;
    password: string;
  };
}

export class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private currentProxyIndex = 0;
  private lastRotation = 0;
  private rotationInterval = 5 * 60 * 1000; // Rotar cada 5 minutos

  constructor() {
    this.initializeProxies();
  }

  private initializeProxies() {
    // Lista de proxies gratuitos públicos (estos cambian frecuentemente)
    this.proxies = [
      { host: '47.74.152.29', port: 8888, protocol: 'http' },
      { host: '43.134.234.74', port: 80, protocol: 'http' },
      { host: '103.149.162.194', port: 80, protocol: 'http' },
      { host: '20.206.106.192', port: 80, protocol: 'http' },
      { host: '85.8.68.2', port: 80, protocol: 'http' },
      { host: '109.201.152.72', port: 80, protocol: 'http' },
      { host: '177.124.168.81', port: 8080, protocol: 'http' },
      { host: '195.23.57.78', port: 80, protocol: 'http' },
      { host: '52.79.149.164', port: 80, protocol: 'http' },
      { host: '165.225.77.47', port: 80, protocol: 'http' },
    ];
  }

  private rotateProxy() {
    const now = Date.now();
    if (now - this.lastRotation > this.rotationInterval) {
      this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
      this.lastRotation = now;
      console.log(`Rotated to proxy ${this.currentProxyIndex + 1}/${this.proxies.length}`);
    }
  }

  getCurrentProxy(): ProxyConfig | null {
    this.rotateProxy();
    return this.proxies[this.currentProxyIndex] || null;
  }

  createProxyAgent(): HttpsProxyAgent<string> | null {
    const proxy = this.getCurrentProxy();
    if (!proxy) return null;

    try {
      const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
      console.log(`Using proxy: ${proxyUrl}`);
      return new HttpsProxyAgent(proxyUrl);
    } catch (error) {
      console.error('Error creating proxy agent:', error);
      return null;
    }
  }

  async testProxy(proxy: ProxyConfig): Promise<boolean> {
    try {
      const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
      const agent = new HttpsProxyAgent(proxyUrl);
      
      const response = await fetch('https://httpbin.org/ip', {
        // @ts-ignore
        agent,
        // @ts-ignore
        timeout: 5000,
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async refreshProxies() {
    console.log('Refreshing proxy list...');
    // Aquí podrías implementar lógica para obtener proxies de APIs públicas
    // Por ahora mantenemos la lista estática
    this.initializeProxies();
  }

  forceRotate() {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    console.log(`Force rotated to proxy ${this.currentProxyIndex + 1}/${this.proxies.length}`);
  }
}

export const proxyManager = new ProxyManager();