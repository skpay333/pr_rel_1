import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Clock, Check, X, AlertCircle, FileCheck, Download, Copy, ExternalLink } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import type { Transaction } from "@/App";
import { useToast } from '@/hooks/use-toast';

interface HistoryPageProps {
  transactions: Transaction[];
  onGoHome: () => void;
  onViewRequest: (requestId: string) => void;
  onOpenDeposit?: (depositId: string) => void;
  onRefresh?: () => void;
}

const downloadBase64File = (base64Data: string, fileName: string, mimeType: string) => {
  const dataUrl = base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-500 text-white',
  assigned: 'bg-purple-500 text-white',
  processing: 'bg-yellow-500 text-black',
  paid: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white',
  cancelled: 'bg-gray-400 text-white',
  pending: 'bg-yellow-500 text-black',
  confirmed: 'bg-green-500 text-white',
  expired: 'bg-gray-400 text-white',
};

const statusLabels: Record<string, string> = {
  submitted: 'ОТПРАВЛЕНА',
  assigned: 'НАЗНАЧЕНА',
  processing: 'В ОБРАБОТКЕ',
  paid: 'ОПЛАЧЕНО',
  rejected: 'ОТКЛОНЕНО',
  cancelled: 'ОТМЕНЕНО',
  pending: 'ОЖИДАНИЕ',
  confirmed: 'ПОДТВЕРЖДЕНО',
  expired: 'ИСТЕКЛО ВРЕМЯ',
};

const statusIcons: Record<string, any> = {
  submitted: AlertCircle,
  processing: Clock,
  paid: Check,
  rejected: X,
  cancelled: X,
  pending: Clock,
  confirmed: Check,
  expired: Clock,
};

function DepositTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    setHasExpired(false);
  }, [expiresAt]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0 && !hasExpired) {
        setHasExpired(true);
        if (onExpire) {
          onExpire();
        }
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, hasExpired, onExpire]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (timeLeft === 0) {
    return <span className="text-red-600 font-bold text-sm">Истекло</span>;
  }

  const isExpiringSoon = timeLeft <= 120;

  return (
    <div className={`flex items-center gap-2 ${isExpiringSoon ? 'text-red-600' : 'text-green-600'}`}>
      <Clock className="w-4 h-4" />
      <span className="font-bold text-sm">{formatTime(timeLeft)}</span>
    </div>
  );
}

