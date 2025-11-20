import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Clock, User, DollarSign, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';
import type { DepositDetails } from '@/lib/api';
import { formatMskDateTime } from '@/lib/utils';

interface DepositDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depositId: string;
  adminPassword: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500 text-black',
  confirmed: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white',
  cancelled: 'bg-gray-400 text-white',
  expired: 'bg-gray-400 text-white',
};

const statusLabels: Record<string, string> = {
  pending: 'ОЖИДАЕТ',
  confirmed: 'ПОДТВЕРЖДЁН',
  rejected: 'ОТКЛОНЁН',
  cancelled: 'ОТМЕНЁН',
  expired: 'ИСТЁК',
};

export default function DepositDetailsDialog({
  open,
  onOpenChange,
  depositId,
  adminPassword,
}: DepositDetailsDialogProps) {
  const [details, setDetails] = useState<DepositDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && depositId) {
      loadDetails();
    }
  }, [open, depositId]);

  const loadDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.adminGetDepositDetails(adminPassword, depositId);
      setDetails(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить детали депозита';
      setError(errorMessage);
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали депозита</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {details && !isLoading && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Информация о клиенте
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={details.avatarUrl || undefined} />
                    <AvatarFallback>{details.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{details.fullName || details.username}</p>
                    <p className="text-sm text-muted-foreground">@{details.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Информация о депозите
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID депозита</p>
                    <p className="font-mono text-sm">{details.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Статус</p>
                    <Badge className={`${statusColors[details.status] || 'bg-muted'} font-semibold`}>
                      {statusLabels[details.status] || details.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Сеть</p>
                  <p className="font-semibold">USDT TRC20</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Время создания заявки</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{formatMskDateTime(details.createdAt)}</p>
                  </div>
                </div>

                {details.status === 'confirmed' && (
                  <>
                    <Separator />

                    {details.txHash && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Хеш транзакции</p>
                        <a
                          href={`https://tronscan.org/#/transaction/${details.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline font-mono text-sm break-all"
                        >
                          {details.txHash}
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        </a>
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Время открытия заявки</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium">{formatMskDateTime(details.createdAt)}</p>
                        </div>
                      </div>
                      {details.confirmedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Время фактического получения</p>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
                            <p className="font-medium">{formatMskDateTime(details.confirmedAt)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      {details.requestedAmount !== null && details.payableAmount !== null && 
                       details.requestedAmount !== details.actualAmount ? (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Сумма по заявке</p>
                            <p className="font-semibold text-lg">
                              {(details.payableAmount || details.requestedAmount).toFixed(2)} USDT
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Фактическая сумма</p>
                            <p className="font-semibold text-lg text-[hsl(var(--success))]">
                              {details.actualAmount.toFixed(2)} USDT
                            </p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground">Сумма депозита</p>
                          <p className="font-semibold text-lg">
                            {details.actualAmount.toFixed(2)} USDT
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {details.status !== 'confirmed' && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Сумма</p>
                      <p className="font-semibold text-lg">
                        {(details.payableAmount || details.requestedAmount || details.actualAmount).toFixed(2)} USDT
                      </p>
                    </div>
                  </>
                )}

                {details.walletAddress && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Адрес кошелька</p>
                      <p className="font-mono text-sm break-all">{details.walletAddress}</p>
                    </div>
                  </>
                )}

                {details.expiresAt && details.status === 'pending' && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Истекает</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{formatMskDateTime(details.expiresAt)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
