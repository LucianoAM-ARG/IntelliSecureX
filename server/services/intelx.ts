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

      const resultsResponse = await fetch(`${this.config.baseUrl}/intelligent/search/result?id=${searchInit.id}&limit=10&statistics=1&previewlines=8`, resultsOptions);

      if (!resultsResponse.ok) {
        const errorText = await resultsResponse.text();
        console.error('IntelX results error:', resultsResponse.status, errorText);
        throw new Error(`IntelX API error: ${resultsResponse.status} - ${errorText}`);
      }

      const searchData = await resultsResponse.json();
      console.log(`Found ${searchData.records?.length || 0} records`);
      console.log('Search response data:', JSON.stringify(searchData, null, 2));
      
      const formattedResults = this.formatResults(searchData.records || [], type);
      console.log('Formatted results:', JSON.stringify(formattedResults.slice(0, 2), null, 2));
      
      return {
        results: formattedResults,
        total: searchData.statistics?.total || searchData.records?.length || 0,
        buckets: searchData.statistics?.buckets || {},
      };
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
      
      const proxyAgent = proxyManager.createProxyAgent();
      
      // First get the record to obtain the storageid
      const recordUrl = `${this.config.baseUrl}/intelligent/search/result?id=${systemId}&bucket=${bucket}&limit=1`;
      
      const fetchOptions: any = {
        method: 'GET',
        headers: {
          'x-key': this.config.apiKey,
        },
      };

      if (proxyAgent) {
        fetchOptions.agent = proxyAgent;
      }

      console.log(`Getting record details: ${recordUrl}`);
      const response = await fetch(recordUrl, fetchOptions);

      if (!response.ok) {
        console.error('Failed to get record details:', response.status);
        return `📄 No se pudo obtener el registro
        
Error: ${response.status}
Record ID: ${systemId}
Bucket: ${bucket}`;
      }

      const recordData = await response.json();
      
      if (!recordData.records || recordData.records.length === 0) {
        return `📄 No se encontró el registro
        
El archivo solicitado no se pudo localizar:
- Record ID: ${systemId}
- Bucket: ${bucket}`;
      }
      
      const record = recordData.records[0];
      const storageId = record.storageid;
      const recordType = record.type || 1;
      const media = record.media || 24;
      
      console.log(`Using file/preview with storageId: ${storageId}, type: ${recordType}, media: ${media}`);
      console.log(`Full record data:`, JSON.stringify(record, null, 2));
      
      // Try the exact format from the curl example you provided
      const filePreviewUrl = `${this.config.baseUrl}/file/preview?` +
        `sid=${storageId}&` +
        `f=0&` +  // Start from beginning
        `l=8&` + // Get 8 lines like in your example
        `c=1&` +  // Include content
        `m=${media}&` +  // Use actual media type
        `b=${bucket}&` +
        `k=${this.config.apiKey}`;
      
      console.log(`Fetching file preview: ${filePreviewUrl}`);
      
      const previewResponse = await fetch(filePreviewUrl, {
        ...fetchOptions,
        headers: {
          ...fetchOptions.headers,
          'accept': '*/*',
          'origin': 'https://intelx.io',
          'referer': 'https://intelx.io/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
        }
      });
      
      if (!previewResponse.ok) {
        console.error('File preview error:', previewResponse.status);
        
        // Try alternative with different parameters
        const altPreviewUrl = `${this.config.baseUrl}/file/preview?` +
          `sid=${storageId}&` +
          `f=0&` +
          `l=50&` +
          `c=1&` +
          `m=0&` +
          `b=${bucket}&` +
          `k=${this.config.apiKey}`;
        
        console.log(`Trying alternative preview: ${altPreviewUrl}`);
        
        const altResponse = await fetch(altPreviewUrl, fetchOptions);
        
        if (altResponse.ok) {
          const altContent = await altResponse.text();
          if (altContent && altContent.trim().length > 0) {
            console.log(`Got alternative content, length: ${altContent.length}`);
            return altContent + (altContent.length > 1000 ? '\n\n[...más contenido disponible]' : '');
          }
        }
        
        // If both methods fail, return informative message
        if (previewResponse.status === 402) {
          return `🔒 Contenido Premium

Este archivo requiere suscripción premium para ver el contenido completo.

Detalles del Archivo:
- Fuente: ${bucket}
- Storage ID: ${storageId}
- Tipo: ${recordType}
- Estado: Disponible en versión de pago

Actualiza a Premium para:
- Ver contenido completo
- Descargar archivos
- Acceso ilimitado
- Análisis avanzado`;
        }
        
        return `📄 Vista Previa No Disponible

No se pudo obtener el contenido del archivo:
- Error: ${previewResponse.status}
- Storage ID: ${storageId}
- Bucket: ${bucket}

Posibles causas:
- Archivo demasiado grande
- Contenido requiere acceso premium
- Limitaciones temporales del servidor`;
      }
      
      const previewContent = await previewResponse.text();
      console.log(`Raw preview response:`, previewContent);
      console.log(`Preview response length:`, previewContent.length);
      
      if (previewContent && previewContent.trim().length > 0) {
        console.log(`Successfully retrieved file content. Length: ${previewContent.length}`);
        
        // Clean up the content and format it nicely
        let cleanContent = previewContent.trim();
        
        // If content is very long, show substantial portion
        if (cleanContent.length > 3000) {
          cleanContent = cleanContent.substring(0, 3000) + 
            '\n\n[--- CONTENIDO TRUNCADO ---]\n' +
            `Archivo completo: ${cleanContent.length} caracteres\n` +
            'Para ver el contenido completo, considera actualizar a Premium.';
        }
        
        return cleanContent;
      }
      
      return `📋 Archivo Localizado

Se encontró el archivo pero no hay contenido de vista previa disponible.

Detalles:
- Storage ID: ${storageId}
- Fuente: ${bucket}
- Tipo: ${recordType}

Este archivo puede:
- Requerir acceso premium para visualización
- Estar en un formato que no soporta vista previa
- Contener datos binarios no mostrables`;
      
    } catch (error) {
      console.error('IntelX record fetch error:', error);
      return `❌ Content Retrieval Error

Failed to retrieve record content:
- Error: ${error instanceof Error ? error.message : 'Unknown error'}
- Record ID: ${systemId}
- Bucket: ${bucket}

This could be due to:
- Network connectivity issues
- API rate limiting
- Server temporarily unavailable

Please try again in a few moments or contact support if the issue persists.`;
    }
  }
}

export const intelxService = new IntelXService();
