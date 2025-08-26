import { proxyManager } from './proxyManager';

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
    // Use the free API key specifically for free.intelx.io
    const apiKey = 'b725faf7-b146-474e-8bee-5164e3ab7c61';

    this.config = {
      apiKey,
      baseUrl: 'https://free.intelx.io',
    };
  }

  async search(term: string, type: 'domain' | 'ip' | 'email' | 'hash', isPremium: boolean = false): Promise<any> {
    try {
      // Step 1: Initialize search (simplified for free API)
      const searchParams = {
        term,
        lookuplevel: 0,
        maxresults: 1000,
        timeout: null,
        datefrom: "",
        dateto: "",
        sort: 2,
        media: 0,
        terminate: []
      };

      console.log(`Searching IntelX for ${type}: ${term}`);

      const proxyAgent = proxyManager.createProxyAgent();
      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'accept-language': 'es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': 'https://intelx.io',
          'referer': 'https://intelx.io/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          'x-key': this.config.apiKey,
        },
        body: JSON.stringify(searchParams),
      };

      if (proxyAgent) {
        fetchOptions.agent = proxyAgent;
      }

      const searchResponse = await fetch(`${this.config.baseUrl}/intelligent/search`, fetchOptions);

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('IntelX search init error:', searchResponse.status, errorText);
        
        // Si hay error, rotar proxy para el próximo intento
        if (searchResponse.status === 429 || searchResponse.status === 403) {
          console.log('Rate limited, forcing proxy rotation');
          proxyManager.forceRotate();
        }
        
        throw new Error(`IntelX API error: ${searchResponse.status} - ${errorText}`);
      }

      const searchInit = await searchResponse.json();
      console.log('Search initialized with ID:', searchInit.id);
      
      if (!searchInit.id) {
        throw new Error('No search ID returned from IntelX');
      }

      // Step 2: Get search results (usando el mismo proxy)
      const resultsOptions: any = {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'origin': 'https://intelx.io',
          'referer': 'https://intelx.io/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          'x-key': this.config.apiKey,
        },
      };

      if (proxyAgent) {
        resultsOptions.agent = proxyAgent;
      }

      const resultsResponse = await fetch(`${this.config.baseUrl}/intelligent/search/result?id=${searchInit.id}&limit=10&statistics=1&previewlines=20`, resultsOptions);

      if (!resultsResponse.ok) {
        const errorText = await resultsResponse.text();
        console.error('IntelX results error:', resultsResponse.status, errorText);
        throw new Error(`IntelX API error: ${resultsResponse.status} - ${errorText}`);
      }

      const searchData = await resultsResponse.json();
      console.log(`Found ${searchData.records?.length || 0} records`);
      console.log('Search response data:', JSON.stringify(searchData, null, 2));
      
      console.log('About to call formatResultsWithPreviews...');
      try {
        const formattedResults = await this.formatResultsWithPreviews(searchData.records || [], type);
        console.log('formatResultsWithPreviews completed successfully');
        console.log('Formatted results:', JSON.stringify(formattedResults.slice(0, 2), null, 2));
        
        return {
          results: formattedResults,
          total: searchData.statistics?.total || searchData.records?.length || 0,
          buckets: searchData.statistics?.buckets || {},
        };
      } catch (previewError) {
        console.error('Error in formatResultsWithPreviews, falling back to basic format:', previewError);
        const formattedResults = this.formatResults(searchData.records || [], type);
        console.log('Fallback formatted results:', JSON.stringify(formattedResults.slice(0, 2), null, 2));
        
        return {
          results: formattedResults,
          total: searchData.statistics?.total || searchData.records?.length || 0,
          buckets: searchData.statistics?.buckets || {},
        };
      }
    } catch (error) {
      console.error('IntelX search error:', error);
      throw error;
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

  private async formatResultsWithPreviews(records: IntelXResult[], type: string): Promise<any[]> {
    // Process only first few records to get previews quickly
    const recordsToProcess = records.slice(0, 3); // Only get previews for first 3 results
    const results = [];
    
    console.log(`Getting previews for ${recordsToProcess.length} records`);
    
    for (const record of recordsToProcess) {
      let preview = this.extractPreview(record.contents || '');
      
      // Always try to get actual content preview if no contents
      if (!record.contents || record.contents.trim().length === 0) {
        try {
          console.log(`Fetching preview for ${record.name}`);
          const previewContent = await this.getFilePreview(record.storageid || record.systemid, record.bucket, parseInt(record.media) || 24);
          if (previewContent && previewContent.trim().length > 0) {
            preview = previewContent.substring(0, 300).trim() + (previewContent.length > 300 ? '\n\n[...continúa]' : '');
            console.log(`Got preview for ${record.name}: ${preview.substring(0, 50)}...`);
          }
        } catch (error) {
          console.log(`Could not fetch preview for ${record.systemid}:`, error);
        }
      }
      
      results.push({
        id: record.systemid,
        storageId: record.storageid || record.systemid,
        type,
        term: record.name,
        bucket: record.bucket,
        added: record.added,
        size: record.size,
        media: record.media,
        contents: record.contents,
        preview,
        lastSeen: this.formatDate(record.added),
        source: this.formatSource(record.bucket),
        riskLevel: this.calculateRiskLevel(record.bucket, type),
      });
    }
    
    // Add remaining records without preview fetching
    for (const record of records.slice(3)) {
      results.push({
        id: record.systemid,
        storageId: record.storageid || record.systemid,
        type,
        term: record.name,
        bucket: record.bucket,
        added: record.added,
        size: record.size,
        media: record.media,
        contents: record.contents,
        preview: this.extractPreview(record.contents || ''),
        lastSeen: this.formatDate(record.added),
        source: this.formatSource(record.bucket),
        riskLevel: this.calculateRiskLevel(record.bucket, type),
      });
    }
    
    return results;
  }

  private formatResults(records: IntelXResult[], type: string): any[] {
    return records.map(record => ({
      id: record.systemid,
      storageId: record.storageid || record.systemid,
      type,
      term: record.name,
      bucket: record.bucket,
      added: record.added,
      size: record.size,
      media: record.media,
      contents: record.contents,
      preview: this.extractPreview(record.contents || ''),
      lastSeen: this.formatDate(record.added),
      source: this.formatSource(record.bucket),
      riskLevel: this.calculateRiskLevel(record.bucket, type),
    }));
  }

  private extractPreview(content: string): string {
    if (!content || content.trim().length === 0) {
      return 'Vista previa no disponible - haz clic para ver detalles';
    }
    
    // Extract first 300 characters for preview in search results
    const preview = content.substring(0, 300).trim();
    return preview + (content.length > 300 ? '\n\n[...continúa - haz clic para ver más]' : '');
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

  async getRecord(systemId: string, bucket: string): Promise<string> {
    try {
      console.log(`Getting record: systemId=${systemId}, bucket=${bucket}`);
      
      // The search results already give us the storageId in the systemId field
      // Try direct file access using the provided systemId as the storageId
      console.log(`Attempting direct file access using systemId as storageId`);
      return await this.getFileContentDirectly(systemId, bucket, 24);
      
    } catch (error) {
      console.error('IntelX record fetch error:', error);
      return `❌ Error al obtener contenido del archivo

Error: ${error instanceof Error ? error.message : 'Unknown error'}
Record ID: ${systemId}
Bucket: ${bucket}

Esto puede deberse a:
- Problemas de conectividad de red
- Limitaciones de la API
- Servidor temporalmente no disponible

Intenta nuevamente en unos momentos.`;
    }
  }

  private async getFileContentDirectly(storageId: string, bucket: string, media: number): Promise<string> {
    try {
      console.log(`Trying direct file access with storageId: ${storageId}`);
      
      const proxyAgent = proxyManager.createProxyAgent();
      
      // Use the exact format from the curl example you provided
      const filePreviewUrl = `${this.config.baseUrl}/file/preview?` +
        `sid=${storageId}&` +
        `f=0&` +
        `l=50&` + 
        `c=1&` +
        `m=${media}&` +
        `b=${bucket}&` +
        `k=${this.config.apiKey}`;
      
      console.log(`Direct file preview URL: ${filePreviewUrl}`);
      
      const fetchOptions: any = {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'origin': 'https://intelx.io',
          'referer': 'https://intelx.io/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          'x-key': this.config.apiKey,
        },
      };

      if (proxyAgent) {
        fetchOptions.agent = proxyAgent;
      }

      const previewResponse = await fetch(filePreviewUrl, fetchOptions);
      
      if (!previewResponse.ok) {
        console.error('Direct file preview error:', previewResponse.status);
        return `📄 No se pudo obtener el contenido del archivo

Error: ${previewResponse.status}
Storage ID: ${storageId}
Bucket: ${bucket}

Posibles causas:
- Archivo requiere acceso premium
- Contenido no disponible temporalmente
- Limitaciones del servidor`;
      }
      
      const previewContent = await previewResponse.text();
      console.log(`Direct preview response:`, previewContent);
      console.log(`Direct preview response length:`, previewContent.length);
      
      if (previewContent && previewContent.trim().length > 0) {
        console.log(`Successfully retrieved direct file content. Length: ${previewContent.length}`);
        return previewContent.trim();
      }
      
      return `📋 Archivo localizado pero sin contenido de vista previa

Storage ID: ${storageId}
Bucket: ${bucket}
Estado: Archivo encontrado pero contenido no disponible`;
      
    } catch (error) {
      console.error('Direct file access error:', error);
      return `❌ Error al acceder al archivo directamente

Error: ${error instanceof Error ? error.message : 'Unknown error'}
Storage ID: ${storageId}`;
    }
  }

  private async getFilePreview(storageId: string, bucket: string, media?: number): Promise<string> {
    try {
      console.log(`>>> getFilePreview called with storageId: ${storageId.substring(0, 20)}...`);
      const proxyAgent = proxyManager.createProxyAgent();
      
      // Use the file/view endpoint as shown in the curl example
      const fileViewUrl = `${this.config.baseUrl}/file/view?` +
        `f=0&` +
        `storageid=${storageId}&` +
        `bucket=${bucket}&` +
        `k=${this.config.apiKey}&` +
        `license=academia`;
      
      console.log(`>>> File view URL: ${fileViewUrl}`);
      
      const fetchOptions: any = {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'accept-language': 'es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7',
          'origin': 'https://intelx.io',
          'referer': 'https://intelx.io/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          'x-key': this.config.apiKey,
        },
      };

      if (proxyAgent) {
        fetchOptions.agent = proxyAgent;
      }

      const response = await fetch(fileViewUrl, fetchOptions);
      console.log(`>>> File view response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const content = await response.text();
      console.log(`>>> File view content length: ${content.length}, first 50 chars: ${content.substring(0, 50)}`);
      return content;
      
    } catch (error) {
      console.log(`>>> getFilePreview error: ${error}`);
      // Return empty string so the default preview message is used
      return '';
    }
  }
}

export const intelxService = new IntelXService();