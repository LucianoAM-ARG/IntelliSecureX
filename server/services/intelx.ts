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
        throw new Error(`IntelX API error: ${searchResponse.status}`);
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
        throw new Error(`IntelX API error: ${resultsResponse.status}`);
      }

      const searchData = await resultsResponse.json();
      
      return {
        results: this.formatResults(searchData.records || [], type),
        total: searchData.statistics?.total || 0,
        buckets: searchData.statistics?.buckets || {},
      };
    } catch (error) {
      console.error('IntelX search error:', error);
      throw new Error('Failed to perform IntelX search');
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
