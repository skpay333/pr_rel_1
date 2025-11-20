import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Gift } from "lucide-react";
import { formatUsdt, formatRub } from "@/lib/utils";

interface DashboardPageProps {
  availableUsdt: number;
  frozenUsdt: number;
  exchangeRate: number;
  onTopUp: () => void;
  onPay: () => void;
  hasDraft?: boolean;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  signupBonusActive?: number;
  signupBonusAmount?: number;
  signupBonusExpiresAt?: string | null;
}

function useCountdown(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
}

export default function DashboardPage({ 
  availableUsdt, 
  frozenUsdt, 
  exchangeRate, 
  onTopUp, 
  onPay, 
  hasDraft,
  username = 'Пользователь',
  fullName,
  avatarUrl,
  signupBonusActive = 0,
  signupBonusAmount = 0,
  signupBonusExpiresAt = null
}: DashboardPageProps) {
  const equivalentRub = availableUsdt * exchangeRate;
  const displayName = fullName || username;
  const timeLeft = useCountdown(signupBonusExpiresAt);

  return (
    <div className="flex flex-col min-h-[90vh] px-4 sm:px-5 pt-4 sm:pt-5 pb-24 bg-background">
      <div className="max-w-md w-full mx-auto lg:max-w-[430px] space-y-4 sm:space-y-5 flex-1 flex flex-col pb-safe">
        
        {/* Header: Avatar + Full Name + BETA badge */}
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          {/* Avatar + Full Name */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-secondary border-2 border-accent flex items-center justify-center flex-shrink-0 overflow-hidden shadow-soft-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              )}
            </div>
            <div className="flex flex-col">
              <p className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
                {displayName}
              </p>
            </div>
          </div>

          {/* BETA Badge */}
          <div className="px-4 sm:px-5 py-2 bg-secondary border border-accent rounded-full shadow-soft-sm flex-shrink-0">
            <p className="text-sm sm:text-base font-semibold text-primary">БЕТА</p>
          </div>
        </div>

        {/* Signup Bonus Card */}
        {signupBonusActive === 1 && signupBonusExpiresAt && (
          <Card className="p-5 sm:p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-200 shadow-soft rounded-[20px] flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-soft-sm">
                <Gift className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                  Приветственный бонус
                </h3>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">
                  +{formatUsdt(signupBonusAmount)} USDT
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>⏱</span>
                  <span>
                    Осталось: {timeLeft.days > 0 && `${timeLeft.days} дн `}
                    {timeLeft.hours} ч {timeLeft.minutes} мин
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* USDT Balance Card - Mint Green #DFF9EB */}
        <Card className="p-6 sm:p-8 bg-[#DFF9EB] shadow-soft rounded-[24px] flex-shrink-0" data-testid="card-usdt-balance">
          <p className="text-base sm:text-lg font-semibold text-center mb-2 text-primary">
            USDT
          </p>
          <p className="text-5xl sm:text-6xl font-bold text-center tabular-nums text-primary" data-testid="text-usdt-amount">
            {formatUsdt(availableUsdt)}
          </p>
        </Card>

        {/* Frozen Balance - Only if > 0 */}
        {frozenUsdt > 0 && (
          <div className="p-3 sm:p-4 bg-[#FFF3E0] border border-[#F4A261] rounded-[20px] shadow-soft-sm flex items-center justify-center gap-2 flex-shrink-0">
            <span className="text-lg">🔒</span>
            <p className="text-sm sm:text-base font-medium text-[#F4A261]">
              Заморожено: {formatUsdt(frozenUsdt)} USDT
            </p>
          </div>
        )}

        {/* Exchange Rate Card - Dark Teal #0B3D4A */}
        <div className="p-5 sm:p-6 bg-primary shadow-soft rounded-[20px] flex-shrink-0" data-testid="card-exchange-rate">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl sm:text-3xl font-semibold text-primary-foreground">1 USDT</span>
            <span className="text-3xl sm:text-4xl font-semibold text-primary-foreground">=</span>
            <span className="text-2xl sm:text-3xl font-semibold text-primary-foreground">{exchangeRate.toFixed(2)} ₽</span>
          </div>
        </div>

        {/* RUB Equivalent Card - White */}
        <Card className="flex-1 flex flex-col justify-center py-6 sm:py-8 min-h-[120px] bg-card shadow-soft rounded-[20px]">
          <p className="text-base sm:text-lg font-semibold text-center mb-2 text-primary">
            Эквивалент в ₽
          </p>
          <p className="text-5xl sm:text-6xl font-bold text-center tabular-nums text-primary" data-testid="text-rub-amount">
            {formatRub(equivalentRub)}
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          {/* Пополнить - Outlined mint color */}
          <Button 
            variant="outline"
            size="lg"
            className="h-14 sm:h-16 text-lg sm:text-xl font-medium"
            onClick={onTopUp}
            data-testid="button-top-up"
          >
            Пополнить
          </Button>
          
          {/* Оплатить - Filled dark-teal */}
          <Button 
            variant="default"
            size="lg"
            className="relative h-14 sm:h-16 text-lg sm:text-xl font-medium overflow-visible"
            onClick={onPay}
            data-testid="button-pay"
          >
            {hasDraft ? 'Продолжить' : 'Оплатить'}
            {hasDraft && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full shadow-soft-sm border-2 border-background"></span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
