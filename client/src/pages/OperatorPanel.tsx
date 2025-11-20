import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, Check, X, AlertCircle, Download, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatMskDateTime } from '@/lib/utils';
import PaymentDetailsDialog from '@/components/PaymentDetailsDialog';

interface PaymentRequest {
  id: string;
  userId: string;
  username: string;
  amountRub: number;
  amountUsdt: number;
  frozenRate: number;
  urgency: string;
  status: string;
  assignedOperatorId?: string;
  createdAt: string;
  comment?: string;
  adminComment?: string;
  attachments?: Array<{type: string; value: string; name?: string}>;
  receipt?: {type: string; value: string; name: string; mimeType: string};
}

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-500 text-white',
  assigned: 'bg-purple-500 text-white',
  processing: 'bg-yellow-500 text-black',
  paid: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white',
  cancelled: 'bg-gray-400 text-white',
};

const statusLabels: Record<string, string> = {
  submitted: 'ОТПРАВЛЕНА',
  assigned: 'НАЗНАЧЕНА',
  processing: 'В ОБРАБОТКЕ',
  paid: 'ОПЛАЧЕНО',
  rejected: 'ОТКЛОНЕНО',
  cancelled: 'ОТМЕНЕНО',
};

const statusIcons: Record<string, any> = {
  submitted: AlertCircle,
  assigned: Clock,
  processing: Clock,
  paid: Check,
  rejected: X,
  cancelled: X,
};

