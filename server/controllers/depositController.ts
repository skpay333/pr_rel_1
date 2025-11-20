import type { Request, Response } from 'express';
import { storage } from '../storage';
import type { InsertDeposit } from '@shared/schema';
import { validateDepositAmount, generateUniquePayableAmount } from '../services/depositUniqueness';
import { getMasterWalletAddress, formatUsdtBalance, formatUsdtForStorage } from '../config/tron';
import { notifyDepositConfirmed, sendUserNotification } from '../services/notificationService';
import { MAX_PENDING_DEPOSITS } from '../config/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('depositController');

function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return password === adminPassword;
}

const DEPOSIT_EXPIRATION_MINUTES = 10;

export async function createAutomatedDeposit(req: Request, res: Response) {
  const MAX_RETRIES = 5;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { userId, requestedAmount: rawRequestedAmount } = req.body;
      logger.info(`[createAutomatedDeposit] START (attempt ${attempt}/${MAX_RETRIES}) - userId: ${userId}, rawAmount: ${rawRequestedAmount}`);

      if (!userId || rawRequestedAmount === undefined || rawRequestedAmount === null) {
        return res.status(400).json({ error: 'userId и requestedAmount обязательны' });
      }

      const requestedAmount = parseFloat(rawRequestedAmount);
      if (isNaN(requestedAmount)) {
        return res.status(400).json({ error: 'requestedAmount должен быть числом' });
      }

      const validation = validateDepositAmount(requestedAmount);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const pendingDepositsCount = await storage.countUserPendingDeposits(userId);
      if (pendingDepositsCount >= MAX_PENDING_DEPOSITS) {
        return res.status(400).json({ 
          error: `У вас уже открыто ${MAX_PENDING_DEPOSITS} заявки на пополнение. Пожалуйста, оплатите их или отмените перед созданием новой.` 
        });
      }

      logger.info(`[createAutomatedDeposit] Calling generateUniquePayableAmount for ${requestedAmount} USDT`);
      const payableAmount = await generateUniquePayableAmount(requestedAmount);
      logger.info(`[createAutomatedDeposit] Generated payableAmount: ${payableAmount} USDT`);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + DEPOSIT_EXPIRATION_MINUTES);

      const insertDeposit: InsertDeposit = {
        userId,
        amount: formatUsdtForStorage(requestedAmount),
        requestedAmount: formatUsdtForStorage(requestedAmount),
        payableAmount: formatUsdtForStorage(payableAmount),
        walletAddress: getMasterWalletAddress(),
        expiresAt,
        status: 'pending',
        txHash: null,
      };

      const deposit = await storage.createDeposit(insertDeposit);
      logger.info(`[createAutomatedDeposit] Deposit created successfully with payableAmount: ${payableAmount}`);

      await sendUserNotification(
        userId,
        `Создана заявка на пополнение ${formatUsdtBalance(requestedAmount)} USDT. Переведите ровно ${formatUsdtBalance(payableAmount)} USDT на указанный адрес в течение 10 минут.`,
        'general'
      );

      return res.json({
        id: deposit.id,
        walletAddress: getMasterWalletAddress(),
        requestedAmount: requestedAmount,
        payableAmount: payableAmount,
        expiresAt: expiresAt.toISOString(),
        status: deposit.status,
        createdAt: deposit.createdAt.toISOString(),
      });
    } catch (error: any) {
      const isUniqueConstraintViolation = 
        error?.code === '23505' || 
        error?.message?.includes('unique_pending_payable_amount') ||
        error?.message?.includes('duplicate key');
      
      if (isUniqueConstraintViolation && attempt < MAX_RETRIES) {
        logger.info(`[createAutomatedDeposit] Unique constraint violation on attempt ${attempt}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 50 * attempt));
        continue;
      }
      
      logger.error(`[createAutomatedDeposit] Error on attempt ${attempt}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать депозит';
      return res.status(500).json({ error: errorMessage });
    }
  }
  
  return res.status(500).json({ 
    error: 'Не удалось создать депозит после нескольких попыток. Попробуйте еще раз.' 
  });
}

export async function createDeposit(req: Request, res: Response) {
  try {
    const { userId, amount, txHash } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const insertDeposit: InsertDeposit = {
      userId,
      amount: formatUsdtForStorage(amount),
      status: 'pending',
      txHash: txHash || null,
    };

    const deposit = await storage.createDeposit(insertDeposit);

    await sendUserNotification(
      userId,
      `Создана заявка на депозит ${formatUsdtBalance(amount)} USDT. Ожидает подтверждения администратором.`,
      'general'
    );

    res.json(deposit);
  } catch (error) {
    logger.error('Error creating deposit:', error);
    res.status(500).json({ error: 'Failed to create deposit' });
  }
}

export async function getUserDeposits(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const deposits = await storage.getDepositsByUserId(userId);

    const formattedDeposits = deposits.map(deposit => ({
      ...deposit,
      amount: parseFloat(deposit.amount),
    }));

    res.json(formattedDeposits);
  } catch (error) {
    logger.error('Error getting user deposits:', error);
    res.status(500).json({ error: 'Failed to get deposits' });
  }
}

export async function cancelDeposit(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    const deposit = await storage.getDeposit(id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending deposits can be cancelled' });
    }

    await storage.updateDepositStatus(id, 'cancelled');

    await sendUserNotification(
      deposit.userId,
      `Заявка на пополнение ${formatUsdtBalance(deposit.requestedAmount || deposit.amount)} USDT была отменена`,
      'general'
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling deposit:', error);
    res.status(500).json({ error: 'Failed to cancel deposit' });
  }
}