export default function HistoryPage({ transactions, onGoHome, onViewRequest, onOpenDeposit, onRefresh }: HistoryPageProps) {
  const { toast } = useToast();
  
  const activeTransactions = transactions.filter(tx => 
    tx.status === 'submitted' || tx.status === 'processing' || tx.status === 'pending'
  );
  
  const historyTransactions = transactions.filter(tx => 
    tx.status === 'paid' || tx.status === 'rejected' || tx.status === 'cancelled' || tx.status === 'confirmed' || tx.status === 'expired'
  );

  const hasActivePendingDeposits = useMemo(() => {
    return activeTransactions.some(tx => 
      tx.type === 'deposit' && tx.status === 'pending' && tx.expiresAt
    );
  }, [activeTransactions]);

  useEffect(() => {
    if (!onRefresh) return;
    
    if (hasActivePendingDeposits) {
      const interval = setInterval(() => {
        onRefresh();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [hasActivePendingDeposits, onRefresh]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Скопировано',
      description: `${label} скопировано в буфер обмена`,
    });
  };

  const renderTransactionCard = (tx: Transaction) => {
    const isDeposit = tx.type === 'deposit';
    const isPending = tx.status === 'pending';
    const hasPayableAmount = isDeposit && tx.payableAmount && tx.expiresAt;
    const isActiveDeposit = isDeposit && isPending && hasPayableAmount;
    const isClickable = true; // All cards are now clickable
    
    const handleClick = () => {
      if (isDeposit && onOpenDeposit) {
        onOpenDeposit(tx.id);
      } else if (!isDeposit) {
        onViewRequest(tx.id);
      }
    };
    
    return (
      <Card 
        key={tx.id} 
        className={`p-6 bg-card shadow-soft ${isClickable ? 'cursor-pointer hover-lift' : ''} transition-soft`} 
        onClick={isClickable ? handleClick : undefined}
        data-testid={`card-transaction-${tx.id}`}
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs font-semibold uppercase mb-2 text-muted-foreground">
              {isDeposit ? 'Пополнение' : 'Платеж'}
            </p>
            <p className="text-4xl font-bold tabular-nums" data-testid={`text-amount-usdt-${tx.id}`}>
              {isDeposit ? '+' : ''}{tx.amountUsdt.toFixed(2)} USDT
            </p>
          </div>
          <Badge 
            className={`${statusColors[tx.status]} rounded-full text-xs font-semibold px-3 py-2 shadow-soft-sm flex items-center gap-2`}
            data-testid={`badge-status-${tx.id}`}
          >
            {(() => {
              const StatusIcon = statusIcons[tx.status];
              return <StatusIcon className="w-4 h-4" />;
            })()}
            {statusLabels[tx.status]}
          </Badge>
        </div>

        <div className="space-y-3 text-sm font-medium border-t border-border pt-4">
          {isDeposit ? (
            <>
              {isPending && hasPayableAmount && (
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-900 uppercase">⚡ Активная заявка - нажмите для открытия</span>
                    <DepositTimer expiresAt={tx.expiresAt!} onExpire={onRefresh} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-bold text-yellow-900 font-mono">
                      {tx.payableAmount!.toFixed(2)} USDT
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(tx.payableAmount!.toFixed(2), 'Сумма');
                      }}
                      className="bg-white border-yellow-500 hover:bg-yellow-50"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {tx.walletAddress && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-yellow-900">Адрес:</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-yellow-800 break-all flex-1">
                          {tx.walletAddress}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(tx.walletAddress!, 'Адрес');
                          }}
                          className="bg-white border-yellow-500 hover:bg-yellow-50 flex-shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {tx.txHash && tx.status === 'confirmed' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">Транзакция:</p>
                  <a
                    href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group"
                  >
                    <span className="text-xs font-mono break-all">{tx.txHash}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              )}
              {tx.txHash && tx.status !== 'confirmed' && (
                <p className="text-xs text-muted-foreground truncate">
                  TX: {tx.txHash.substring(0, 10)}...{tx.txHash.substring(tx.txHash.length - 8)}
                </p>
              )}
            </>
          ) : (
            <>
              <p data-testid={`text-amount-rub-${tx.id}`}>
                {tx.amountRub.toLocaleString('ru-RU')} ₽ • {tx.urgency === 'urgent' ? 'Срочно' : 'Стандартно'}
              </p>
              <div>
                {tx.frozenRate && `${tx.frozenRate.toFixed(2)} ₽`}
              </div>
              {tx.receipt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 h-auto p-0 font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadBase64File(tx.receipt!.value, tx.receipt!.name, tx.receipt!.mimeType);
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs">Скачать чек</span>
                </Button>
              )}
            </>
          )}
          <div data-testid={`text-date-${tx.id}`}>
            {new Date(tx.createdAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-6 pt-8 pb-28 bg-background">
      <div className="max-w-md w-full mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">История транзакций</h1>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Card className="p-16 w-full text-center bg-card shadow-soft">
              <div className="space-y-8">
                <h2 className="text-4xl font-bold text-foreground">Пусто</h2>
                <p className="text-xl font-medium">Заявок нет</p>
                <Button onClick={onGoHome} size="lg" className="mt-8 h-14 text-lg">
                  Главная
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card shadow-soft-sm rounded-[18px] p-1 mb-6">
              <TabsTrigger 
                value="active" 
                className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
              >
                Активные платежи
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
              >
                История
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-5 animate-fade-in">
              {activeTransactions.length === 0 ? (
                <Card className="p-12 text-center bg-card shadow-soft">
                  <div className="space-y-4">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-base font-medium text-muted-foreground">Нет активных платежей</p>
                  </div>
                </Card>
              ) : (
                activeTransactions.map(renderTransactionCard)
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-5 animate-fade-in">
              {historyTransactions.length === 0 ? (
                <Card className="p-12 text-center bg-card shadow-soft">
                  <div className="space-y-4">
                    <FileCheck className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-base font-medium text-muted-foreground">История пуста</p>
                  </div>
                </Card>
              ) : (
                historyTransactions.map(renderTransactionCard)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