export default function OperatorPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [operatorLogin, setOperatorLogin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  
  const [paymentTab, setPaymentTab] = useState<'active' | 'completed' | 'statistics'>('active');
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  
  const [statistics, setStatistics] = useState<{
    totalCount: number;
    paidCount: number;
    rejectedCount: number;
    totalAmountRub: number;
    paidAmountRub: number;
    rejectedAmountRub: number;
    totalAmountUsdt: number;
    paidAmountUsdt: number;
    rejectedAmountUsdt: number;
    conversionRate: number;
  } | null>(null);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);
  
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [processDialog, setProcessDialog] = useState(false);
  const [paymentDetailsDialog, setPaymentDetailsDialog] = useState<{ open: boolean; paymentId: string | null }>({ open: false, paymentId: null });
  const [processStatus, setProcessStatus] = useState<'paid' | 'rejected' | 'processing'>('processing');
  const [adminComment, setAdminComment] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ open: boolean; src: string; name: string }>({ open: false, src: '', name: '' });
  
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const response = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка входа');
      }

      const data = await response.json();
      setOperatorId(data.id);
      setOperatorLogin(data.login);
      setIsOnline(data.isOnline || false);
      setIsAuthenticated(true);
      
      toast({
        title: 'Успешный вход',
        description: `Добро пожаловать, ${data.login}`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка входа',
        description: error instanceof Error ? error.message : 'Неверный логин или пароль',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleToggleOnlineStatus = async (checked: boolean) => {
    if (!operatorId) return;
    
    setIsTogglingStatus(true);
    
    try {
      const response = await fetch(`/api/operator/${operatorId}/online-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: checked }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Ошибка изменения статуса');

      setIsOnline(checked);
      
      toast({
        title: checked ? 'Вы в сети' : 'Вы оффлайн',
        description: checked ? 'Теперь вы будете получать уведомления о новых заявках' : 'Вы больше не будете получать уведомления',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const loadPayments = useCallback(async () => {
    if (!operatorId) return;
    
    setIsLoadingPayments(true);
    try {
      const response = await fetch(`/api/operator/${operatorId}/payments?status=${paymentTab}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Ошибка загрузки заявок');
      
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  }, [operatorId, paymentTab]);

  const loadStatistics = useCallback(async () => {
    if (!operatorId) return;
    
    setIsLoadingStatistics(true);
    try {
      const response = await fetch(`/api/operator/${operatorId}/statistics`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Ошибка загрузки статистики');
      
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoadingStatistics(false);
    }
  }, [operatorId]);

  useEffect(() => {
    if (isAuthenticated && operatorId) {
      if (paymentTab === 'statistics') {
        loadStatistics();
      } else {
        loadPayments();
        const interval = setInterval(loadPayments, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [isAuthenticated, operatorId, loadPayments, loadStatistics, paymentTab]);

  const handleTakePayment = async (paymentId: string) => {
    if (!operatorId) return;
    
    try {
      const response = await fetch(`/api/operator/${operatorId}/payments/${paymentId}/take`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка взятия заявки');
      }

      toast({
        title: 'Успешно',
        description: 'Заявка взята в работу',
      });

      loadPayments();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось взять заявку',
        variant: 'destructive',
      });
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPayment || !operatorId) return;
    
    setIsProcessing(true);
    
    try {
      let receipt = undefined;
      
      if (receiptFile && processStatus === 'paid') {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(receiptFile);
        });
        
        receipt = {
          type: receiptFile.type.includes('pdf') ? 'pdf' : 'image',
          value: base64,
          name: receiptFile.name,
          mimeType: receiptFile.type,
        };
      }

      const response = await fetch(`/api/operator/${operatorId}/payments/${selectedPayment.id}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: processStatus,
          adminComment: adminComment || undefined,
          receipt,
        }),
      });

      if (!response.ok) throw new Error('Ошибка обработки заявки');

      toast({
        title: 'Успешно',
        description: `Заявка ${processStatus === 'paid' ? 'оплачена' : processStatus === 'rejected' ? 'отклонена' : 'взята в обработку'}`,
      });

      setProcessDialog(false);
      setSelectedPayment(null);
      setAdminComment('');
      setReceiptFile(null);
      loadPayments();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обработать заявку',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadBase64File = (base64Data: string, fileName: string, mimeType: string) => {
    const dataUrl = base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-soft-lg bg-card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Панель оператора</h1>
            <p className="text-muted-foreground">Введите данные для входа</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="login" className="text-foreground font-semibold">Логин</Label>
              <Input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                required
                className="mt-2 rounded-[12px] border-border"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-foreground font-semibold">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                className="mt-2 rounded-[12px] border-border"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm font-semibold py-6" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Панель оператора</h1>
            <p className="text-muted-foreground mt-1">Оператор: {operatorLogin}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-[12px] shadow-soft">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
                <span className="text-sm font-semibold text-foreground">
                  {isOnline ? 'Онлайн' : 'Офлайн'}
                </span>
              </div>
              <Switch
                checked={isOnline}
                onCheckedChange={handleToggleOnlineStatus}
                disabled={isTogglingStatus}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsAuthenticated(false)}
              className="rounded-[12px]"
            >
              Выйти
            </Button>
          </div>
        </div>

        <Tabs value={paymentTab} onValueChange={(v) => setPaymentTab(v as 'active' | 'completed' | 'statistics')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card shadow-soft-sm rounded-[18px] p-1 mb-6">
            <TabsTrigger 
              value="active" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Активные
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Завершенные
            </TabsTrigger>
            <TabsTrigger 
              value="statistics" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Статистика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 animate-fade-in">
            {isLoadingPayments ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <p className="text-muted-foreground">Загрузка...</p>
              </Card>
            ) : payments.length === 0 ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Нет активных заявок</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {payments.map((payment) => {
                  const StatusIcon = statusIcons[payment.status];
                  return (
                    <Card key={payment.id} className="p-6 bg-card shadow-soft hover-lift transition-soft">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Пользователь</p>
                          <p className="text-lg font-bold text-foreground">{payment.username}</p>
                        </div>
                        <Badge className={`${statusColors[payment.status]} rounded-full text-xs font-semibold px-3 py-2 shadow-soft-sm flex items-center gap-2`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusLabels[payment.status]}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Сумма</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{Number(payment.amountRub).toLocaleString('ru-RU')} ₽</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">USDT</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{Number(payment.amountUsdt).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground border-t border-border pt-4 mb-4">
                        <p>Курс: {Number(payment.frozenRate).toFixed(2)} ₽</p>
                        <p>Срочность: {payment.urgency === 'urgent' ? '⚡ Срочно' : '⏱️ Стандартно'}</p>
                        <p>Создана: {formatMskDateTime(payment.createdAt)}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setPaymentDetailsDialog({ open: true, paymentId: payment.id })}
                        >
                          Детали
                        </Button>
                        {payment.status === 'submitted' && !payment.assignedOperatorId ? (
                          <Button
                            variant="default"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleTakePayment(payment.id)}
                          >
                            Взять в работу
                          </Button>
                        ) : (payment.assignedOperatorId === operatorId && ['assigned', 'processing'].includes(payment.status)) ? (
                          <Button
                            variant="default"
                            className="flex-1"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setProcessDialog(true);
                              setProcessStatus('processing');
                              setAdminComment('');
                              setReceiptFile(null);
                            }}
                          >
                            Обработать
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 animate-fade-in">
            {payments.length === 0 ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <Check className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Нет завершенных заявок</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {payments.map((payment) => {
                  const StatusIcon = statusIcons[payment.status];
                  return (
                    <Card key={payment.id} className="p-6 bg-card shadow-soft">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Пользователь</p>
                          <p className="text-lg font-bold text-foreground">{payment.username}</p>
                        </div>
                        <Badge className={`${statusColors[payment.status]} rounded-full text-xs font-semibold px-3 py-2 shadow-soft-sm flex items-center gap-2`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusLabels[payment.status]}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Сумма</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{Number(payment.amountRub).toLocaleString('ru-RU')} ₽</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">USDT</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{Number(payment.amountUsdt).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground border-t border-border pt-4 mb-4">
                        <p>Создана: {formatMskDateTime(payment.createdAt)}</p>
                        {payment.adminComment && (
                          <p className="mt-2 text-foreground">💬 Комментарий: {payment.adminComment}</p>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setPaymentDetailsDialog({ open: true, paymentId: payment.id })}
                      >
                        Детали
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6 animate-fade-in">
            {isLoadingStatistics ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <p className="text-muted-foreground">Загрузка статистики...</p>
              </Card>
            ) : !statistics ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <p className="text-muted-foreground">Нет данных</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6 bg-card shadow-soft">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Всего заявок</p>
                    <p className="text-4xl font-bold text-foreground tabular-nums">{statistics.totalCount}</p>
                  </Card>
                  
                  <Card className="p-6 bg-card shadow-soft border-2 border-[hsl(var(--success))]">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Успешных</p>
                    <p className="text-4xl font-bold text-[hsl(var(--success))] tabular-nums">{statistics.paidCount}</p>
                  </Card>
                  
                  <Card className="p-6 bg-card shadow-soft border-2 border-destructive">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Отклонено</p>
                    <p className="text-4xl font-bold text-destructive tabular-nums">{statistics.rejectedCount}</p>
                  </Card>
                  
                  <Card className="p-6 bg-card shadow-soft border-2 border-primary">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Конверсия</p>
                    <p className="text-4xl font-bold text-primary tabular-nums">{statistics.conversionRate.toFixed(1)}%</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-card shadow-soft">
                    <h3 className="text-xl font-bold text-foreground mb-4">Статистика в рублях</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-muted-foreground">Всего обработано:</span>
                        <span className="text-2xl font-bold tabular-nums text-foreground">{Number(statistics.totalAmountRub).toLocaleString('ru-RU')} ₽</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-muted-foreground">Успешно выплачено:</span>
                        <span className="text-2xl font-bold tabular-nums text-[hsl(var(--success))]">{Number(statistics.paidAmountRub).toLocaleString('ru-RU')} ₽</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-muted-foreground">Отклонено:</span>
                        <span className="text-2xl font-bold tabular-nums text-destructive">{Number(statistics.rejectedAmountRub).toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-card shadow-soft">
                    <h3 className="text-xl font-bold text-foreground mb-4">Статистика в USDT</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-muted-foreground">Всего обработано:</span>
                        <span className="text-2xl font-bold tabular-nums text-foreground">{Number(statistics.totalAmountUsdt).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-muted-foreground">Успешно выплачено:</span>
                        <span className="text-2xl font-bold tabular-nums text-[hsl(var(--success))]">{Number(statistics.paidAmountUsdt).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-muted-foreground">Отклонено:</span>
                        <span className="text-2xl font-bold tabular-nums text-destructive">{Number(statistics.rejectedAmountUsdt).toFixed(2)} USDT</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={processDialog} onOpenChange={setProcessDialog}>
          <DialogContent className="max-w-2xl bg-card rounded-[18px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">Обработка заявки</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedPayment?.username} • {Number(selectedPayment?.amountRub).toLocaleString('ru-RU')} ₽
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground font-semibold">Сумма (₽)</Label>
                    <p className="text-2xl font-bold tabular-nums mt-2">{Number(selectedPayment.amountRub).toLocaleString('ru-RU')}</p>
                  </div>
                  <div>
                    <Label className="text-foreground font-semibold">USDT</Label>
                    <p className="text-2xl font-bold tabular-nums mt-2">{Number(selectedPayment.amountUsdt).toFixed(2)}</p>
                  </div>
                </div>

                {selectedPayment.comment && (
                  <div>
                    <Label className="text-foreground font-semibold">Комментарий пользователя</Label>
                    <p className="text-muted-foreground mt-2">{selectedPayment.comment}</p>
                  </div>
                )}

                {selectedPayment.attachments && selectedPayment.attachments.length > 0 && (
                  <div>
                    <Label className="text-foreground font-semibold">Вложения</Label>
                    <div className="mt-2 space-y-3">
                      {selectedPayment.attachments.map((att, idx) => {
                        if (att.type === 'link') {
                          return (
                            <div key={idx} className="text-sm">
                              <a href={att.value} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                                🔗 {att.name || att.value}
                              </a>
                            </div>
                          );
                        }
                        
                        if (att.type === 'image') {
                          const imageSrc = att.value.startsWith('data:') ? att.value : `data:image/jpeg;base64,${att.value}`;
                          return (
                            <div key={idx} className="border rounded-lg p-2 bg-muted/30">
                              <div className="relative group">
                                <img 
                                  src={imageSrc} 
                                  alt={att.name || `Изображение ${idx + 1}`}
                                  className="w-full h-auto rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setFullscreenImage({ open: true, src: imageSrc, name: att.name || `Изображение ${idx + 1}` })}
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setFullscreenImage({ open: true, src: imageSrc, name: att.name || `Изображение ${idx + 1}` })}
                                  >
                                    <Maximize2 className="w-4 h-4 mr-2" />
                                    Открыть
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => downloadBase64File(att.value, att.name || `image_${idx + 1}.jpg`, 'image/jpeg')}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Скачать
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">{att.name || `Изображение ${idx + 1}`}</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={idx} className="border rounded-lg p-3 bg-muted/30 flex items-center justify-between">
                            <span className="text-sm">{att.name || `Файл ${idx + 1}`}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadBase64File(att.value, att.name || `file_${idx + 1}`, 'application/octet-stream')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="status" className="text-foreground font-semibold">Статус</Label>
                  <Select value={processStatus} onValueChange={(v: any) => setProcessStatus(v)}>
                    <SelectTrigger className="mt-2 rounded-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">В обработке</SelectItem>
                      <SelectItem value="paid">Оплачено</SelectItem>
                      <SelectItem value="rejected">Отклонено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {processStatus === 'paid' && (
                  <div>
                    <Label htmlFor="receipt" className="text-foreground font-semibold">Чек (необязательно)</Label>
                    <Input
                      id="receipt"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="mt-2 rounded-[12px]"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="comment" className="text-foreground font-semibold">Комментарий (необязательно)</Label>
                  <Textarea
                    id="comment"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Добавьте комментарий..."
                    className="mt-2 rounded-[12px]"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setProcessDialog(false)}
                className="rounded-[12px]"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleProcessPayment} 
                disabled={isProcessing}
                className="rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm"
              >
                {isProcessing ? 'Обработка...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={fullscreenImage.open} onOpenChange={(open) => setFullscreenImage({ ...fullscreenImage, open })}>
          <DialogContent className="max-w-6xl bg-card p-2">
            <DialogHeader>
              <DialogTitle className="text-foreground">{fullscreenImage.name}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img 
                src={fullscreenImage.src} 
                alt={fullscreenImage.name}
                className="w-full h-auto rounded-md"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = fullscreenImage.src;
                  link.download = fullscreenImage.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PaymentDetailsDialog
          open={paymentDetailsDialog.open}
          onOpenChange={(open) => setPaymentDetailsDialog({ open, paymentId: paymentDetailsDialog.paymentId })}
          paymentId={paymentDetailsDialog.paymentId || ''}
          isAdmin={false}
          operatorId={operatorId}
        />
      </div>
    </div>
  );
}
