import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Wallet, TrendingUp, History, AlertCircle, ExternalLink, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';
import type { UserStats } from '@/lib/api';
import { formatMskDateTime, formatUsdt, formatRub } from '@/lib/utils';

interface UserStatsDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminPassword: string;
}

const depositStatusColors: Record<string, string> = {
  pending: 'bg-secondary text-foreground',
  confirmed: 'bg-[hsl(var(--success))] text-white',
  rejected: 'bg-destructive text-white',
  cancelled: 'bg-muted text-foreground',
  expired: 'bg-muted text-foreground',
};

const depositStatusLabels: Record<string, string> = {
  pending: 'ОЖИДАЕТ',
  confirmed: 'ПОДТВЕРЖДЁН',
  rejected: 'ОТКЛОНЁН',
  cancelled: 'ОТМЕНЁН',
  expired: 'ИСТЁК',
};

const paymentStatusColors: Record<string, string> = {
  submitted: 'bg-secondary text-foreground',
  assigned: 'bg-blue-500 text-white',
  processing: 'bg-yellow-500 text-white',
  paid: 'bg-[hsl(var(--success))] text-white',
  rejected: 'bg-destructive text-white',
  cancelled: 'bg-muted text-foreground',
};

const paymentStatusLabels: Record<string, string> = {
  submitted: 'ПОДАНО',
  assigned: 'НАЗНАЧЕНО',
  processing: 'ОБРАБОТКА',
  paid: 'ОПЛАЧЕНО',
  rejected: 'ОТКЛОНЕНО',
  cancelled: 'ОТМЕНЕНО',
};

export default function UserStatsDialog({
  userId,
  open,
  onOpenChange,
  adminPassword,
}: UserStatsDialogProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      loadStats();
    }
  }, [open, userId]);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.adminGetUserStats(adminPassword, userId);
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить статистику';
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
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Детальная статистика пользователя</DialogTitle>
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

        {stats && !isLoading && (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Основная информация
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={stats.avatarUrl || undefined} />
                      <AvatarFallback>{stats.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{stats.fullName || stats.username}</p>
                      <p className="text-sm text-muted-foreground">@{stats.username}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Telegram ID</p>
                      <p className="font-mono text-sm">{stats.telegramId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Дата регистрации</p>
                      <p className="font-medium text-sm">{formatMskDateTime(stats.registeredAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Балансы
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Доступно</p>
                      <p className="text-lg font-semibold">{formatUsdt(stats.availableBalance)} USDT</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Заморожено</p>
                      <p className="text-lg font-semibold">{formatUsdt(stats.frozenBalance)} USDT</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Итого</p>
                      <p className="text-lg font-semibold text-primary">{formatUsdt(stats.totalBalance)} USDT</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Статистика депозитов
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Всего депозитов</p>
                      <p className="text-2xl font-bold">{stats.totalDeposits}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Общая сумма</p>
                      <p className="text-lg font-semibold">{formatUsdt(stats.totalDepositedAmount)} USDT</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Последний депозит</p>
                      <p className="font-medium text-sm">{formatMskDateTime(stats.lastDepositDate)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Статистика платежей
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Всего платежей</p>
                      <p className="text-2xl font-bold">{stats.totalPayments}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Общая сумма выплат</p>
                      <p className="text-lg font-semibold">{formatRub(stats.totalPaidAmountRub)} ₽</p>
                      <p className="text-sm text-muted-foreground">{formatUsdt(stats.totalPaidAmountUsdt)} USDT</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Последний платёж</p>
                      <p className="font-medium text-sm">{formatMskDateTime(stats.lastPaymentDate)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Реферальная программа
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Промокод</p>
                      <p className="text-lg font-mono font-semibold">{stats.promoCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ID рефера</p>
                      <p className="text-sm font-medium">{stats.referrerId || 'Нет'}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Рефералов</p>
                      <p className="text-2xl font-bold">{stats.referralsCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Реферальный баланс</p>
                      <p className="text-lg font-semibold text-primary">{formatUsdt(stats.referralBalance)} USDT</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Всего заработано</p>
                      <p className="text-lg font-semibold">{formatUsdt(stats.referralTotalEarned)} USDT</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Всего выведено</p>
                      <p className="text-lg font-semibold">{formatUsdt(stats.referralTotalWithdrawn)} USDT</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-semibold mb-2">Приветственный бонус</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Статус</p>
                        <Badge className={stats.signupBonusActive === 1 ? 'bg-green-500 text-white' : 'bg-muted text-foreground'}>
                          {stats.signupBonusActive === 1 ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Сумма</p>
                        <p className="text-sm font-semibold">{formatUsdt(stats.signupBonusAmount)} USDT</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Истекает</p>
                        <p className="text-xs font-medium">
                          {stats.signupBonusExpiresAt ? formatMskDateTime(stats.signupBonusExpiresAt) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Последние транзакции
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Депозиты (последние 5)</h4>
                    {stats.recentDeposits.length > 0 ? (
                      <div className="space-y-2">
                        {stats.recentDeposits.map((deposit) => (
                          <div 
                            key={deposit.id} 
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{formatUsdt(deposit.amount)} USDT</p>
                                <Badge className={`${depositStatusColors[deposit.status] || 'bg-muted'} font-semibold text-xs`}>
                                  {depositStatusLabels[deposit.status] || deposit.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatMskDateTime(deposit.status === 'confirmed' ? deposit.confirmedAt : deposit.createdAt)}
                              </p>
                              {deposit.txHash && (
                                <a
                                  href={`https://tronscan.org/#/transaction/${deposit.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                                >
                                  TX Hash
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет депозитов</p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Платежи (последние 5)</h4>
                    {stats.recentPayments.length > 0 ? (
                      <div className="space-y-2">
                        {stats.recentPayments.map((payment) => (
                          <div 
                            key={payment.id} 
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{formatRub(payment.amountRub)} ₽</p>
                                <span className="text-xs text-muted-foreground">
                                  ({formatUsdt(payment.amountUsdt)} USDT)
                                </span>
                                <Badge className={`${paymentStatusColors[payment.status] || 'bg-muted'} font-semibold text-xs`}>
                                  {paymentStatusLabels[payment.status] || payment.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatMskDateTime(payment.status === 'paid' ? payment.completedAt : payment.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет платежей</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