export async function getPendingDeposits(req: Request, res: Response) {
  try {
    const { password } = req.query;

    if (!password || !verifyAdminPassword(password as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deposits = await storage.getPendingDeposits();
    const users = await storage.getAllUsers();

    const userMap = new Map(users.map(u => [u.id, u]));

    const formattedDeposits = deposits.map(deposit => {
      const user = userMap.get(deposit.userId);
      return {
        ...deposit,
        amount: parseFloat(deposit.amount),
        username: user?.username || 'Unknown',
      };
    });

    res.json(formattedDeposits);
  } catch (error) {
    logger.error('Error getting pending deposits:', error);
    res.status(500).json({ error: 'Failed to get pending deposits' });
  }
}

export async function getAllDeposits(req: Request, res: Response) {
  try {
    const { password, status } = req.query;

    if (!password || !verifyAdminPassword(password as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let depositsWithJoins = await storage.getAllDepositsWithJoins();
    
    if (status && status !== 'all') {
      depositsWithJoins = depositsWithJoins.filter(d => d.deposit.status === status);
    }

    const formattedDeposits = depositsWithJoins.map(({ deposit, user }) => {
      return {
        ...deposit,
        amount: parseFloat(deposit.amount),
        username: user?.username || 'Unknown',
      };
    });

    res.json(formattedDeposits);
  } catch (error) {
    logger.error('Error getting all deposits:', error);
    res.status(500).json({ error: 'Failed to get all deposits' });
  }
}

export async function confirmDeposit(req: Request, res: Response) {
  try {
    const { depositId } = req.params;
    const { password, adminId = 'admin' } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Deposit is not pending' });
    }

    const user = await storage.getUser(deposit.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentAvailable = parseFloat(user.availableBalance);
    const depositAmount = parseFloat(deposit.payableAmount || deposit.amount);
    const newAvailable = currentAvailable + depositAmount;

    await storage.updateUserBalance(
      deposit.userId,
      formatUsdtBalance(newAvailable),
      user.frozenBalance
    );

    await storage.confirmDeposit(depositId, adminId);

    await notifyDepositConfirmed(deposit.userId, depositAmount);

    res.json({
      success: true,
      message: 'Deposit confirmed',
      newBalance: parseFloat(formatUsdtBalance(newAvailable)),
    });
  } catch (error) {
    logger.error('Error confirming deposit:', error);
    res.status(500).json({ error: 'Failed to confirm deposit' });
  }
}

export async function manualConfirmDeposit(req: Request, res: Response) {
  try {
    const { depositId } = req.params;
    const { password, actualAmount, txHash, adminId = 'admin' } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!actualAmount || actualAmount <= 0) {
      return res.status(400).json({ error: 'Invalid actual amount' });
    }

    if (!txHash || txHash.trim() === '') {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'expired' && deposit.status !== 'cancelled') {
      return res.status(400).json({ error: 'Manual confirmation is only allowed for expired or cancelled deposits' });
    }

    const user = await storage.getUser(deposit.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentAvailable = parseFloat(user.availableBalance);
    const actualAmountNum = parseFloat(actualAmount);
    const newAvailable = currentAvailable + actualAmountNum;

    await storage.updateUserBalance(
      deposit.userId,
      formatUsdtBalance(newAvailable),
      user.frozenBalance
    );

    await storage.manualConfirmDeposit(
      depositId,
      formatUsdtBalance(actualAmountNum),
      txHash.trim(),
      adminId
    );

    await notifyDepositConfirmed(deposit.userId, actualAmountNum);

    res.json({
      success: true,
      message: 'Deposit manually confirmed',
      newBalance: parseFloat(formatUsdtBalance(newAvailable)),
    });
  } catch (error) {
    logger.error('Error manually confirming deposit:', error);
    res.status(500).json({ error: 'Failed to manually confirm deposit' });
  }
}

export async function rejectDeposit(req: Request, res: Response) {
  try {
    const { depositId } = req.params;
    const { password } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Deposit is not pending' });
    }

    await storage.rejectDeposit(depositId);

    await sendUserNotification(
      deposit.userId,
      'Депозит отклонён',
      'general'
    );

    res.json({
      success: true,
      message: 'Deposit rejected',
    });
  } catch (error) {
    logger.error('Error rejecting deposit:', error);
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
}

export async function adminGetDepositDetails(req: Request, res: Response) {
  try {
    const { depositId } = req.params;
    const { password } = req.query;

    if (!password || !verifyAdminPassword(password as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const user = await storage.getUser(deposit.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const details = {
      id: deposit.id,
      userId: deposit.userId,
      username: user.username,
      fullName: user.fullName || null,
      avatarUrl: user.avatarUrl || null,
      status: deposit.status,
      requestedAmount: deposit.requestedAmount ? parseFloat(deposit.requestedAmount) : null,
      payableAmount: deposit.payableAmount ? parseFloat(deposit.payableAmount) : null,
      actualAmount: parseFloat(deposit.amount),
      txHash: deposit.txHash || null,
      createdAt: deposit.createdAt.toISOString(),
      confirmedAt: deposit.confirmedAt ? deposit.confirmedAt.toISOString() : null,
      expiresAt: deposit.expiresAt ? deposit.expiresAt.toISOString() : null,
      walletAddress: deposit.walletAddress || null,
    };

    res.json(details);
  } catch (error) {
    logger.error('Error getting deposit details:', error);
    res.status(500).json({ error: 'Failed to get deposit details' });
  }
}
