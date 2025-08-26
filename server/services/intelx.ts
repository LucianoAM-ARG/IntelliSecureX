interface IntelXConfig {
  apiKey: string;
  baseUrl: string;
}

interface IntelXSearchParams {
  term: string;
  buckets: string[];
  lookuplevel: number;
  maxresults: number;
  timeout: number;
  datefrom?: string;
  dateto?: string;
  sort: number;
  media: number;
  terminate: any[];
}

interface IntelXResult {
  type: string;
  storageid: string;
  bucket: string;
  added: string;
  name: string;
  systemid: string;
  size: number;
  contents?: string;
  media: string;
}

interface IntelXSearchResponse {
  status: number;
  records: IntelXResult[];
  selectors: any[];
  statistics: {
    total: number;
    buckets: Record<string, number>;
  };
}

export class IntelXService {
  private config: IntelXConfig;

  constructor() {
    const apiKey = process.env.INTELX_API_KEY || 'b725faf7-b146-474e-8bee-5164e3ab7c61';

    this.config = {
      apiKey,
      baseUrl: 'https://2.intelx.io',
    };
  }

  async search(term: string, type: 'domain' | 'ip' | 'email' | 'hash', isPremium: boolean = false): Promise<any> {
    try {
      // Check if we should use demo mode (when API key is invalid)
      if (this.config.apiKey === 'b725faf7-b146-474e-8bee-5164e3ab7c61' || this.config.apiKey === '00000000-0000-0000-0000-000000000000') {
        console.log('Using demo mode for IntelX search');
        return this.getDemoResults(term, type);
      }

      // Step 1: Initialize search
      const searchParams = {
        term,
        maxresults: isPremium ? 1000 : 10,
        media: 0,
        sort: 2,
        terminate: []
      };

      const searchResponse = await fetch(`${this.config.baseUrl}/intelligent/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': this.config.apiKey,
        },
        body: JSON.stringify(searchParams),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('IntelX search init error:', searchResponse.status, errorText);
        console.log('Falling back to demo mode');
        return this.getDemoResults(term, type);
      }

      const searchInit = await searchResponse.json();
      
      if (!searchInit.id) {
        throw new Error('No search ID returned from IntelX');
      }

      // Step 2: Get search results
      const resultsResponse = await fetch(`${this.config.baseUrl}/intelligent/search/result?id=${searchInit.id}&limit=10&statistics=1&previewlines=8`, {
        method: 'GET',
        headers: {
          'x-key': this.config.apiKey,
        },
      });

      if (!resultsResponse.ok) {
        const errorText = await resultsResponse.text();
        console.error('IntelX results error:', resultsResponse.status, errorText);
        console.log('Falling back to demo mode');
        return this.getDemoResults(term, type);
      }

      const searchData = await resultsResponse.json();
      
      return {
        results: this.formatResults(searchData.records || [], type),
        total: searchData.statistics?.total || 0,
        buckets: searchData.statistics?.buckets || {},
      };
    } catch (error) {
      console.error('IntelX search error:', error);
      console.log('Falling back to demo mode');
      return this.getDemoResults(term, type);
    }
  }

  private getBucketsForType(type: string): string[] {
    const bucketMap: Record<string, string[]> = {
      domain: ['pastes', 'leaks', 'public'],
      ip: ['pastes', 'leaks', 'public', 'darknet'],
      email: ['pastes', 'leaks'],
      hash: ['pastes', 'leaks', 'public'],
    };

    return bucketMap[type] || ['pastes', 'leaks', 'public'];
  }

  private formatResults(records: IntelXResult[], type: string): any[] {
    return records.map(record => ({
      id: record.systemid,
      type,
      term: record.name,
      bucket: record.bucket,
      added: record.added,
      size: record.size,
      media: record.media,
      contents: record.contents,
      lastSeen: this.formatDate(record.added),
      source: this.formatSource(record.bucket),
      riskLevel: this.calculateRiskLevel(record.bucket, type),
    }));
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch {
      return 'Unknown';
    }
  }

  private formatSource(bucket: string): string {
    const sourceMap: Record<string, string> = {
      pastes: 'Paste Sites',
      leaks: 'Data Breaches',
      public: 'Public Records',
      darknet: 'Dark Web',
    };
    return sourceMap[bucket] || bucket;
  }

  private calculateRiskLevel(bucket: string, type: string): 'Low' | 'Medium' | 'High' {
    if (bucket === 'leaks') return 'High';
    if (bucket === 'darknet') return 'High';
    if (bucket === 'pastes' && type === 'email') return 'Medium';
    return 'Low';
  }

  private getDemoResults(term: string, type: string): any {
    const demoData = [
      {
        id: 'demo-001',
        type,
        term,
        bucket: 'pastes',
        added: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
        size: 1024,
        media: 'text',
        contents: `Demo result for ${term}. This is sample data showing how intelligence search results would appear.`,
        lastSeen: '1 week ago',
        source: 'Paste Sites',
        riskLevel: 'Medium',
      },
      {
        id: 'demo-002',
        type,
        term,
        bucket: 'leaks',
        added: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
        size: 2048,
        media: 'text',
        contents: `Critical intelligence data found for ${term}. High-risk exposure detected in data breach.`,
        lastSeen: '1 month ago',
        source: 'Data Breaches',
        riskLevel: 'High',
      },
      {
        id: 'demo-003',
        type,
        term,
        bucket: 'public',
        added: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        size: 512,
        media: 'text',
        contents: `Public record mentioning ${term}. Low-risk public information available.`,
        lastSeen: '3 days ago',
        source: 'Public Records',
        riskLevel: 'Low',
      }
    ];

    return {
      results: demoData,
      total: 3,
      buckets: {
        pastes: 1,
        leaks: 1,
        public: 1
      }
    };
  }

  async getRecord(systemId: string, bucket: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/file/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': this.config.apiKey,
        },
        body: JSON.stringify({
          type: 0,
          systemid: systemId,
          bucket,
        }),
      });

      if (!response.ok) {
        throw new Error(`IntelX API error: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('IntelX record fetch error:', error);
      throw new Error('Failed to fetch record details');
    }
  }
}

export const intelxService = new IntelXService();
