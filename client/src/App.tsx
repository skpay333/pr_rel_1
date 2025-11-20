import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as api from "./lib/api";

import BottomNavigation from "@/components/BottomNavigation";
import { Zap } from "lucide-react";

const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const OperatorPanel = lazy(() => import("@/pages/OperatorPanel"));
const DashboardPage = lazy(() => import("@/components/DashboardPage"));
const TopUpPage = lazy(() => import("@/components/TopUpPage"));
const PayPage = lazy(() => import("@/components/PayPage"));
const HistoryPage = lazy(() => import("@/components/HistoryPage"));
const RequestDetailPage = lazy(() => import("@/components/RequestDetailPage"));
const InstructionsPage = lazy(() => import("@/components/InstructionsPage"));
const SettingsPage = lazy(() => import("@/components/SettingsPage"));

import type { PaymentDraft } from "@/components/PayPage";

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-6">
      <div className="relative inline-block">
        <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <Zap className="w-10 h-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-tight">Загрузка...</h2>
    </div>
  </div>
);

type Tab = 'home' | 'history' | 'instructions' | 'settings';
type HomeView = 'dashboard' | 'topup' | 'pay';
type HistoryView = 'list' | 'detail';

export interface Transaction {
  id: string;
  type: 'payment' | 'deposit';
  amountRub: number;
  amountUsdt: number;
  frozenRate?: number;
  urgency?: 'urgent' | 'standard';
  hasUrgentFee?: boolean;
  usdtFrozen?: number;
  attachments?: Array<{type: 'image' | 'link' | 'pdf' | 'doc' | 'docx'; value: string; name?: string}>;
  comment?: string;
  status: 'submitted' | 'processing' | 'paid' | 'rejected' | 'cancelled' | 'pending' | 'confirmed' | 'expired';
  createdAt: string;
  receipt?: {type: 'pdf' | 'image'; value: string; name: string; mimeType: string};
  txHash?: string;
  confirmedAt?: string;
  payableAmount?: number;
  expiresAt?: string;
  requestedAmount?: number;
  walletAddress?: string;
}

