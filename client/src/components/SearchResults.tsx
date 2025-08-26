import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Mail, Server, Fingerprint, ExternalLink, Download, Shield, Bell, Crown, Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CryptoPaymentModal from "./CryptoPaymentModal";
import RecordDetailsModal from "./RecordDetailsModal";

interface SearchResultsProps {
  results: any;
  isLoading: boolean;
  lastSearchTime?: string;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'domain': return Globe;
    case 'ip': return Server;
    case 'email': return Mail;
    case 'hash': return Fingerprint;
    default: return Globe;
  }
};

const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'high': return 'text-danger bg-danger/20';
    case 'medium': return 'text-warning bg-warning/20';
    case 'low': return 'text-secondary bg-secondary/20';
    default: return 'text-slate-400 bg-slate-400/20';
  }
};

export default function SearchResults({ results, isLoading, lastSearchTime }: SearchResultsProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <Card className="bg-dark-secondary border-dark-tertiary shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Searching intelligence databases...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Load more mutation
  const loadMoreMutation = useMutation({
    mutationFn: async (data: { searchId: string; page: number; lastSearchTime: string }) => {
      return await apiRequest('/api/search/load-more', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setAllResults(prev => [...prev, ...data.results]);
      setCurrentPage(prev => prev + 1);
      setCanLoadMore(data.hasMore);
      toast({
        title: "Más resultados cargados",
        description: `Se cargaron ${data.results.length} resultados adicionales`,
      });
    },
    onError: (error: any) => {
      console.error('Error loading more results:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar más resultados",
        variant: "destructive",
      });
    },
  });

  // Update results when new search comes in
  useEffect(() => {
    if (results?.results) {
      setAllResults(results.results);
      setCurrentPage(0);
      setCanLoadMore(results.hasMore);
    }
  }, [results]);

  const handleLoadMore = () => {
    if (!results?.searchId || !lastSearchTime) return;
    
    loadMoreMutation.mutate({
      searchId: results.searchId,
      page: currentPage + 1,
      lastSearchTime: lastSearchTime,
    });
  };

  if (!results) {
    return null;
  }

  const { total, isPremium } = results;
  const searchResults = allResults;

  return (
    <>
      <Card className="bg-dark-secondary border-dark-tertiary shadow-lg">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white" data-testid="text-results-title">
              Search Results
            </h3>
            <span className="text-sm text-muted-foreground" data-testid="text-results-count">
              Found {total} results
            </span>
          </div>

          {searchResults?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found for your search query.</p>
                <p className="text-sm mt-2">Try different search terms or check for typos.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults?.map((result: any, index: number) => {
                const TypeIcon = getTypeIcon(result.type);
                
                return (
                  <Card 
                    key={result.id || index}
                    className="bg-dark-primary border-dark-tertiary hover:border-primary/30 transition-colors"
                    data-testid={`card-result-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <TypeIcon className="w-4 h-4 text-primary" />
                          <span className="text-white font-medium" data-testid={`text-result-term-${index}`}>
                            {result.term}
                          </span>
                          {result.riskLevel && (
                            <Badge 
                              className={`text-xs px-2 py-1 rounded-full ${getRiskColor(result.riskLevel)}`}
                              data-testid={`badge-risk-${index}`}
                            >
                              {result.riskLevel}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`text-result-date-${index}`}>
                          {result.lastSeen}
                        </span>
                      </div>
                      
                      <div className="text-sm text-foreground/80 space-y-1 mb-3">
                        {result.source && (
                          <p>
                            <span className="text-muted-foreground">Source:</span>{' '}
                            <span data-testid={`text-result-source-${index}`}>{result.source}</span>
                          </p>
                        )}
                        {result.bucket && (
                          <p>
                            <span className="text-muted-foreground">Bucket:</span>{' '}
                            <span data-testid={`text-result-bucket-${index}`}>{result.bucket}</span>
                          </p>
                        )}
                        {result.size && (
                          <p>
                            <span className="text-muted-foreground">Size:</span>{' '}
                            <span data-testid={`text-result-size-${index}`}>{result.size} bytes</span>
                          </p>
                        )}
                        <div className="mt-2 p-2 bg-dark-tertiary rounded text-xs text-foreground/70">
                          <span className="text-muted-foreground">ID del Registro:</span>
                          <div className="mt-1 font-mono text-primary">{result.id}</div>
                          {result.preview && (
                            <>
                              <span className="text-muted-foreground mt-2 block">Vista Previa:</span>
                              <div className="mt-1 whitespace-pre-wrap font-mono">{result.preview}</div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-primary hover:text-primary/80 p-0"
                          data-testid={`button-view-details-${index}`}
                          onClick={() => {
                            setSelectedRecord(result);
                            setShowDetailsModal(true);
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        {isPremium && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-muted-foreground hover:text-foreground p-0"
                              data-testid={`button-export-${index}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Export
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-muted-foreground hover:text-foreground p-0"
                              data-testid={`button-monitor-${index}`}
                            >
                              <Bell className="w-4 h-4 mr-1" />
                              Monitor
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Premium Content Teaser */}
              {!isPremium && total > searchResults?.length && (
                <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-dark-primary/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <Crown className="w-8 h-8 text-warning mx-auto mb-2" />
                      <p className="text-white font-medium mb-2">Premium Results Available</p>
                      <p className="text-foreground/80 text-sm mb-3">
                        Unlock {total - searchResults?.length} additional results with deep analysis
                      </p>
                      <Button
                        onClick={() => setShowUpgradeModal(true)}
                        className="bg-gradient-to-r from-primary to-secondary px-6 py-2 hover:from-primary/80 hover:to-secondary/80"
                        data-testid="button-upgrade-premium-results"
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4 blur-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Server className="w-4 h-4 text-accent" />
                        <span className="text-white font-medium">192.168.1.***</span>
                        <Badge className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-full">
                          Premium
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-slate-300 space-y-1">
                      <p><span className="text-slate-400">Ports:</span> <span>***,***,***</span></p>
                      <p><span className="text-slate-400">Services:</span> <span>**** *** ****</span></p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Load More Button */}
              {canLoadMore && isPremium && (
                <div className="text-center mt-6">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadMoreMutation.isPending}
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                    data-testid="button-load-more"
                  >
                    {loadMoreMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cargando más resultados...
                      </>
                    ) : (
                      'Cargar 10 resultados más'
                    )}
                  </Button>
                </div>
              )}

              {/* Load More for Free Users with Time Limit */}
              {canLoadMore && !isPremium && lastSearchTime && (
                <div className="text-center mt-6">
                  <Card className="bg-warning/10 border-warning/20 p-4">
                    <p className="text-warning text-sm mb-3">
                      Para cargar más resultados, debes esperar 5 minutos desde tu última búsqueda o mejorar a Premium para acceso inmediato.
                    </p>
                    <div className="flex space-x-2 justify-center">
                      <Button
                        onClick={handleLoadMore}
                        disabled={loadMoreMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="border-warning/30 text-warning hover:bg-warning/10"
                        data-testid="button-load-more-free"
                      >
                        {loadMoreMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Intentando...
                          </>
                        ) : (
                          'Intentar cargar más'
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowUpgradeModal(true)}
                        size="sm"
                        className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
                        data-testid="button-upgrade-for-instant"
                      >
                        <Crown className="w-4 h-4 mr-1" />
                        Mejorar a Premium
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CryptoPaymentModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
      />
      
      <RecordDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        record={selectedRecord}
      />
    </>
  );
}
