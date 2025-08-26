import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, Copy, X, FileText, Calendar, Database, HardDrive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface RecordDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any;
}

export default function RecordDetailsModal({ open, onOpenChange, record }: RecordDetailsModalProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const { toast } = useToast();

  const { data: recordContent, isLoading } = useQuery<{ content: string; recordId: string; bucket: string }>({
    queryKey: [`/api/record/${record?.id}/${record?.bucket}`],
    enabled: open && !!record?.id && !!record?.bucket,
  });

  if (!record) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const contentToShow = showFullContent ? recordContent?.content : record.preview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-dark-secondary border-dark-tertiary">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Record Details
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-dark-primary rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="text-sm text-white font-medium">{record.source}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last Seen</p>
                <p className="text-sm text-white font-medium">{record.lastSeen}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">File Size</p>
                <p className="text-sm text-white font-medium">{formatFileSize(record.size || 0)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-white">{record.term}</span>
              <Badge variant={getRiskColor(record.riskLevel)}>
                {record.riskLevel} Risk
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(recordContent?.content || record.preview || '')}
                className="text-muted-foreground hover:text-white"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-white"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator className="bg-dark-tertiary" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Content Preview</h3>
            {record.preview && recordContent?.content && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullContent(!showFullContent)}
                className="text-primary hover:text-primary/80"
              >
                {showFullContent ? 'Show Preview' : 'Show Full Content'}
              </Button>
            )}
          </div>

          <ScrollArea className="h-96 w-full rounded-md border border-dark-tertiary p-4 bg-dark-primary">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading content...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {contentToShow && contentToShow !== 'No content available' ? (
                  <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
                    {contentToShow}
                  </pre>
                ) : (
                  <div className="bg-dark-tertiary rounded-lg p-6 text-center space-y-4">
                    <div className="text-primary">
                      <FileText className="w-12 h-12 mx-auto mb-3" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white mb-2">Registro de Inteligencia Encontrado</h4>
                      <p className="text-muted-foreground mb-4">
                        Este archivo está disponible en la base de datos de IntelX pero el contenido completo 
                        requiere acceso premium para ser visualizado.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left bg-dark-primary rounded p-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Fuente</p>
                        <p className="text-white font-medium">{record.source}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Tamaño</p>
                        <p className="text-white font-medium">{formatFileSize(record.size || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
                        <p className="text-white font-medium">{record.bucket}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Último Visto</p>
                        <p className="text-white font-medium">{record.lastSeen}</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 border border-primary/20">
                      <h5 className="text-white font-medium mb-2">💎 Contenido Premium Disponible</h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        Actualiza a Premium para acceder al contenido completo de este archivo y miles de otros registros.
                      </p>
                      <Button
                        className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
                        size="sm"
                      >
                        Actualizar a Premium
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {contentToShow && contentToShow.length > 500 && (
            <div className="text-xs text-muted-foreground text-center">
              {showFullContent ? `${recordContent?.content?.length || 0}` : `${record.preview?.length || 0}`} characters shown
              {!showFullContent && recordContent?.content && ` of ${recordContent.content.length}`}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}