export interface Notification {
  id: string;
  requestId?: string;
  type?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [homeView, setHomeView] = useState<HomeView>('dashboard');
  const [historyView, setHistoryView] = useState<HistoryView>('list');
  const [availableUsdt, setAvailableUsdt] = useState(0);
  const [frozenUsdt, setFrozenUsdt] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(90);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [registeredAt, setRegisteredAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const previousTabRef = useRef<Tab | null>(null);
  
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [signupBonusActive, setSignupBonusActive] = useState(0);
  const [signupBonusAmount, setSignupBonusAmount] = useState(0);
  const [signupBonusExpiresAt, setSignupBonusExpiresAt] = useState<string | null>(null);

  const walletAddress = import.meta.env.VITE_TRC20_WALLET || "TX1111111111111111111111";

  const totalUsdt = availableUsdt + frozenUsdt;

  // Check if on admin or operator route
  const isAdminRoute = window.location.pathname === '/admin';
  const isOperatorRoute = window.location.pathname === '/operator';

  // Helper function to load all transactions (payments + deposits)
  const loadAllTransactions = async (userId: string, currentRate?: number) => {
    try {
      // Load payment requests and deposits in parallel for faster loading
      const [payments, deposits] = await Promise.all([
        api.getUserPaymentRequests(userId),
        api.getUserDeposits(userId)
      ]);

      const paymentTransactions: Transaction[] = payments.map((p: any) => ({
        ...p,
        type: 'payment' as const,
      }));

      const rate = currentRate || exchangeRate || 80;
      const depositTransactions: Transaction[] = deposits.map((d: any) => ({
        id: d.id,
        type: 'deposit' as const,
        amountRub: d.amount * rate,
        amountUsdt: d.amount,
        status: d.status === 'confirmed' ? 'paid' : d.status,
        createdAt: d.createdAt,
        txHash: d.txHash,
        confirmedAt: d.confirmedAt,
        payableAmount: d.payableAmount ? parseFloat(d.payableAmount) : undefined,
        expiresAt: d.expiresAt,
        requestedAmount: d.requestedAmount ? parseFloat(d.requestedAmount) : undefined,
        walletAddress: d.walletAddress,
      }));

      // Combine and sort by date
      const allTransactions = [...paymentTransactions, ...depositTransactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  // Initialize Telegram WebApp and authenticate user
  useEffect(() => {
    const initializeApp = async () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Set theme colors (optional methods, available in newer Telegram versions)
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        if (tg.setHeaderColor) tg.setHeaderColor('bg_color');
        if (tg.setBackgroundColor) tg.setBackgroundColor('bg_color');

        // Get user data from Telegram
        const tgUser = tg.initDataUnsafe?.user;
        const initData = tg.initData;
        
        if (tgUser && initData) {
          try {
            // Authenticate with backend using validated initData
            const user = await api.authenticateUser(
              tgUser.id,
              tgUser.username || tgUser.first_name || `user_${tgUser.id}`,
              initData
            );

            setUserId(user.id);
            setUsername(user.username);
            setRegisteredAt(user.registeredAt);
            setAvailableUsdt(user.availableBalance);
            setFrozenUsdt(user.frozenBalance);

            // Use fullName and avatarUrl from backend (persisted data)
            // Fallback to Telegram user data if not available (for backward compatibility)
            let displayFullName = '';
            if (user.fullName && user.fullName.trim()) {
              displayFullName = user.fullName;
            } else {
              const firstName = tgUser.first_name || '';
              const lastName = tgUser.last_name || '';
              const telegramFullName = [firstName, lastName].filter(Boolean).join(' ');
              displayFullName = telegramFullName || tgUser.username || user.username || 'Пользователь';
            }
            setFullName(displayFullName);
            
            if (user.avatarUrl) {
              setAvatarUrl(user.avatarUrl);
            } else if (tgUser.photo_url) {
              setAvatarUrl(tgUser.photo_url);
            }

            // Set referral and signup bonus data
            if ('referrerId' in user) setReferrerId((user.referrerId as string | null) ?? null);
            if ('signupBonusActive' in user) setSignupBonusActive(Number(user.signupBonusActive) || 0);
            if ('signupBonusAmount' in user) setSignupBonusAmount(parseFloat(user.signupBonusAmount as any) || 0);
            if ('signupBonusExpiresAt' in user) setSignupBonusExpiresAt((user.signupBonusExpiresAt as string | null) ?? null);

            // Load transactions and notifications in parallel for faster loading
            await Promise.all([
              loadAllTransactions(user.id),
              api.getUserNotifications(user.id).then(notifs => setNotifications(notifs))
            ]);
          } catch (error) {
            console.error('Failed to authenticate:', error);
          }
        } else {
          // Fallback for testing outside Telegram (use demo user)
          console.log('Running outside Telegram, using demo mode');
          try {
            const user = await api.authenticateUser(12345, 'demo_user');
            setUserId(user.id);
            setUsername(user.username);
            setRegisteredAt(user.registeredAt);
            setAvailableUsdt(user.availableBalance);
            setFrozenUsdt(user.frozenBalance);
            
            // Use persisted data from backend
            setFullName(user.fullName || user.username);
            setAvatarUrl(user.avatarUrl || '');

            // Set referral and signup bonus data
            if ('referrerId' in user) setReferrerId((user.referrerId as string | null) ?? null);
            if ('signupBonusActive' in user) setSignupBonusActive(Number(user.signupBonusActive) || 0);
            if ('signupBonusAmount' in user) setSignupBonusAmount(parseFloat(user.signupBonusAmount as any) || 0);
            if ('signupBonusExpiresAt' in user) setSignupBonusExpiresAt((user.signupBonusExpiresAt as string | null) ?? null);

            // Load transactions and notifications in parallel for faster loading
            await Promise.all([
              loadAllTransactions(user.id),
              api.getUserNotifications(user.id).then(notifs => setNotifications(notifs))
            ]);
          } catch (error) {
            console.error('Failed to initialize demo mode:', error);
          }
        }
      } else {
        // Running outside Telegram completely
        console.log('Telegram WebApp not available, using demo mode');
        try {
          const user = await api.authenticateUser(12345, 'demo_user');
          setUserId(user.id);
          setUsername(user.username);
          setRegisteredAt(user.registeredAt);
          setAvailableUsdt(user.availableBalance);
          setFrozenUsdt(user.frozenBalance);
          
          // Use persisted data from backend
          setFullName(user.fullName || user.username);
          setAvatarUrl(user.avatarUrl || '');

          // Set referral and signup bonus data
          if ('referrerId' in user) setReferrerId((user.referrerId as string | null) ?? null);
          if ('signupBonusActive' in user) setSignupBonusActive(Number(user.signupBonusActive) || 0);
          if ('signupBonusAmount' in user) setSignupBonusAmount(parseFloat(user.signupBonusAmount as any) || 0);
          if ('signupBonusExpiresAt' in user) setSignupBonusExpiresAt((user.signupBonusExpiresAt as string | null) ?? null);

          // Load transactions and notifications in parallel for faster loading
          await Promise.all([
            loadAllTransactions(user.id),
            api.getUserNotifications(user.id).then(notifs => setNotifications(notifs))
          ]);
        } catch (error) {
          console.error('Failed to initialize:', error);
        }
      }

      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // Fetch exchange rate periodically
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const rateData = await api.getExchangeRate();
        // Only update if data was returned (not 304 Not Modified)
        if (rateData) {
          setExchangeRate(rateData.rate);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          error
        });
      }
    };

    fetchRate();
    const interval = setInterval(fetchRate, 5000);
    return () => clearInterval(interval);
  }, []);

