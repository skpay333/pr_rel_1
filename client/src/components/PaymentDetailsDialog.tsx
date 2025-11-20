import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Clock, User, DollarSign, FileText, Download, ExternalLink, AlertCircle, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';
import type { PaymentRequestDetails } from '@/lib/api';
import { formatMskDateTime } from '@/lib/utils';

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  isAdmin: boolean;
  adminPassword?: string;
  operatorId?: string;
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

export default function PaymentDetailsDialog({
  open,
  onOpenChange,
  paymentId,
  isAdmin,
  adminPassword,
  operatorId,
}: PaymentDetailsDialogProps) {
  const [details, setDetails] = useState<PaymentRequestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && paymentId) {
      loadDetails();
    }
  }, [open, paymentId]);

  const loadDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let data: PaymentRequestDetails;
      
      if (isAdmin && adminPassword) {
        data = await api.adminGetPaymentDetails(adminPassword, paymentId);
      } else if (!isAdmin && operatorId) {
        data = await api.operatorGetPaymentDetails(operatorId, paymentId);
      } else {
        throw new Error('Missing required parameters');
      }
      
      setDetails(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить детали заявки';
      setError(errorMessage);
      
      if (errorMessage.includes('Доступ запрещен')) {
        toast({
          title: 'Доступ запрещен',
          description: 'Вы можете просматривать только назначенные вам заявки',
          variant: 'destructive',
        });
        onOpenChange(false);
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

  const downloadAttachment = (attachment: any) => {
    if (attachment.type === 'link') {
      window.open(attachment.value, '_blank');
    } else if (attachment.type === 'image') {
      const link = document.createElement('a');
      link.href = attachment.value;
      link.download = attachment.name || 'attachment.jpg';
      link.click();
    } else {
      const link = document.createElement('a');
      link.href = attachment.value;
      link.download = attachment.name || `attachment.${attachment.type}`;
      link.click();
    }
  };

  const renderAttachment = (attachment: any, index: number) => {
    if (attachment.type === 'image') {
      return (
        <div key={index} className="relative group">
          <img
            src={attachment.value}
            alt={attachment.name || `Attachment ${index + 1}`}
            className="max-w-full max-h-64 rounded border object-contain cursor-pointer"
            onClick={() => window.open(attachment.value, '_blank')}
          />
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => downloadAttachment(attachment)}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    if (attachment.type === 'link') {
      return (
        <Button
          key={index}
          variant="outline"
          className="w-full justify-start"
          onClick={() => window.open(attachment.value, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {attachment.name || attachment.value}
        </Button>
      );
    }

    return (
      <Button
        key={index}
        variant="outline"
        className="w-full justify-start"
        onClick={() => downloadAttachment(attachment)}
      >
        <FileText className="w-4 h-4 mr-2" />
        {attachment.name || `${attachment.type.toUpperCase()} файл`}
        <Download className="w-4 h-4 ml-auto" />
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали заявки</DialogTitle>
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
                {details.telegramId && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Telegram ID:</span>
                    <span className="ml-2 font-mono">{details.telegramId}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Данные платежа
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Сумма в рублях</p>
                    <p className="text-xl font-bold">{details.amountRub.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Сумма в USDT</p>
                    <p className="text-xl font-bold">{details.amountUsdt.toFixed(2)} USDT</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Курс</p>
                    <p className="font-medium">{details.frozenRate.toFixed(2)} ₽/USDT</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Срочность</p>
                    <Badge variant={details.urgency === 'urgent' ? 'destructive' : 'secondary'}>
                      {details.urgency === 'urgent' ? 'СРОЧНО' : 'ОБЫЧНАЯ'}
                    </Badge>
                  </div>
                </div>
                {details.hasUrgentFee && (
                  <p className="text-sm text-muted-foreground">
                    * Включена комиссия за срочную обработку
                  </p>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Статус</p>
                  <Badge className={statusColors[details.status] || 'bg-muted'}>
                    {statusLabels[details.status] || details.status.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Временная шкала
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Создано</p>
                    <p className="text-xs text-muted-foreground">{formatMskDateTime(details.createdAt)}</p>
                  </div>
                </div>
                {details.assignedAt && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Назначено</p>
                      <p className="text-xs text-muted-foreground">{formatMskDateTime(details.assignedAt)}</p>
                    </div>
                  </div>
                )}
                {details.completedAt && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${details.status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Завершено</p>
                      <p className="text-xs text-muted-foreground">{formatMskDateTime(details.completedAt)}</p>
                    </div>
                  </div>
                )}
                {details.processingTimeMinutes !== null && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Время обработки: <span className="font-medium">{details.processingTimeMinutes} мин</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {details.assignedOperatorLogin && (
              <Card>
                <CardHeader>
                  <CardTitle>Назначенный оператор</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{details.assignedOperatorLogin}</p>
                </CardContent>
              </Card>
            )}

            {details.comment && (
              <Card>
                <CardHeader>
                  <CardTitle>Комментарий клиента</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{details.comment}</p>
                </CardContent>
              </Card>
            )}

            {details.adminComment && (
              <Card>
                <CardHeader>
                  <CardTitle>Комментарий администратора</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{details.adminComment}</p>
                </CardContent>
              </Card>
            )}

            {details.attachments && details.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Вложения</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {details.attachments.map((attachment, index) => renderAttachment(attachment, index))}
                </CardContent>
              </Card>
            )}

            {details.receipt && (
              <Card>
                <CardHeader>
                  <CardTitle>Чек оплаты</CardTitle>
                </CardHeader>
                <CardContent>
                  {details.receipt.type === 'image' ? (
                    <img
                      src={details.receipt.value}
                      alt="Receipt"
                      className="max-w-full max-h-64 rounded border object-contain"
                    />
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => window.open(details.receipt.value, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Скачать чек ({details.receipt.name})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
