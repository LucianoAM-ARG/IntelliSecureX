import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Mail, Server, Fingerprint, RotateCcw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'domain': return Globe;
    case 'ip': return Server;
    case 'email': return Mail;
    case 'hash': return Fingerprint;
    default: return Globe;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'domain': return 'text-primary';
    case 'ip': return 'text-accent';
    case 'email': return 'text-secondary';
    case 'hash': return 'text-warning';
    default: return 'text-primary';
  }
};

const formatTimeAgo = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
};

export default function QueryHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchHistory, isLoading } = useQuery({
    queryKey: ["/api/search/history"],
    retry: false,
  });

  const repeatSearchMutation = useMutation({
    mutationFn: async (queryId: string) => {
      const response = await apiRequest("POST", `/api/search/repeat/${queryId}`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/search/history"] });
      toast({
        title: "Search Repeated",
        description: `Found ${data.total} results`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Repeat Search Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleRepeatSearch = (queryId: string) => {
    repeatSearchMutation.mutate(queryId);
  };

  if (isLoading) {
    return (
      <Card className="bg-dark-secondary border-dark-tertiary shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Searches</h3>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-dark-primary rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-secondary border-dark-tertiary shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white" data-testid="text-history-title">
            Recent Searches
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-clear-history"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear History
          </Button>
        </div>
        
        {!searchHistory || !Array.isArray(searchHistory) || searchHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No search history yet.</p>
              <p className="text-sm mt-1">Your searches will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.isArray(searchHistory) && searchHistory.map((query: any, index: number) => {
              const TypeIcon = getTypeIcon(query.queryType);
              const typeColor = getTypeColor(query.queryType);
              
              return (
                <div 
                  key={query.id}
                  className="flex items-center justify-between py-2 px-3 bg-dark-primary rounded-lg hover:bg-dark-primary/80 transition-colors"
                  data-testid={`row-history-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <TypeIcon className={`w-4 h-4 ${typeColor}`} />
                    <span className="text-white text-sm" data-testid={`text-history-term-${index}`}>
                      {query.queryTerm}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize" data-testid={`text-history-type-${index}`}>
                      {query.queryType}
                    </span>
                    {query.resultCount > 0 && (
                      <span className="text-xs text-muted-foreground" data-testid={`text-history-results-${index}`}>
                        {query.resultCount} results
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground" data-testid={`text-history-time-${index}`}>
                      {formatTimeAgo(query.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRepeatSearch(query.id)}
                      disabled={repeatSearchMutation.isPending}
                      className="text-primary hover:text-primary/80 p-1"
                      data-testid={`button-repeat-search-${index}`}
                    >
                      {repeatSearchMutation.isPending ? (
                        <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
