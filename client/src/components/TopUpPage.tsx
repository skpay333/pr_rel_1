import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, Check, ArrowLeft, Loader2, ExternalLink, Clock, AlertCircle, History } from "lucide-react";
import { useState, useEffect } from "react";
import { QRCodeSVG } from 'qrcode.react';
import * as api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatPayableUsdt } from '@/lib/utils';

interface TopUpPageProps {
  userId?: string;
  depositId?: string;
  onBack: () => void;
  onTopUpComplete?: (amount: number) => void;
  onNavigateToHistory?: () => void;
}

const MIN_DEPOSIT = 30;
const MAX_DEPOSIT = 20000;

export default function TopUpPage({ userId, depositId, onBack, onTopUpComplete, onNavigateToHistory }: TopUpPageProps) {
  const [step, setStep] = useState<'input' | 'qr'>('input');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [depositData, setDepositData] = useState<api.AutomatedDepositResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadDeposit() {
      if (depositId && userId) {
        try {
          const deposits = await api.getUserDeposits(userId);
          const deposit = deposits.find(d => d.id === depositId);
          
          if (deposit) {
            setDepositData({
              id: deposit.id,
              walletAddress: deposit.walletAddress || 'THVyqrSDMBvpibitvTt4xJFWxVgY61acLu',
              requestedAmount: deposit.requestedAmount || deposit.amount,
              payableAmount: deposit.payableAmount || deposit.amount,
              expiresAt: deposit.expiresAt || new Date().toISOString(),
              status: deposit.status,
              createdAt: deposit.createdAt,
            });
            setAmount(Number(deposit.requestedAmount || deposit.amount).toString());
            setStep('qr');
          }
        } catch (error) {
          console.error('Error loading deposit:', error);
          toast({
            title: 'Ошибка',
            description: 'Не удалось загрузить заявку',
            variant: 'destructive',
          });
        }
      }
    }

    loadDeposit();
  }, [depositId, userId, toast]);

  useEffect(() => {
    if (step === 'qr' && depositData && depositData.status === 'pending' && depositData.expiresAt) {
      const expiresAt = new Date(depositData.expiresAt).getTime();
      const now = Date.now();
      
      if (expiresAt > now) {
        const interval = setInterval(() => {
          const currentTime = Date.now();
          const remaining = Math.max(0, Math.floor((expiresAt - currentTime) / 1000));
          setTimeLeft(remaining);
          
          if (remaining === 0) {
            clearInterval(interval);
            toast({
              title: 'Время истекло',
              description: 'Депозит истек. Создайте новую заявку.',
              variant: 'destructive',
            });
            setTimeout(() => {
              setStep('input');
              setDepositData(null);
              setAmount('');
              
              if (onNavigateToHistory) {
                onNavigateToHistory();
              } else {
                onBack();
              }
            }, 2000);
          }
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [step, depositData, toast, onNavigateToHistory, onBack]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateAmount = (value: string): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (num < MIN_DEPOSIT || num > MAX_DEPOSIT) return false;
    return true;
  };

  const handleCreateDeposit = async () => {
    if (!userId) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь не авторизован',
        variant: 'destructive',
      });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (!validateAmount(amount)) {
      toast({
        title: 'Ошибка',
        description: `Сумма должна быть от ${MIN_DEPOSIT} до ${MAX_DEPOSIT} USDT`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.createAutomatedDeposit(userId, depositAmount);
      setDepositData(response);
      setStep('qr');
      
      toast({
        title: 'Депозит создан',
        description: `Переведите ровно ${formatPayableUsdt(response.payableAmount)} USDT`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать депозит';
      
      if (errorMessage.includes('уже открыто') && errorMessage.includes('заявки на пополнение')) {
        setShowLimitDialog(true);
      } else {
        toast({
          title: 'Ошибка',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    if (depositData) {
      navigator.clipboard.writeText(depositData.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyPayableAmount = () => {
    if (depositData) {
      navigator.clipboard.writeText(Number(depositData.payableAmount).toFixed(2));
      toast({
        title: 'Скопировано',
        description: 'Сумма скопирована в буфер обмена',
      });
    }
  };

  const openInTronScan = () => {
    if (depositData) {
      const tronScanUrl = `https://tronscan.org/#/address/${depositData.walletAddress}/transfers`;
      window.open(tronScanUrl, '_blank');
    }
  };

  const handleComplete = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmAndGoBack = () => {
    if (onTopUpComplete && depositData) {
      onTopUpComplete(Number(depositData.requestedAmount));
    }
    setShowConfirmDialog(false);
    onBack();
  };


  const handleCancelDeposit = async () => {
    if (!depositData) return;

    try {
      await api.cancelDeposit(depositData.id);
      toast({
        title: 'Заявка отменена',
        description: 'Депозит успешно отменен',
      });
      
      setStep('input');
      setDepositData(null);
      setAmount('');
      
      if (onNavigateToHistory) {
        onNavigateToHistory();
      } else {
        onBack();
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отменить заявку',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNewRequest = async () => {
    if (!userId) return;
    
    setStep('input');
    setDepositData(null);
    setAmount('');
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { title: 'Депозит подтвержден', color: 'green', icon: '✅' };
      case 'cancelled':
        return { title: 'Депозит отменен', color: 'red', icon: '❌' };
      case 'expired':
        return { title: 'Депозит истек', color: 'orange', icon: '⏰' };
      default:
        return null;
    }
  };

  const isDepositPendingAndActive = (deposit: api.AutomatedDepositResponse | null): boolean => {
    if (!deposit || deposit.status !== 'pending' || !deposit.expiresAt) return false;
    const now = new Date();
    return new Date(deposit.expiresAt) > now;
  };

  if (step === 'input') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)] px-6 pt-8 pb-28 bg-background">
        <div className="max-w-md w-full mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2 -ml-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-foreground">Пополнить баланс</h1>
            <p className="text-muted-foreground mt-2 font-medium">Введите сумму пополнения</p>
          </div>

          <Card className="p-6 space-y-4 shadow-card gradient-card rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="amount" className="font-bold">Сумма пополнения (USDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={MIN_DEPOSIT}
                max={MAX_DEPOSIT}
                placeholder={`От ${MIN_DEPOSIT} до ${MAX_DEPOSIT} USDT`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-medium text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Минимум: {MIN_DEPOSIT} USDT • Максимум: {MAX_DEPOSIT.toLocaleString()} USDT
              </p>
            </div>

            <Button 
              onClick={handleCreateDeposit}
              className="w-full gap-2 min-h-[52px] rounded-xl gradient-primary text-white font-bold shadow-premium"
              disabled={isLoading || !amount || !validateAmount(amount)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание депозита...
                </>
              ) : (
                'Продолжить'
              )}
            </Button>
          </Card>

          <Card className="p-4 bg-blue-50 border-blue-200 rounded-2xl">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Как это работает:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Вы указываете желаемую сумму</li>
                  <li>Система создаёт уникальную заявку с точной суммой для перевода</li>
                  <li>Вы переводите USDT (TRC20) на указанный адрес</li>
                  <li>Система автоматически зачисляет средства после подтверждения в блокчейне</li>
                </ol>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'qr' && depositData) {
    const isExpiringSoon = timeLeft <= 120;
    const isPendingAndActive = isDepositPendingAndActive(depositData);
    const statusInfo = getStatusMessage(depositData.status);
    
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)] px-6 pt-8 pb-28 bg-background">
        <div className="max-w-md w-full mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2 -ml-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isPendingAndActive ? 'Переведите USDT' : 'Информация о депозите'}
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              {isPendingAndActive ? 'Отправьте точную сумму на адрес ниже' : 'Просмотр деталей депозита'}
            </p>
          </div>

          {statusInfo && (
            <Card className={`p-6 shadow-card rounded-lg border-2 ${
              statusInfo.color === 'green' ? 'border-green-500 bg-green-50' :
              statusInfo.color === 'red' ? 'border-red-500 bg-red-50' :
              'border-orange-500 bg-orange-50'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{statusInfo.icon}</span>
                <div>
                  <p className={`text-lg font-bold ${
                    statusInfo.color === 'green' ? 'text-green-700' :
                    statusInfo.color === 'red' ? 'text-red-700' :
                    'text-orange-700'
                  }`}>
                    {statusInfo.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Дата создания: {new Date(depositData.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {isPendingAndActive && (
            <Card className={`p-6 space-y-4 shadow-card rounded-lg border-2 ${
              isExpiringSoon ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${isExpiringSoon ? 'text-red-600' : 'text-green-600'}`} />
                  <span className="font-bold text-sm">Время на оплату:</span>
                </div>
                <span className={`text-2xl font-bold ${isExpiringSoon ? 'text-red-600' : 'text-green-600'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              {isExpiringSoon && (
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Поторопитесь! Депозит скоро истечёт
                </p>
              )}
            </Card>
          )}

          <Card className="p-6 space-y-5 shadow-card gradient-card rounded-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-muted-foreground">Сеть:</p>
                <p className="text-sm font-bold text-foreground">USDT TRC20</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-muted-foreground">К зачислению:</p>
                <p className="text-sm font-bold text-foreground">{Number(depositData.payableAmount).toFixed(2)} USDT</p>
              </div>
            </div>

            {isPendingAndActive ? (
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-500 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-yellow-900 uppercase">⚡ Переведите точно:</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-3xl font-bold text-yellow-900 font-mono">
                    {Number(depositData.payableAmount).toFixed(2)}
                  </p>
                  <Button
                    size="sm"
                    onClick={copyPayableAmount}
                    variant="outline"
                    className="bg-white border-yellow-500 hover:bg-yellow-50"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-yellow-800">
                  Система автоматически зачислит средства при получении этой суммы
                </p>
              </div>
            ) : (
              <div className="bg-muted/30 border-2 border-muted rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Сумма для перевода:</p>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {Number(depositData.payableAmount).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG 
                  value={depositData.walletAddress}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-muted-foreground">Адрес для пополнения:</p>
              <div className="p-4 bg-muted/50 rounded-lg break-all font-mono text-sm font-medium">
                {depositData.walletAddress}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={copyAddress}
                className="gap-2 font-bold"
                variant={copied ? "secondary" : "outline"}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Скопировать
                  </>
                )}
              </Button>

              <Button 
                onClick={openInTronScan}
                className="gap-2 font-bold"
                variant="outline"
              >
                <ExternalLink className="w-4 h-4" />
                TronScan
              </Button>
            </div>
          </Card>

          {isPendingAndActive ? (
            <>
              <div className="space-y-3">
                <Button 
                  onClick={handleComplete}
                  className="w-full gap-2 min-h-[52px] rounded-xl gradient-primary text-white font-bold shadow-premium"
                >
                  Я отправил перевод
                </Button>

                <Button 
                  onClick={handleCreateNewRequest}
                  variant="outline"
                  className="w-full gap-2 min-h-[52px] rounded-xl font-bold border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  Создать новую заявку
                </Button>

                <Button 
                  onClick={handleCancelDeposit}
                  variant="outline"
                  className="w-full gap-2 min-h-[52px] rounded-xl font-bold border-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Отменить заявку
                </Button>
              </div>

              <Card className="p-4 bg-muted/50 border-muted rounded-2xl">
                <p className="text-sm text-muted-foreground">
                  <strong>Важно:</strong> Переведите ровно <strong>{Number(depositData.payableAmount).toFixed(2)} USDT</strong> на указанный адрес. 
                  Средства будут автоматически зачислены после подтверждения в блокчейне (обычно 1-2 минуты).
                </p>
              </Card>
            </>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={handleCreateNewRequest}
                className="w-full gap-2 min-h-[52px] rounded-xl gradient-primary text-white font-bold shadow-premium"
              >
                Создать новую заявку
              </Button>
            </div>
          )}
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold text-center">
                ✅ Спасибо!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base pt-2">
                Ожидайте зачисления перевода в течении пары минут. Мы проверим транзакцию в блокчейне и автоматически зачислим средства на ваш баланс.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center">
              <AlertDialogAction
                onClick={handleConfirmAndGoBack}
                className="w-full sm:w-auto min-h-[48px] rounded-xl gradient-primary text-white font-bold shadow-premium"
              >
                Вернуться на главную
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                Достигнут лимит
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base pt-2">
                У вас уже открыто 3 заявки на пополнение. Пожалуйста, оплатите их или отмените перед созданием новой заявки.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center gap-2">
              {onNavigateToHistory && (
                <AlertDialogAction
                  onClick={() => {
                    setShowLimitDialog(false);
                    onNavigateToHistory();
                  }}
                  className="w-full sm:w-auto min-h-[48px] rounded-xl gradient-primary text-white font-bold shadow-premium gap-2"
                >
                  <History className="w-4 h-4" />
                  Перейти к истории
                </AlertDialogAction>
              )}
              <AlertDialogCancel
                onClick={() => setShowLimitDialog(false)}
                className="w-full sm:w-auto min-h-[48px] rounded-xl font-bold"
              >
                Закрыть
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
