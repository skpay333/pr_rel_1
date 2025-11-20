import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Trash2, User, Bell, CheckCircle, Copy, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { formatUsdt } from "@/lib/utils";
import type { Notification } from "@/App";

interface SettingsPageProps {
  username: string;
  registeredAt: string;
  notifications: Notification[];
  onClearData: () => void;
  onMarkNotificationRead: (id: string) => void;
  userId: string | null;
  referrerId: string | null;
  avatarUrl?: string;
}

export default function SettingsPage({ username, registeredAt, notifications, onClearData, onMarkNotificationRead, userId, referrerId, avatarUrl }: SettingsPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const markedAsReadRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const [referralStats, setReferralStats] = useState<api.ReferralStats | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [isLoadingReferral, setIsLoadingReferral] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [activationMessageType, setActivationMessageType] = useState<'success' | 'error' | null>(null);

  const formattedDate = new Date(registeredAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const recentNotifications = notifications.slice(0, 2);
  const hasMoreNotifications = notifications.length > 2;

  useEffect(() => {
    if (notifications.length === 0) return;
    
    const unreadNotifications = notifications.filter(n => !n.isRead);
    const firstTwoUnread = unreadNotifications.slice(0, 2);
    
    firstTwoUnread.forEach(notification => {
      if (!markedAsReadRef.current.has(notification.id)) {
        markedAsReadRef.current.add(notification.id);
        onMarkNotificationRead(notification.id);
      }
    });
  }, [notifications, onMarkNotificationRead]);

  useEffect(() => {
    if (userId) {
      loadReferralStats();
    }
  }, [userId]);

  const loadReferralStats = async () => {
    if (!userId) return;
    
    setIsLoadingReferral(true);
    try {
      const stats = await api.getReferralStats(userId);
      setReferralStats(stats);
    } catch (error) {
      console.error('Failed to load referral stats:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить реферальную статистику",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReferral(false);
    }
  };

  const handleCopyPromoCode = () => {
    if (referralStats?.promoCode) {
      navigator.clipboard.writeText(referralStats.promoCode);
      toast({
        title: "Промокод скопирован",
        description: `Код ${referralStats.promoCode} скопирован в буфер обмена`,
      });
    }
  };

  const handleActivateReferralCode = async () => {
    setActivationMessage(null);
    setActivationMessageType(null);

    if (!userId || !referralCodeInput.trim()) {
      setActivationMessage("Введите промокод");
      setActivationMessageType("error");
      return;
    }

    if (referralCodeInput.trim().toUpperCase() === referralStats?.promoCode?.toUpperCase()) {
      setActivationMessage("Нельзя использовать свой промокод");
      setActivationMessageType("error");
      return;
    }

    setIsActivating(true);
    try {
      await api.activateReferralCode(userId, referralCodeInput.trim());
      setActivationMessage("Ваш бонус успешно зачислен на баланс");
      setActivationMessageType("success");
      setReferralCodeInput("");
      await loadReferralStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Не удалось активировать промокод";
      setActivationMessage(errorMessage);
      setActivationMessageType("error");
    } finally {
      setIsActivating(false);
    }
  };

  const handleWithdrawReferralBalance = async () => {
    if (!userId) return;

    setIsWithdrawing(true);
    try {
      const result = await api.withdrawReferralBalance(userId);
      toast({
        title: "Успешно!",
        description: "Средства переведены на основной баланс",
      });
      setIsWithdrawDialogOpen(false);
      await loadReferralStats();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось вывести средства",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-6 pt-8 pb-28 bg-background">
      <div className="max-w-md w-full mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Настройки</h1>

        <Card className="p-6 shadow-soft">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-20 h-20 shadow-soft-sm">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
              <AvatarFallback className="bg-accent text-white text-2xl font-bold">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground" data-testid="text-username">
                {username}
              </h2>
              <p className="text-sm text-muted-foreground font-medium" data-testid="text-registered-date">
                Дата регистрации: {formattedDate}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-5 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Имя в Telegram:</span>
              <span className="text-foreground font-bold">@{username}</span>
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">История уведомлений</h2>
            </div>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white" data-testid="badge-unread-count">
                {unreadCount}
              </Badge>
            )}
          </div>

          {notifications.length === 0 ? (
            <Card className="p-8 shadow-soft">
              <p className="text-center text-muted-foreground font-medium">Нет уведомлений</p>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`p-4 shadow-soft ${
                      notification.isRead ? 'bg-card' : 'bg-blue-50 border-blue-200'
                    }`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {hasMoreNotifications && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-muted-foreground hover:text-foreground"
                      data-testid="button-all-notifications"
                    >
                      Все уведомления ({notifications.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Все уведомления</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <Card
                            key={notification.id}
                            className={`p-4 shadow-soft ${
                              notification.isRead ? 'bg-card' : 'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(notification.createdAt).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>

        {/* Referral Program Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-foreground" />
            <h2 className="text-xl font-bold text-foreground">Реферальная программа</h2>
          </div>

          {isLoadingReferral ? (
            <Card className="p-8 shadow-soft">
              <p className="text-center text-muted-foreground font-medium">Загрузка...</p>
            </Card>
          ) : referralStats ? (
            <>
              {/* User's Promo Code */}
              <Card className="p-5 shadow-soft">
                <p className="text-sm font-semibold text-muted-foreground mb-2">Ваш промокод</p>
                <div className="flex items-center gap-2">
                  <Input
                    value={referralStats.promoCode || ''}
                    readOnly
                    className="font-mono font-bold text-lg"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPromoCode}
                    className="shrink-0"
                    disabled={!referralStats.promoCode}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Пригласите друзей и получайте 0.5% от суммы всех их платежей
                </p>
              </Card>

              {/* Activate Referral Code (if no referrer) */}
              {referralStats.referrerId === null && (
                <Card className="p-5 shadow-soft">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">
                    Активировать промокод
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Введите промокод"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value)}
                    />
                    <Button
                      onClick={handleActivateReferralCode}
                      disabled={isActivating || !referralCodeInput.trim()}
                      className="shrink-0"
                    >
                      {isActivating ? "..." : "Активировать"}
                    </Button>
                  </div>
                  
                  {/* Activation Message */}
                  {activationMessage && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      activationMessageType === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      <p className="text-sm font-medium">{activationMessage}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Referral Statistics */}
              <Card className="p-5 shadow-soft">
                <p className="text-sm font-semibold text-muted-foreground mb-4">Статистика</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Рефералов</p>
                    <p className="text-xl font-bold text-foreground">{referralStats.referralsCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Баланс</p>
                    <p className="text-xl font-bold text-primary">{formatUsdt(referralStats.referralBalance)} USDT</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Заработано</p>
                    <p className="text-lg font-semibold text-foreground">{formatUsdt(referralStats.referralTotalEarned)} USDT</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Выведено</p>
                    <p className="text-lg font-semibold text-foreground">{formatUsdt(referralStats.referralTotalWithdrawn)} USDT</p>
                  </div>
                </div>
              </Card>

              {/* Withdraw Button */}
              {referralStats.referralBalance >= 50 && (
                <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full font-bold"
                      size="lg"
                    >
                      Вывести на основной баланс
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Подтверждение вывода</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-center text-muted-foreground mb-2">Вы выводите:</p>
                      <p className="text-center text-3xl font-bold text-primary">
                        {formatUsdt(referralStats.referralBalance)} USDT
                      </p>
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        Средства будут зачислены на основной баланс
                      </p>
                    </div>
                    <DialogFooter className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsWithdrawDialogOpen(false)}
                        disabled={isWithdrawing}
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                      <Button
                        onClick={handleWithdrawReferralBalance}
                        disabled={isWithdrawing}
                        className="flex-1"
                      >
                        {isWithdrawing ? "..." : "Подтвердить"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          ) : null}
        </div>

        <Button
          variant="outline"
          className="w-full justify-center gap-2 min-h-[52px] text-destructive hover:text-destructive rounded-lg font-bold"
          onClick={onClearData}
          data-testid="button-clear-data"
        >
          <Trash2 className="w-5 h-5" />
          Очистить данные
        </Button>

        <p className="text-xs text-center text-muted-foreground font-medium" style={{ opacity: 0.6 }}>
          Romax Pay beta 1
        </p>
      </div>
    </div>
  );
}