  // Refresh balance periodically
  useEffect(() => {
    if (!userId) return;

    const refreshBalance = async () => {
      try {
        const balance = await api.getUserBalance(userId);
        // Only update if data was returned (not 304 Not Modified)
        if (balance) {
          setAvailableUsdt(balance.availableBalance);
          setFrozenUsdt(balance.frozenBalance);
        }
      } catch (error) {
        console.error('Failed to refresh balance:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          error
        });
      }
    };

    const interval = setInterval(refreshBalance, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleTopUpComplete = async (amount: number) => {
    if (!userId) return;
    
    // Simulate top-up (in real app, this would be handled by backend after deposit confirmation)
    setAvailableUsdt(prev => prev + amount);
    
    // Refresh from server
    try {
      const balance = await api.getUserBalance(userId);
      // Only update if data was returned (not 304 Not Modified)
      if (balance) {
        setAvailableUsdt(balance.availableBalance);
        setFrozenUsdt(balance.frozenBalance);
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  const handlePaymentSubmit = async (data: PaymentDraft) => {
    if (!userId) {
      console.error('Payment submit failed: userId is missing');
      alert('Не удалось создать заявку. Попробуйте снова.');
      return;
    }

    try {
      const requestData = {
        userId,
        amountRub: data.amountRub,
        amountUsdt: data.amountUsdt,
        frozenRate: data.frozenRate,
        urgency: data.urgency,
        attachments: data.attachments,
        comment: data.comment,
      };

      console.log('Creating payment request with data:', {
        userId,
        amountRub: data.amountRub,
        amountUsdt: data.amountUsdt,
        frozenRate: data.frozenRate,
        urgency: data.urgency,
        attachmentsCount: data.attachments.length,
        attachmentsTypes: data.attachments.map(a => ({ type: a.type, hasValue: !!a.value, valueLength: a.value?.length })),
        comment: data.comment,
      });

      const request = await api.createPaymentRequest(requestData);

      console.log('Payment request created successfully:', request);

      // Add to local state
      setTransactions(prev => [request as Transaction, ...prev]);
      setAvailableUsdt(prev => prev - data.amountUsdt);
      setFrozenUsdt(prev => prev + data.amountUsdt);
      setPaymentDraft(null);
      setHomeView('dashboard');

      // Refresh notifications (non-blocking, failures won't affect success)
      try {
        const notifs = await api.getUserNotifications(userId);
        setNotifications(notifs);
      } catch (notifError) {
        console.error('Failed to refresh notifications after payment creation:', notifError);
      }
    } catch (error) {
      console.error('Failed to create payment request - Detailed error:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      if (error instanceof Error) {
        alert(`Не удалось создать заявку. Ошибка: ${error.message}`);
      } else {
        alert('Не удалось создать заявку. Попробуйте снова.');
      }
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await api.updatePaymentRequestStatus(requestId, 'cancelled');

      // Update local state
      setTransactions(prev => prev.map(tx => {
        if (tx.id === requestId) {
          const frozenAmount = tx.usdtFrozen || 0;
          setAvailableUsdt(a => a + frozenAmount);
          setFrozenUsdt(f => f - frozenAmount);
          return { ...tx, status: 'cancelled' as const };
        }
        return tx;
      }));

      // Refresh notifications
      if (userId) {
        const notifs = await api.getUserNotifications(userId);
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleClearData = async () => {
    if (confirm('Вы уверены, что хотите очистить все тестовые данные? Это действие нельзя отменить.')) {
      // In production, this would call an API endpoint to clear user data
      setTransactions([]);
      setNotifications([]);
      setPaymentDraft(null);
      console.log('Данные очищены (только локально в тестовом режиме)');
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      setHistoryView('list');
    }
    if (tab === 'home') {
      setHomeView('dashboard');
    }
  };

  // Auto-refresh data when switching tabs
  useEffect(() => {
    if (!userId) return;
    
    // Only refresh if tab actually changed (not on first render)
    if (previousTabRef.current === activeTab) return;
    
    // Skip refresh on initial load
    if (previousTabRef.current === null && isLoading) {
      previousTabRef.current = activeTab;
      return;
    }

    const refreshData = async () => {
      try {
        if (activeTab === 'home') {
          // Refresh balance on home tab
          const balance = await api.getUserBalance(userId);
          if (balance) {
            setAvailableUsdt(balance.availableBalance);
            setFrozenUsdt(balance.frozenBalance);
          }
        } else if (activeTab === 'history') {
          // Refresh transactions on history tab
          await loadAllTransactions(userId, exchangeRate);
        } else if (activeTab === 'settings') {
          // Refresh notifications on settings tab
          const notifs = await api.getUserNotifications(userId);
          setNotifications(notifs);
        }
      } catch (error) {
        console.error('Failed to refresh data on tab change:', error);
      }
    };

    refreshData();
    previousTabRef.current = activeTab;
  }, [activeTab, userId, exchangeRate, isLoading]);

  const handleGoHome = () => {
    setActiveTab('home');
    setHomeView('dashboard');
    setPaymentDraft(null);
  };

  const handleViewRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setHistoryView('detail');
  };

  const handleOpenDeposit = (depositId: string) => {
    setSelectedDepositId(depositId);
    setActiveTab('home');
    setHomeView('topup');
  };

  const handleRefreshTransactions = async () => {
    if (!userId) return;
    
    try {
      await loadAllTransactions(userId, exchangeRate);
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const selectedRequest = selectedRequestId 
    ? transactions.find(t => t.id === selectedRequestId)
    : null;

  // Show admin panel if on /admin route
  if (isAdminRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPanel />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show operator panel if on /operator route
  if (isOperatorRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <OperatorPanel />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Zap className="w-10 h-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Загрузка...</h2>
          <p className="text-sm text-muted-foreground font-medium">Подключение к серверу</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">

          {/* HOME TAB */}
          {activeTab === 'home' && (
            <Suspense fallback={<LoadingSpinner />}>
              {homeView === 'dashboard' && (
                <DashboardPage
                  availableUsdt={availableUsdt}
                  frozenUsdt={frozenUsdt}
                  exchangeRate={exchangeRate}
                  onTopUp={() => setHomeView('topup')}
                  onPay={() => {
                    setHomeView('pay');
                  }}
                  hasDraft={paymentDraft !== null}
                  username={username}
                  fullName={fullName}
                  avatarUrl={avatarUrl}
                  signupBonusActive={signupBonusActive}
                  signupBonusAmount={signupBonusAmount}
                  signupBonusExpiresAt={signupBonusExpiresAt}
                />
              )}

              {homeView === 'topup' && (
                <TopUpPage
                  userId={userId || undefined}
                  depositId={selectedDepositId || undefined}
                  onBack={() => {
                    setHomeView('dashboard');
                    setSelectedDepositId(null);
                  }}
                  onTopUpComplete={handleTopUpComplete}
                  onNavigateToHistory={() => {
                    setActiveTab('history');
                    setHistoryView('list');
                  }}
                />
              )}

              {homeView === 'pay' && (
                <PayPage
                  exchangeRate={exchangeRate}
                  availableUsdt={availableUsdt}
                  onBack={() => {
                    setHomeView('dashboard');
                  }}
                  onSubmit={handlePaymentSubmit}
                  draft={paymentDraft}
                  onDraftChange={setPaymentDraft}
                />
              )}
            </Suspense>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <Suspense fallback={<LoadingSpinner />}>
              {historyView === 'list' && (
                <HistoryPage 
                  transactions={transactions}
                  onGoHome={handleGoHome}
                  onViewRequest={handleViewRequest}
                  onOpenDeposit={handleOpenDeposit}
                  onRefresh={handleRefreshTransactions}
                />
              )}

              {historyView === 'detail' && selectedRequest && (
                <RequestDetailPage
                  request={selectedRequest}
                  onBack={() => setHistoryView('list')}
                  onCancelRequest={handleCancelRequest}
                />
              )}
            </Suspense>
          )}

          {/* INSTRUCTIONS TAB */}
          {activeTab === 'instructions' && (
            <Suspense fallback={<LoadingSpinner />}>
              <InstructionsPage />
            </Suspense>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <Suspense fallback={<LoadingSpinner />}>
              <SettingsPage
                username={username}
                registeredAt={registeredAt}
                notifications={notifications}
                onClearData={handleClearData}
                onMarkNotificationRead={handleMarkNotificationRead}
                userId={userId}
                referrerId={referrerId}
                avatarUrl={avatarUrl}
              />
            </Suspense>
          )}

          <BottomNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            unreadCount={notifications.filter(n => !n.isRead).length}
          />

          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
