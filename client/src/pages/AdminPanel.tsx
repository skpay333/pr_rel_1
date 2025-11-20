import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Plus, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';
import type { AdminUser, AdminPaymentRequest, AdminDeposit, Operator } from '@/lib/api';
import { formatMskDateTime, formatPayableUsdt } from '@/lib/utils';
import PaymentDetailsDialog from '@/components/PaymentDetailsDialog';
import DepositDetailsDialog from '@/components/DepositDetailsDialog';
import UserStatsDialog from '@/components/UserStatsDialog';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRequest[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  
  const [depositTab, setDepositTab] = useState<'pending' | 'history'>('pending');
  const [paymentTab, setPaymentTab] = useState<'active' | 'history'>('active');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [depositStatusFilter, setDepositStatusFilter] = useState<string>('all');
  
  const [editBalanceDialog, setEditBalanceDialog] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [addDepositDialog, setAddDepositDialog] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [processPaymentDialog, setProcessPaymentDialog] = useState<{ open: boolean; payment: AdminPaymentRequest | null; details: any | null }>({ open: false, payment: null, details: null });
  const [paymentDetailsDialog, setPaymentDetailsDialog] = useState<{ open: boolean; paymentId: string | null }>({ open: false, paymentId: null });
  const [depositDetailsDialog, setDepositDetailsDialog] = useState<{ open: boolean; depositId: string | null }>({ open: false, depositId: null });
  const [manualConfirmDialog, setManualConfirmDialog] = useState<{ open: boolean; deposit: AdminDeposit | null }>({ open: false, deposit: null });
  const [createOperatorDialog, setCreateOperatorDialog] = useState(false);
  const [operatorLogin, setOperatorLogin] = useState('');
  const [operatorPassword, setOperatorPassword] = useState('');
  const [editOperatorDialog, setEditOperatorDialog] = useState<{ open: boolean; operator: Operator | null }>({ open: false, operator: null });
  const [editOperatorForm, setEditOperatorForm] = useState({ login: '', password: '' });
  const [operatorStatsDialog, setOperatorStatsDialog] = useState<{ open: boolean; operatorId: string | null; stats: any | null }>({ open: false, operatorId: null, stats: null });
  const [deleteOperatorDialog, setDeleteOperatorDialog] = useState<{ open: boolean; operatorId: string | null }>({ open: false, operatorId: null });
  const [userStatsDialog, setUserStatsDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  
  const [balanceForm, setBalanceForm] = useState({ available: 0, frozen: 0 });
  const [depositAmount, setDepositAmount] = useState(0);
  const [manualDepositAmount, setManualDepositAmount] = useState(0);
  const [manualTxHash, setManualTxHash] = useState('');
  const [processStatus, setProcessStatus] = useState<'paid' | 'rejected'>('paid');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [editedAmountRub, setEditedAmountRub] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      await api.adminLogin(password);
      setAdminPassword(password);
      setIsAuthenticated(true);
      toast({
        title: 'Успешный вход',
        description: 'Добро пожаловать в админ-панель',
      });
    } catch (error) {
      toast({
        title: 'Ошибка входа',
        description: error instanceof Error ? error.message : 'Неверный пароль',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadUsers = async () => {
    if (!adminPassword) return;
    setIsLoadingUsers(true);
    try {
      const data = await api.adminGetAllUsers(adminPassword);
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить пользователей',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadPayments = async () => {
    if (!adminPassword) return;
    setIsLoadingPayments(true);
    try {
      let filters: { status?: string; urgency?: string };
      
      if (paymentTab === 'active') {
        // Active tab - create filters with urgency
        filters = {
          status: 'active',
          ...(urgencyFilter !== 'all' && { urgency: urgencyFilter })
        };
      } else {
        // History tab - create filters without urgency
        filters = {
          status: paymentStatusFilter === 'all' ? 'completed' : paymentStatusFilter
        };
      }
      
      const data = await api.adminGetAllPayments(adminPassword, filters);
      setPayments(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заявки',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const loadDeposits = async () => {
    if (!adminPassword) return;
    setIsLoadingDeposits(true);
    try {
      const data = depositTab === 'pending' 
        ? await api.adminGetPendingDeposits(adminPassword)
        : await api.adminGetAllDeposits(adminPassword, depositStatusFilter);
      setDeposits(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить депозиты',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDeposits(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
      loadPayments();
      loadDeposits();
      loadOperators();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPayments();
    }
  }, [paymentTab, urgencyFilter, paymentStatusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDeposits();
    }
  }, [depositTab, depositStatusFilter]);

  const handleUpdateBalance = async () => {
    if (!editBalanceDialog.user || !adminPassword) return;
    
    try {
      await api.adminUpdateUserBalance(
        adminPassword,
        editBalanceDialog.user.id,
        balanceForm.available,
        balanceForm.frozen
      );
      
      toast({
        title: 'Успешно',
        description: 'Баланс пользователя обновлен',
      });
      
      setEditBalanceDialog({ open: false, user: null });
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить баланс',
        variant: 'destructive',
      });
    }
  };

  const handleAddDeposit = async () => {
    if (!addDepositDialog.user || !adminPassword) return;
    
    try {
      await api.adminAddDeposit(
        adminPassword,
        addDepositDialog.user.id,
        depositAmount
      );
      
      toast({
        title: 'Успешно',
        description: `Добавлено ${depositAmount} USDT`,
      });
      
      setAddDepositDialog({ open: false, user: null });
      setDepositAmount(0);
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить депозит',
        variant: 'destructive',
      });
    }
  };

  const handleApprovePayment = async (requestId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminApprovePayment(adminPassword, requestId);
      
      toast({
        title: 'Успешно',
        description: 'Заявка одобрена',
      });
      
      loadPayments();
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось одобрить заявку',
        variant: 'destructive',
      });
    }
  };

  const handleCancelPayment = async (requestId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminCancelPayment(adminPassword, requestId);
      
      toast({
        title: 'Успешно',
        description: 'Заявка отменена',
      });
      
      loadPayments();
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отменить заявку',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDeposit = async (depositId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminConfirmDeposit(adminPassword, depositId);
      
      toast({
        title: 'Успешно',
        description: 'Депозит подтверждён',
      });
      
      loadDeposits();
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось подтвердить депозит',
        variant: 'destructive',
      });
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminRejectDeposit(adminPassword, depositId);
      
      toast({
        title: 'Успешно',
        description: 'Депозит отклонён',
      });
      
      loadDeposits();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отклонить депозит',
        variant: 'destructive',
      });
    }
  };

  const handleManualConfirmDeposit = async () => {
    if (!adminPassword || !manualConfirmDialog.deposit) return;
    
    if (!manualDepositAmount || manualDepositAmount <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректную сумму',
        variant: 'destructive',
      });
      return;
    }

    if (!manualTxHash || manualTxHash.trim() === '') {
      toast({
        title: 'Ошибка',
        description: 'Введите TX Hash транзакции',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      await api.adminManualConfirmDeposit(
        adminPassword,
        manualConfirmDialog.deposit.id,
        manualDepositAmount,
        manualTxHash
      );
      
      toast({
        title: 'Успешно',
        description: `Депозит подтверждён на сумму ${manualDepositAmount.toFixed(2)} USDT`,
      });
      
      setManualConfirmDialog({ open: false, deposit: null });
      setManualDepositAmount(0);
      setManualTxHash('');
      loadDeposits();
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось подтвердить депозит',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadOperators = async () => {
    if (!adminPassword) return;
    setIsLoadingOperators(true);
    try {
      const data = await api.adminGetAllOperators(adminPassword);
      setOperators(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить операторов',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingOperators(false);
    }
  };

  const handleCreateOperator = async () => {
    if (!adminPassword || !operatorLogin || !operatorPassword) return;
    
    try {
      await api.adminCreateOperator(adminPassword, operatorLogin, operatorPassword);
      
      toast({
        title: 'Успешно',
        description: 'Оператор создан',
      });
      
      setCreateOperatorDialog(false);
      setOperatorLogin('');
      setOperatorPassword('');
      loadOperators();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать оператора',
        variant: 'destructive',
      });
    }
  };

  const handleToggleOperatorStatus = async (operatorId: string, currentStatus: boolean) => {
    if (!adminPassword) return;
    
    try {
      await api.adminUpdateOperatorStatus(adminPassword, operatorId, !currentStatus);
      
      toast({
        title: 'Успешно',
        description: `Оператор ${!currentStatus ? 'активирован' : 'деактивирован'}`,
      });
      
      loadOperators();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить статус',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOperator = async () => {
    if (!adminPassword || !deleteOperatorDialog.operatorId) return;
    
    try {
      await api.adminDeleteOperator(adminPassword, deleteOperatorDialog.operatorId);
      
      toast({
        title: 'Успешно',
        description: 'Оператор удалён',
      });
      
      setDeleteOperatorDialog({ open: false, operatorId: null });
      loadOperators();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить оператора',
        variant: 'destructive',
      });
      setDeleteOperatorDialog({ open: false, operatorId: null });
    }
  };

  const handleViewOperatorStats = async (operatorId: string) => {
    if (!adminPassword) return;

    try {
      const response = await fetch(`/api/admin/operators/${operatorId}/statistics?password=${encodeURIComponent(adminPassword)}`);
      if (!response.ok) throw new Error('Ошибка загрузки статистики');
      
      const stats = await response.json();
      setOperatorStatsDialog({ open: true, operatorId, stats });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить статистику',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateOperatorCredentials = async () => {
    if (!adminPassword || !editOperatorDialog.operator) return;

    const { login, password } = editOperatorForm;
    
    if (!login && !password) {
      toast({
        title: 'Ошибка',
        description: 'Укажите логин и/или пароль',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/operators/${editOperatorDialog.operator.id}/credentials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          login: login !== editOperatorDialog.operator.login ? login : undefined,
          newPassword: password || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обновления');
      }
      
      toast({
        title: 'Успешно',
        description: 'Данные оператора обновлены',
      });
      
      setEditOperatorDialog({ open: false, operator: null });
      setEditOperatorForm({ login: '', password: '' });
      loadOperators();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить данные',
        variant: 'destructive',
      });
    }
  };

  const handleViewPaymentDetails = (payment: AdminPaymentRequest) => {
    setPaymentDetailsDialog({ open: true, paymentId: payment.id });
  };

  const handleProcessPayment = async () => {
    if (!adminPassword || !processPaymentDialog.payment) return;
    
    setIsProcessing(true);
    
    try {
      let receipt = undefined;
      
      if (receiptFile) {
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
          type: receiptFile.type.includes('pdf') ? 'pdf' as const : 'image' as const,
          value: base64,
          name: receiptFile.name,
          mimeType: receiptFile.type,
        };
      }
      
      await api.adminProcessPaymentRequest(
        adminPassword,
        processPaymentDialog.payment.id,
        processStatus,
        receipt,
        adminComment || undefined,
        editedAmountRub ?? undefined
      );
      
      toast({
        title: 'Успешно',
        description: `Заявка ${processStatus === 'paid' ? 'оплачена' : 'отклонена'}`,
      });
      
      setProcessPaymentDialog({ open: false, payment: null, details: null });
      setReceiptFile(null);
      setAdminComment('');
      setEditedAmountRub(null);
      loadPayments();
      loadUsers();
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

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Ошибка',
          description: 'Поддерживаются только PDF, JPG и PNG файлы',
          variant: 'destructive',
        });
        return;
      }
      setReceiptFile(file);
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

  const formatProcessingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} мин`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ч`;
    }
    return `${hours} ч ${remainingMinutes} мин`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white';
      case 'assigned': return 'inline-flex items-center rounded-full bg-purple-500 px-3 py-1 text-xs font-semibold text-white';
      case 'processing': return 'inline-flex items-center rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-black';
      case 'paid': return 'inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white';
      case 'rejected': return 'inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white';
      case 'cancelled': return 'inline-flex items-center rounded-full bg-gray-400 px-3 py-1 text-xs font-semibold text-white';
      case 'pending': return 'inline-flex items-center rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-black';
      case 'confirmed': return 'inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white';
      default: return 'inline-flex items-center rounded-full bg-gray-400 px-3 py-1 text-xs font-semibold text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Подана';
      case 'assigned': return 'Назначена';
      case 'processing': return 'В обработке';
      case 'paid': return 'Оплачена';
      case 'rejected': return 'Отклонена';
      case 'cancelled': return 'Отменена';
      case 'pending': return 'Ожидает';
      case 'confirmed': return 'Подтверждён';
      default: return status;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-[18px] shadow-soft-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Админ-панель</h1>
              <p className="text-muted-foreground">Введите пароль для входа</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Админ-панель</h1>
          <Button 
            variant="outline" 
            onClick={() => setIsAuthenticated(false)}
            className="rounded-[12px]"
          >
            Выйти
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card shadow-soft-sm rounded-[18px] p-1">
            <TabsTrigger 
              value="users" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Пользователи
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Платежи
            </TabsTrigger>
            <TabsTrigger 
              value="deposits" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Депозиты
            </TabsTrigger>
            <TabsTrigger 
              value="operators" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Операторы
            </TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Пользователи</h2>
              <Button onClick={loadUsers} variant="outline" disabled={isLoadingUsers}>
                {isLoadingUsers ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>Имя пользователя</TableHead>
                    <TableHead>Полное имя</TableHead>
                    <TableHead>Доступно</TableHead>
                    <TableHead>Заморожено</TableHead>
                    <TableHead>Регистрация</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}...</TableCell>
                      <TableCell>{user.telegramId}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.fullName || '—'}</TableCell>
                      <TableCell>{user.availableBalance.toFixed(2)} USDT</TableCell>
                      <TableCell>{user.frozenBalance.toFixed(2)} USDT</TableCell>
                      <TableCell className="text-sm">{formatMskDateTime(user.registeredAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUserStatsDialog({ open: true, userId: user.id })}
                          >
                            Просмотр статистики
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditBalanceDialog({ open: true, user });
                              setBalanceForm({
                                available: user.availableBalance,
                                frozen: user.frozenBalance,
                              });
                            }}
                          >
                            Изменить баланс
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddDepositDialog({ open: true, user });
                              setDepositAmount(0);
                            }}
                          >
                            Добавить депозит
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Заявки на выплату</h2>
              <Button onClick={loadPayments} variant="outline" disabled={isLoadingPayments}>
                {isLoadingPayments ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>

            <Tabs value={paymentTab} onValueChange={(v) => setPaymentTab(v as 'active' | 'history')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card shadow-soft-sm rounded-[18px] p-1">
                <TabsTrigger 
                  value="active" 
                  className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
                >
                  Активные ({paymentTab === 'active' ? payments.length : 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
                >
                  История
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                <div className="flex items-center justify-end mb-4">
                  <div className="flex gap-2 items-center">
                    <Label htmlFor="urgency-filter" className="text-sm font-semibold">Срочность:</Label>
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger id="urgency-filter" className="w-[180px]">
                        <SelectValue placeholder="Срочность" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="urgent">Срочные</SelectItem>
                        <SelectItem value="standard">Обычные</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Сумма (₽)</TableHead>
                        <TableHead>USDT</TableHead>
                        <TableHead>Курс</TableHead>
                        <TableHead>Срочность</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Оператор</TableHead>
                        <TableHead>Взято</TableHead>
                        <TableHead>Создана</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            Нет активных заявок
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                            <TableCell>{payment.username}</TableCell>
                            <TableCell>{payment.amountRub.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell>{payment.amountUsdt.toFixed(2)} USDT</TableCell>
                            <TableCell>{payment.frozenRate.toFixed(2)}</TableCell>
                            <TableCell>
                              {payment.urgency === 'urgent' ? (
                                <span className="text-red-600 font-semibold">Срочно</span>
                              ) : (
                                <span className="text-gray-600">Обычно</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={getStatusColor(payment.status)}>
                                {getStatusText(payment.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {payment.assignedOperatorLogin || <span className="text-muted-foreground">Не назначен</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {payment.assignedAt ? formatMskDateTime(payment.assignedAt) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{formatMskDateTime(payment.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewPaymentDetails(payment)}
                                >
                                  Детали
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelPayment(payment.id)}
                                >
                                  Отменить
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <div className="flex items-center justify-end mb-4">
                  <div className="flex gap-2 items-center">
                    <Label htmlFor="payment-status-filter" className="text-sm font-semibold">Статус:</Label>
                    <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                      <SelectTrigger id="payment-status-filter" className="w-[180px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="paid">Оплачено</SelectItem>
                        <SelectItem value="rejected">Отклонено</SelectItem>
                        <SelectItem value="cancelled">Отменено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Сумма (₽)</TableHead>
                        <TableHead>USDT</TableHead>
                        <TableHead>Курс</TableHead>
                        <TableHead>Срочность</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Оператор</TableHead>
                        <TableHead>Создана</TableHead>
                        <TableHead>Завершена</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            Нет заявок
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                            <TableCell>{payment.username}</TableCell>
                            <TableCell>{payment.amountRub.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell>{payment.amountUsdt.toFixed(2)} USDT</TableCell>
                            <TableCell>{payment.frozenRate.toFixed(2)}</TableCell>
                            <TableCell>
                              {payment.urgency === 'urgent' ? (
                                <span className="text-red-600 font-semibold">Срочно</span>
                              ) : (
                                <span className="text-gray-600">Обычно</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={getStatusColor(payment.status)}>
                                {getStatusText(payment.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {payment.assignedOperatorLogin || <span className="text-muted-foreground">Не назначен</span>}
                            </TableCell>
                            <TableCell className="text-sm">{formatMskDateTime(payment.createdAt)}</TableCell>
                            <TableCell className="text-sm">
                              {payment.completedAt ? formatMskDateTime(payment.completedAt) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewPaymentDetails(payment)}
                              >
                                Детали
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* DEPOSITS TAB */}
          <TabsContent value="deposits" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Депозиты</h2>
              <Button onClick={loadDeposits} variant="outline" disabled={isLoadingDeposits}>
                {isLoadingDeposits ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>

            <Tabs value={depositTab} onValueChange={(v) => setDepositTab(v as 'pending' | 'history')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card shadow-soft-sm rounded-[18px] p-1">
                <TabsTrigger 
                  value="pending" 
                  className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
                >
                  Активные ({deposits.filter(d => d.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
                >
                  История
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Сумма для оплаты</TableHead>
                        <TableHead>TX Hash</TableHead>
                        <TableHead>Создан</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Нет ожидающих депозитов
                          </TableCell>
                        </TableRow>
                      ) : (
                        deposits.map((deposit) => (
                          <TableRow key={deposit.id}>
                            <TableCell className="font-mono text-xs">{deposit.id.slice(0, 8)}...</TableCell>
                            <TableCell>{deposit.username}</TableCell>
                            <TableCell className="font-semibold font-mono">{formatPayableUsdt(deposit.payableAmount)} USDT</TableCell>
                            <TableCell className="font-mono text-xs">
                              {deposit.txHash ? (
                                <span title={deposit.txHash}>{deposit.txHash.slice(0, 10)}...</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{formatMskDateTime(deposit.createdAt)}</TableCell>
                            <TableCell>
                              <span className={getStatusColor(deposit.status)}>
                                {getStatusText(deposit.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {deposit.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDepositDetailsDialog({ open: true, depositId: deposit.id })}
                                  >
                                    Подробнее
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleConfirmDeposit(deposit.id)}
                                  >
                                    Подтвердить
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectDeposit(deposit.id)}
                                  >
                                    Отклонить
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDepositDetailsDialog({ open: true, depositId: deposit.id })}
                                >
                                  Подробнее
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <div className="flex items-center justify-end mb-4">
                  <div className="flex gap-2 items-center">
                    <Label htmlFor="deposit-status-filter" className="text-sm font-semibold">Статус:</Label>
                    <Select value={depositStatusFilter} onValueChange={setDepositStatusFilter}>
                      <SelectTrigger id="deposit-status-filter" className="w-[180px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="confirmed">Подтверждено</SelectItem>
                        <SelectItem value="rejected">Отклонено</SelectItem>
                        <SelectItem value="expired">Истекло</SelectItem>
                        <SelectItem value="cancelled">Отменено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Сумма для оплаты</TableHead>
                        <TableHead>TX Hash</TableHead>
                        <TableHead>Создан</TableHead>
                        <TableHead>Подтверждён</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Нет депозитов
                          </TableCell>
                        </TableRow>
                      ) : (
                        deposits.map((deposit) => (
                          <TableRow key={deposit.id}>
                            <TableCell className="font-mono text-xs">{deposit.id.slice(0, 8)}...</TableCell>
                            <TableCell>{deposit.username}</TableCell>
                            <TableCell className="font-semibold font-mono">{formatPayableUsdt(deposit.payableAmount)} USDT</TableCell>
                            <TableCell className="font-mono text-xs">
                              {deposit.txHash ? (
                                <span title={deposit.txHash}>{deposit.txHash.slice(0, 10)}...</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{formatMskDateTime(deposit.createdAt)}</TableCell>
                            <TableCell className="text-sm">
                              {deposit.confirmedAt ? formatMskDateTime(deposit.confirmedAt) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <span className={getStatusColor(deposit.status)}>
                                {getStatusText(deposit.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDepositDetailsDialog({ open: true, depositId: deposit.id })}
                                >
                                  Подробнее
                                </Button>
                                {(deposit.status === 'expired' || deposit.status === 'cancelled') && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setManualConfirmDialog({ open: true, deposit });
                                      setManualDepositAmount(deposit.amount);
                                    }}
                                  >
                                    Подтвердить вручную
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* OPERATORS TAB */}
          <TabsContent value="operators" className="space-y-4 mt-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Операторы</h2>
              <div className="flex gap-2">
                <Button onClick={loadOperators} variant="outline" disabled={isLoadingOperators} className="rounded-[12px]">
                  {isLoadingOperators ? 'Загрузка...' : 'Обновить'}
                </Button>
                <Button onClick={() => setCreateOperatorDialog(true)} className="rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Создать оператора
                </Button>
              </div>
            </div>
            
            <div className="border rounded-[18px] overflow-hidden shadow-soft bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-semibold text-foreground">ID</TableHead>
                    <TableHead className="font-semibold text-foreground">Логин</TableHead>
                    <TableHead className="font-semibold text-foreground">Статус</TableHead>
                    <TableHead className="font-semibold text-foreground">Создан</TableHead>
                    <TableHead className="font-semibold text-foreground">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Операторов пока нет</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    operators.map((operator) => (
                      <TableRow key={operator.id} className="border-border">
                        <TableCell className="font-mono text-xs text-muted-foreground">{operator.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-semibold text-foreground">{operator.login}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${operator.isActive ? 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
                            <span className={`w-2 h-2 rounded-full ${operator.isActive ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`}></span>
                            {operator.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatMskDateTime(operator.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewOperatorStats(operator.id)}
                              className="rounded-[10px]"
                            >
                              Статистика
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditOperatorDialog({ open: true, operator });
                                setEditOperatorForm({ login: operator.login, password: '' });
                              }}
                              className="rounded-[10px]"
                            >
                              Редактировать
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleOperatorStatus(operator.id, operator.isActive)}
                              className="rounded-[10px]"
                            >
                              {operator.isActive ? 'Деактивировать' : 'Активировать'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteOperatorDialog({ open: true, operatorId: operator.id })}
                              className="rounded-[10px]"
                            >
                              Удалить
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Balance Dialog */}
      <Dialog open={editBalanceDialog.open} onOpenChange={(open) => setEditBalanceDialog({ open, user: editBalanceDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить баланс</DialogTitle>
            <DialogDescription>
              Пользователь: {editBalanceDialog.user?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="available">Доступный баланс (USDT)</Label>
              <Input
                id="available"
                type="number"
                step="0.01"
                value={balanceForm.available}
                onChange={(e) => setBalanceForm({ ...balanceForm, available: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div>
              <Label htmlFor="frozen">Замороженный баланс (USDT)</Label>
              <Input
                id="frozen"
                type="number"
                step="0.01"
                value={balanceForm.frozen}
                onChange={(e) => setBalanceForm({ ...balanceForm, frozen: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBalanceDialog({ open: false, user: null })}>
              Отмена
            </Button>
            <Button onClick={handleUpdateBalance}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deposit Dialog */}
      <Dialog open={addDepositDialog.open} onOpenChange={(open) => setAddDepositDialog({ open, user: addDepositDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить депозит</DialogTitle>
            <DialogDescription>
              Пользователь: {addDepositDialog.user?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Сумма (USDT)</Label>
              <Input
                id="deposit-amount"
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                placeholder="Введите сумму"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDepositDialog({ open: false, user: null })}>
              Отмена
            </Button>
            <Button onClick={handleAddDeposit}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog open={processPaymentDialog.open} onOpenChange={(open) => setProcessPaymentDialog({ open, payment: processPaymentDialog.payment, details: processPaymentDialog.details })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Обработка заявки №{processPaymentDialog.payment?.id.slice(-6)}</DialogTitle>
            <DialogDescription>
              Пользователь: {processPaymentDialog.payment?.username}
            </DialogDescription>
          </DialogHeader>
          
          {processPaymentDialog.details && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Сумма (₽)</Label>
                  <p className="text-2xl font-bold">{processPaymentDialog.payment?.amountRub.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">USDT</Label>
                  <p className="text-2xl font-bold">{processPaymentDialog.payment?.amountUsdt.toFixed(2)} USDT</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Курс</Label>
                  <p className="font-medium">{processPaymentDialog.payment?.frozenRate.toFixed(2)} ₽</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Срочность</Label>
                  <p className="font-medium">{processPaymentDialog.payment?.urgency === 'urgent' ? 'Срочно' : 'Стандартно'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Статус</Label>
                <p className="font-medium capitalize">{getStatusText(processPaymentDialog.payment?.status || '')}</p>
              </div>

              {processPaymentDialog.details.comment && (
                <div>
                  <Label className="text-muted-foreground">Комментарий</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{processPaymentDialog.details.comment}</p>
                </div>
              )}

              {processPaymentDialog.details.attachments && processPaymentDialog.details.attachments.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Вложения ({processPaymentDialog.details.attachments.length})</Label>
                  <div className="mt-2 space-y-2">
                    {processPaymentDialog.details.attachments.map((att: any, idx: number) => {
                      if (att.type === 'image' && att.value) {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">Изображение: {att.name || 'image.jpg'}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadBase64File(att.value, att.name || 'image.jpg', 'image/jpeg')}
                                className="border-2 border-black"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Скачать
                              </Button>
                            </div>
                            <img 
                              src={att.value.startsWith('data:') ? att.value : `data:image/jpeg;base64,${att.value}`}
                              alt={att.name || 'Вложение'}
                              className="max-w-full h-auto rounded border-2 border-black"
                              style={{ maxHeight: '400px' }}
                            />
                          </div>
                        );
                      } else if (att.type === 'pdf' && att.value) {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">PDF: {att.name || 'document.pdf'}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadBase64File(att.value, att.name || 'document.pdf', 'application/pdf')}
                                className="border-2 border-black"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Скачать
                              </Button>
                            </div>
                            <iframe 
                              src={att.value.startsWith('data:') ? att.value : `data:application/pdf;base64,${att.value}`}
                              className="w-full border-2 border-black rounded"
                              style={{ maxHeight: '500px' }}
                              title={att.name || 'PDF'}
                            />
                          </div>
                        );
                      } else if (att.type === 'link') {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md text-sm">
                            <span className="font-medium">Ссылка:</span>{' '}
                            <a href={att.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {att.name || att.value}
                            </a>
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md text-sm">
                            <span className="font-medium">{att.type.toUpperCase()}:</span> {att.name || att.value}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}

              {processPaymentDialog.details.receipt && (
                <div>
                  <Label className="text-muted-foreground">Чек оператора</Label>
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    {processPaymentDialog.details.receipt.type === 'image' ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium">{processPaymentDialog.details.receipt.name || 'receipt.jpg'}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBase64File(
                              processPaymentDialog.details.receipt.value,
                              processPaymentDialog.details.receipt.name || 'receipt.jpg',
                              processPaymentDialog.details.receipt.mimeType || 'image/jpeg'
                            )}
                            className="border-2 border-black"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Скачать
                          </Button>
                        </div>
                        <img 
                          src={`data:${processPaymentDialog.details.receipt.mimeType || 'image/jpeg'};base64,${processPaymentDialog.details.receipt.value}`}
                          alt="Чек"
                          className="max-w-full h-auto rounded border-2 border-black"
                          style={{ maxHeight: '400px' }}
                        />
                      </>
                    ) : processPaymentDialog.details.receipt.type === 'pdf' ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium">{processPaymentDialog.details.receipt.name || 'receipt.pdf'}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBase64File(
                              processPaymentDialog.details.receipt.value,
                              processPaymentDialog.details.receipt.name || 'receipt.pdf',
                              processPaymentDialog.details.receipt.mimeType || 'application/pdf'
                            )}
                            className="border-2 border-black"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Скачать
                          </Button>
                        </div>
                        <iframe 
                          src={`data:${processPaymentDialog.details.receipt.mimeType || 'application/pdf'};base64,${processPaymentDialog.details.receipt.value}`}
                          className="w-full border-2 border-black rounded"
                          style={{ maxHeight: '500px' }}
                          title="Чек (PDF)"
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {processPaymentDialog.details.adminComment && (
                <div>
                  <Label className="text-muted-foreground">Комментарий оператора</Label>
                  <p className="mt-1 p-3 bg-yellow-100 border-2 border-black rounded-md font-medium">{processPaymentDialog.details.adminComment}</p>
                </div>
              )}

              {(processPaymentDialog.payment?.status === 'submitted' || processPaymentDialog.payment?.status === 'processing') && (
                <>
                  <div className="border-t pt-6 space-y-4">
                    <div>
                      <Label htmlFor="edit-amount">Изменить сумму (₽) - необязательно</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        placeholder={processPaymentDialog.payment?.amountRub.toFixed(2)}
                        value={editedAmountRub ?? ''}
                        onChange={(e) => setEditedAmountRub(e.target.value ? parseFloat(e.target.value) : null)}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Оригинальная сумма: {processPaymentDialog.payment?.amountRub.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="process-status">Статус</Label>
                      <Select value={processStatus} onValueChange={(value) => setProcessStatus(value as 'paid' | 'rejected')}>
                        <SelectTrigger id="process-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Оплачено</SelectItem>
                          <SelectItem value="rejected">Отклонено</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="admin-comment">Комментарий оператора (необязательно)</Label>
                      <Input
                        id="admin-comment"
                        type="text"
                        placeholder="Например: причина отказа или примечание"
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="receipt-upload">Чек / Квитанция (необязательно)</Label>
                      <Input
                        id="receipt-upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleReceiptFileChange}
                        className="mt-1"
                      />
                      {receiptFile && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Выбран файл: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setProcessPaymentDialog({ open: false, payment: null, details: null })}>
                      Отмена
                    </Button>
                    <Button onClick={handleProcessPayment} disabled={isProcessing}>
                      {isProcessing ? 'Обработка...' : 'Подтвердить'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Operator Dialog */}
      <Dialog open={createOperatorDialog} onOpenChange={setCreateOperatorDialog}>
        <DialogContent className="bg-card rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">Создать оператора</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Введите данные нового оператора
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="operator-login" className="text-foreground font-semibold">Логин</Label>
              <Input
                id="operator-login"
                type="text"
                value={operatorLogin}
                onChange={(e) => setOperatorLogin(e.target.value)}
                placeholder="Введите логин"
                className="mt-2 rounded-[12px]"
              />
            </div>
            
            <div>
              <Label htmlFor="operator-password" className="text-foreground font-semibold">Пароль</Label>
              <Input
                id="operator-password"
                type="password"
                value={operatorPassword}
                onChange={(e) => setOperatorPassword(e.target.value)}
                placeholder="Введите пароль"
                className="mt-2 rounded-[12px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateOperatorDialog(false);
                setOperatorLogin('');
                setOperatorPassword('');
              }}
              className="rounded-[12px]"
            >
              Отмена
            </Button>
            <Button 
              onClick={handleCreateOperator}
              disabled={!operatorLogin || !operatorPassword}
              className="rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm"
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Operator Credentials Dialog */}
      <Dialog open={editOperatorDialog.open} onOpenChange={(open) => setEditOperatorDialog({ open, operator: editOperatorDialog.operator })}>
        <DialogContent className="bg-card rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">Редактировать оператора</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Оператор: {editOperatorDialog.operator?.login}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="edit-operator-login" className="text-foreground font-semibold">Новый логин</Label>
              <Input
                id="edit-operator-login"
                type="text"
                value={editOperatorForm.login}
                onChange={(e) => setEditOperatorForm({ ...editOperatorForm, login: e.target.value })}
                placeholder="Введите новый логин"
                className="mt-2 rounded-[12px]"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-operator-password" className="text-foreground font-semibold">Новый пароль</Label>
              <Input
                id="edit-operator-password"
                type="password"
                value={editOperatorForm.password}
                onChange={(e) => setEditOperatorForm({ ...editOperatorForm, password: e.target.value })}
                placeholder="Введите новый пароль (оставьте пустым для сохранения старого)"
                className="mt-2 rounded-[12px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditOperatorDialog({ open: false, operator: null });
                setEditOperatorForm({ login: '', password: '' });
              }}
              className="rounded-[12px]"
            >
              Отмена
            </Button>
            <Button 
              onClick={handleUpdateOperatorCredentials}
              className="rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operator Statistics Dialog */}
      <Dialog open={operatorStatsDialog.open} onOpenChange={(open) => setOperatorStatsDialog({ open, operatorId: operatorStatsDialog.operatorId, stats: operatorStatsDialog.stats })}>
        <DialogContent className="bg-card rounded-[18px] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">Статистика оператора</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              ID: {operatorStatsDialog.operatorId?.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>
          
          {operatorStatsDialog.stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-[12px] p-4 bg-muted/20">
                  <div className="text-sm text-muted-foreground mb-1">Всего платежей</div>
                  <div className="text-2xl font-bold text-foreground">{operatorStatsDialog.stats.totalCount}</div>
                </div>
                
                <div className="border rounded-[12px] p-4 bg-[hsl(var(--success-bg))]">
                  <div className="text-sm text-muted-foreground mb-1">Успешных</div>
                  <div className="text-2xl font-bold text-[hsl(var(--success))]">{operatorStatsDialog.stats.paidCount}</div>
                </div>
                
                <div className="border rounded-[12px] p-4 bg-destructive/10">
                  <div className="text-sm text-muted-foreground mb-1">Отклонено</div>
                  <div className="text-2xl font-bold text-destructive">{operatorStatsDialog.stats.rejectedCount}</div>
                </div>
                
                <div className="border rounded-[12px] p-4 bg-muted/20">
                  <div className="text-sm text-muted-foreground mb-1">Сумма (RUB)</div>
                  <div className="text-2xl font-bold text-foreground">{Number(operatorStatsDialog.stats.totalAmountRub).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
              
              <div className="border rounded-[12px] p-4 bg-accent/10">
                <div className="text-sm text-muted-foreground mb-1">Общая сумма (USDT)</div>
                <div className="text-2xl font-bold text-accent">{Number(operatorStatsDialog.stats.totalAmountUsdt).toFixed(2)}</div>
              </div>
              
              <div className="border rounded-[12px] p-4 bg-muted/20">
                <div className="text-sm text-muted-foreground mb-1">Средний курс конвертации</div>
                <div className="text-xl font-bold text-foreground">
                  {operatorStatsDialog.stats.averageConversionRate 
                    ? `${Number(operatorStatsDialog.stats.averageConversionRate).toFixed(2)} RUB/USDT`
                    : 'Нет данных'
                  }
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOperatorStatsDialog({ open: false, operatorId: null, stats: null })}
              className="rounded-[12px]"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Confirm Deposit Dialog */}
      <Dialog open={manualConfirmDialog.open} onOpenChange={(open) => setManualConfirmDialog({ open, deposit: manualConfirmDialog.deposit })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение депозита вручную</DialogTitle>
            <DialogDescription>
              Введите фактическую сумму USDT и TX Hash транзакции
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-amount">Фактическая сумма USDT</Label>
              <Input
                id="manual-amount"
                type="number"
                step="0.01"
                value={manualDepositAmount}
                onChange={(e) => setManualDepositAmount(parseFloat(e.target.value) || 0)}
                placeholder="Введите сумму"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Запрошенная сумма: {manualConfirmDialog.deposit?.amount.toFixed(2)} USDT
              </p>
            </div>
            
            <div>
              <Label htmlFor="manual-txhash">TX Hash транзакции</Label>
              <Input
                id="manual-txhash"
                type="text"
                value={manualTxHash}
                onChange={(e) => setManualTxHash(e.target.value)}
                placeholder="Введите TX Hash"
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setManualConfirmDialog({ open: false, deposit: null });
                setManualDepositAmount(0);
                setManualTxHash('');
              }}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleManualConfirmDeposit}
              disabled={isProcessing || !manualDepositAmount || !manualTxHash}
            >
              {isProcessing ? 'Подтверждение...' : 'Подтвердить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDetailsDialog
        open={paymentDetailsDialog.open}
        onOpenChange={(open) => setPaymentDetailsDialog({ open, paymentId: paymentDetailsDialog.paymentId })}
        paymentId={paymentDetailsDialog.paymentId || ''}
        isAdmin={true}
        adminPassword={adminPassword}
      />

      <DepositDetailsDialog
        open={depositDetailsDialog.open}
        onOpenChange={(open) => setDepositDetailsDialog({ open, depositId: depositDetailsDialog.depositId })}
        depositId={depositDetailsDialog.depositId || ''}
        adminPassword={adminPassword}
      />

      <UserStatsDialog
        open={userStatsDialog.open}
        onOpenChange={(open) => setUserStatsDialog({ open, userId: userStatsDialog.userId })}
        userId={userStatsDialog.userId || ''}
        adminPassword={adminPassword}
      />

      {/* Delete Operator Confirmation Dialog */}
      <AlertDialog open={deleteOperatorDialog.open} onOpenChange={(open) => setDeleteOperatorDialog({ open, operatorId: deleteOperatorDialog.operatorId })}>
        <AlertDialogContent className="bg-card rounded-[18px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-foreground">Удаление оператора</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground pt-2">
              Уверен, что хочешь удалить? Раб останется без хозяина 😢
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[12px]">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOperator}
              className="rounded-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft-sm"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
