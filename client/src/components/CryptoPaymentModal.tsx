import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown, Copy, CheckCircle, X, Bitcoin, AlertCircle, DollarSign } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  priceUsd: number;
}

export default function CryptoPaymentModal({ open, onOpenChange }: CryptoPaymentModalProps) {
  const [step, setStep] = useState<'select' | 'payment' | 'verify'>('select');
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [cryptoOptions, setCryptoOptions] = useState<CryptoOption[]>([]);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [txHash, setTxHash] = useState('');
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar precios de criptomonedas al abrir el modal
  useEffect(() => {
    if (open && step === 'select') {
      loadCryptoPrices();
    }
  }, [open, step]);

  const loadCryptoPrices = async () => {
    setIsLoadingPrices(true);
    try {
      const response = await apiRequest('GET', '/api/crypto/prices');
      const prices = await response.json();
      setCryptoOptions(prices);
      if (prices.length > 0) {
        setSelectedCrypto(prices[0].id); // Seleccionar Bitcoin por defecto
      }
    } catch (error) {
      console.error('Error loading crypto prices:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los precios de las criptomonedas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/crypto/create-payment", {
        cryptoType: selectedCrypto
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setPaymentData(data);
      setStep('payment');
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
        title: "Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, txHash }: { paymentId: string; txHash: string }) => {
      const response = await apiRequest("POST", "/api/crypto/verify-payment", { paymentId, txHash });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Verified",
        description: "Welcome to Premium! You now have unlimited searches.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onOpenChange(false);
      setStep('select');
      setPaymentData(null);
      setTxHash('');
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
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    onOpenChange(false);
    setStep('select');
    setSelectedCrypto('');
    setCryptoOptions([]);
    setPaymentData(null);
    setTxHash('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const handleCreatePayment = () => {
    if (!selectedCrypto) {
      toast({
        title: 'Selecciona una criptomoneda',
        description: 'Por favor selecciona una criptomoneda para continuar',
        variant: 'destructive',
      });
      return;
    }
    createPaymentMutation.mutate();
  };

  const getSelectedCryptoInfo = () => {
    return cryptoOptions.find(crypto => crypto.id === selectedCrypto);
  };

  const getCryptoIcon = (symbol: string) => {
    const icons: Record<string, string> = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'LTC': 'Ł',
      'BCH': '₿',
      'DOGE': 'Ð',
      'XMR': 'ɱ',
    };
    return icons[symbol] || '₿';
  };

  const handleVerifyPayment = () => {
    if (!txHash.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter the transaction hash",
        variant: "destructive",
      });
      return;
    }

    verifyPaymentMutation.mutate({
      paymentId: paymentData.paymentId,
      txHash: txHash.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-dark-secondary border-dark-tertiary max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Upgrade to Premium</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200 p-1"
              data-testid="button-close-modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {step === 'select' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Selecciona tu Criptomoneda</h3>
              <p className="text-slate-400">Paga con cualquier criptomoneda para desbloquear búsquedas ilimitadas</p>
            </div>

            <Card className="bg-dark-primary border-dark-tertiary mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-medium">Premium Mensual</span>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-green-500 font-bold text-xl">$29 USD</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="text-sm text-slate-400 mb-2 block">Seleccionar Criptomoneda:</label>
                  {isLoadingPrices ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-slate-400">Cargando precios...</span>
                    </div>
                  ) : (
                    <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                      <SelectTrigger className="bg-dark-secondary border-dark-tertiary text-white">
                        <SelectValue placeholder="Selecciona una criptomoneda" />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-secondary border-dark-tertiary">
                        {cryptoOptions.map((crypto) => {
                          const cryptoAmount = (29 / crypto.priceUsd);
                          const formattedAmount = crypto.symbol === 'DOGE' ? cryptoAmount.toFixed(0) : 
                                                crypto.symbol === 'BTC' ? cryptoAmount.toFixed(6) :
                                                crypto.symbol === 'ETH' ? cryptoAmount.toFixed(4) :
                                                cryptoAmount.toFixed(4);
                          return (
                            <SelectItem key={crypto.id} value={crypto.id} className="text-white hover:bg-dark-tertiary">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg font-mono">{getCryptoIcon(crypto.symbol)}</span>
                                  <span>{crypto.name} ({crypto.symbol})</span>
                                </div>
                                <span className="text-primary font-mono text-sm ml-4">
                                  {formattedAmount} {crypto.symbol}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-secondary flex-shrink-0" />
                    <span>Búsquedas ilimitadas</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-secondary flex-shrink-0" />
                    <span>Análisis avanzados</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-secondary flex-shrink-0" />
                    <span>Soporte prioritario</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleCreatePayment}
              disabled={createPaymentMutation.isPending || !selectedCrypto || isLoadingPrices}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
              data-testid="button-create-payment"
            >
              {createPaymentMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creando Pago...</span>
                </div>
              ) : (
                `Continuar con ${getSelectedCryptoInfo()?.symbol || 'Crypto'}`
              )}
            </Button>
          </>
        )}

        {step === 'payment' && paymentData && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-warning/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-mono">{paymentData?.cryptoSymbol && getCryptoIcon(paymentData.cryptoSymbol)}</span>
              </div>
              <p className="text-slate-400">Envía {paymentData?.cryptoName} a la dirección de abajo</p>
            </div>

            <Card className="bg-dark-primary border-dark-tertiary mb-4">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Cantidad</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-mono">{paymentData?.cryptoSymbol && getCryptoIcon(paymentData.cryptoSymbol)}</span>
                      <span className="text-white font-mono">{paymentData.cryptoAmount} {paymentData.cryptoSymbol}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">≈ ${paymentData.usdAmount} USD</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Dirección de Pago</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono text-sm break-all">{paymentData.paymentAddress}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.paymentAddress)}
                        className="text-primary hover:text-primary/80 p-1"
                        data-testid="button-copy-address"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="bg-warning/10 border-warning/20 mb-4">
              <AlertCircle className="w-4 h-4 text-warning" />
              <AlertDescription className="text-warning text-sm">
                El pago expira en 24 horas. Envía la cantidad exacta a la dirección de arriba.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setStep('verify')}
              className="w-full bg-dark-tertiary hover:bg-dark-tertiary/80 text-slate-300"
              data-testid="button-payment-sent"
            >
              Ya Envié el Pago
            </Button>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
              <p className="text-slate-400">Ingresa el hash de tu transacción para verificar el pago</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-2">Hash de Transacción</div>
                <Input
                  type="text"
                  placeholder="Ingresa el hash de la transacción de tu wallet..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="bg-dark-primary border-dark-tertiary text-white placeholder-slate-500"
                  data-testid="input-tx-hash"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => setStep('payment')}
                className="flex-1 border-dark-tertiary text-slate-300 hover:bg-dark-tertiary"
                data-testid="button-back"
              >
                Volver
              </Button>
              <Button 
                onClick={handleVerifyPayment}
                disabled={verifyPaymentMutation.isPending || !txHash.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
                data-testid="button-verify-payment"
              >
                {verifyPaymentMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </div>
                ) : (
                  "Verificar Pago"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}