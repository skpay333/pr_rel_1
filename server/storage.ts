import { eq, desc, and, or, lt, gt, sql, isNull } from 'drizzle-orm';
import { db } from './db';
import { users, paymentRequests, notifications, deposits, operators, tronScanState } from '@shared/schema';
import type { User, InsertUser, PaymentRequest, InsertPaymentRequest, Notification, InsertNotification, Deposit, InsertDeposit, Operator, InsertOperator, TronScanState, InsertTronScanState } from '@shared/schema';
import { formatUsdtBalance, formatUsdtForStorage } from './config/tron';
import { createLogger } from './utils/logger';

const logger = createLogger('storage');

const USDT_SCALE = 100000000; // 10^8 for 8 decimal places

function decimalStringToBigInt(value: string | number): bigint {
  let str: string;
  if (typeof value === 'number') {
    str = value.toLocaleString('en-US', { 
      useGrouping: false, 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 20 
    });
  } else {
    str = value;
  }
  
  const isNegative = str.startsWith('-');
  const absStr = isNegative ? str.slice(1) : str;
  const [intPart, decPart = ''] = absStr.split('.');
  
  if (!decPart || decPart.length <= 8) {
    const paddedDec = decPart.padEnd(8, '0');
    const result = BigInt(intPart || '0') * BigInt(USDT_SCALE) + BigInt(paddedDec);
    return isNegative ? -result : result;
  }
  
  const first8Digits = decPart.slice(0, 8);
  const digit9 = parseInt(decPart[8] || '0', 10);
  
  let fractionalScaled = BigInt(first8Digits);
  let integerPart = BigInt(intPart || '0');
  
  if (digit9 >= 5) {
    fractionalScaled += BigInt(1);
    
    if (fractionalScaled >= BigInt(USDT_SCALE)) {
      integerPart += BigInt(1);
      fractionalScaled = BigInt(0);
    }
  }
  
  const result = integerPart * BigInt(USDT_SCALE) + fractionalScaled;
  return isNegative ? -result : result;
}

function bigIntToDecimal(value: bigint): number {
  return Number(value) / USDT_SCALE;
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  getUserByPromoCode(promoCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: string, availableBalance: string, frozenBalance: string): Promise<void>;
  updateUserChatId(userId: string, chatId: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Referral methods
  getReferralsCount(userId: string): Promise<number>;
  updateReferralBalance(userId: string, commissionAmount: string): Promise<void>;
  activateReferralBonus(userId: string, referrerId: string, bonusAmount: string, expiresAt: Date): Promise<void>;
  withdrawReferralBalance(userId: string, amount: number): Promise<void>;
  getExpiredSignupBonuses(): Promise<User[]>;
  expireSignupBonus(userId: string): Promise<void>;
  
  // Payment request methods
  getPaymentRequest(id: string): Promise<PaymentRequest | undefined>;
  getPaymentRequestsByUserId(userId: string): Promise<PaymentRequest[]>;
  createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest>;
  updatePaymentRequestStatus(id: string, status: string): Promise<void>;
  updatePaymentRequestWithReceipt(id: string, status: string, receipt: any): Promise<void>;
  updatePaymentRequestFull(id: string, updates: { status?: string; receipt?: any; adminComment?: string; amountRub?: string; amountUsdt?: string }): Promise<void>;
  getAllPaymentRequests(): Promise<PaymentRequest[]>;
  getAllPaymentRequestsWithJoins(): Promise<Array<{
    request: PaymentRequest;
    user: User | null;
    operator: Operator | null;
  }>>;
  
  // Notification methods
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  
  // Deposit methods
  getDeposit(id: string): Promise<Deposit | undefined>;
  getDepositsByUserId(userId: string): Promise<Deposit[]>;
  getPendingDeposits(): Promise<Deposit[]>;
  getAllDeposits(): Promise<Deposit[]>;
  getAllDepositsWithJoins(): Promise<Array<{
    deposit: Deposit;
    user: User | null;
  }>>;
  getActiveDeposits(): Promise<Deposit[]>;
  createDeposit(deposit: InsertDeposit): Promise<Deposit>;
  confirmDeposit(id: string, confirmedBy: string): Promise<void>;
  manualConfirmDeposit(id: string, actualAmount: string, txHash: string, confirmedBy: string): Promise<void>;
  rejectDeposit(id: string): Promise<void>;
  updateDepositStatus(id: string, status: string): Promise<void>;
  expireOldDeposits(): Promise<number>;
  countUserPendingDeposits(userId: string): Promise<number>;
  
  // Operator methods
  getOperator(id: string): Promise<Operator | undefined>;
  getOperatorByLogin(login: string): Promise<Operator | undefined>;
  getAllOperators(): Promise<Operator[]>;
  createOperator(operator: InsertOperator): Promise<Operator>;
  updateOperatorStatus(id: string, isActive: number): Promise<void>;
  deleteOperator(id: string): Promise<void>;
  setOperatorOnline(operatorId: string, isOnline: boolean): Promise<void>;
  setOperatorChatId(operatorId: string, chatId: string): Promise<void>;
  getOnlineOperators(): Promise<Operator[]>;
  assignOperatorToPaymentRequest(requestId: string, operatorId: string): Promise<void>;
  updateOperatorActivity(operatorId: string): Promise<void>;
  updateOperatorCredentials(operatorId: string, updates: { login?: string; passwordHash?: string; salt?: string }): Promise<void>;
  getOperatorStatistics(operatorId: string): Promise<{
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
    averageConversionRate: number | null;
  }>;
}

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserBalance(userId: string, availableBalance: string, frozenBalance: string): Promise<void> {
    await db.update(users)
      .set({ availableBalance, frozenBalance })
      .where(eq(users.id, userId));
  }

  async updateUserChatId(userId: string, chatId: string): Promise<void> {
    await db.update(users)
      .set({ chatId })
      .where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select()
      .from(users)
      .orderBy(desc(users.registeredAt));
  }

  async getUserByPromoCode(promoCode: string): Promise<User | undefined> {
    const result = await db.select()
      .from(users)
      .where(sql`LOWER(${users.promoCode}) = LOWER(${promoCode})`)
      .limit(1);
    return result[0];
  }

  async getReferralsCount(userId: string): Promise<number> {
    const result = await db.select()
      .from(users)
      .where(eq(users.referrerId, userId));
    return result.length;
  }

  async updateReferralBalance(userId: string, commissionAmount: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = parseFloat(user.referralBalance);
    const currentEarned = parseFloat(user.referralTotalEarned);
    const commission = parseFloat(commissionAmount);

    const newBalance = (currentBalance + commission).toFixed(8);
    const newEarned = (currentEarned + commission).toFixed(8);

    await db.update(users)
      .set({
        referralBalance: newBalance,
        referralTotalEarned: newEarned,
      })
      .where(eq(users.id, userId));
  }

  async activateReferralBonus(userId: string, referrerId: string, bonusAmount: string, expiresAt: Date): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = parseFloat(user.availableBalance);
    const bonus = parseFloat(bonusAmount);
    const newBalance = (currentBalance + bonus).toFixed(8);

    await db.update(users)
      .set({
        referrerId,
        availableBalance: newBalance,
        signupBonusActive: 1,
        signupBonusAmount: bonusAmount,
        signupBonusExpiresAt: expiresAt,
      })
      .where(eq(users.id, userId));
  }

  async withdrawReferralBalance(userId: string, amount: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentAvailable = parseFloat(user.availableBalance);
    const currentReferral = parseFloat(user.referralBalance);
    const currentWithdrawn = parseFloat(user.referralTotalWithdrawn);

    const newAvailable = (currentAvailable + amount).toFixed(8);
    const newReferral = (currentReferral - amount).toFixed(8);
    const newWithdrawn = (currentWithdrawn + amount).toFixed(8);

    await db.update(users)
      .set({
        availableBalance: newAvailable,
        referralBalance: newReferral,
        referralTotalWithdrawn: newWithdrawn,
      })
      .where(eq(users.id, userId));
  }

  async getExpiredSignupBonuses(): Promise<User[]> {
    const now = new Date();
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.signupBonusActive, 1),
          lt(users.signupBonusExpiresAt, now)
        )
      );
  }

  async expireSignupBonus(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = parseFloat(user.availableBalance);
    const bonusAmount = parseFloat(user.signupBonusAmount);
    const newBalance = Math.max(0, currentBalance - bonusAmount).toFixed(8);

    await db.update(users)
      .set({
        availableBalance: newBalance,
        signupBonusActive: 0,
        signupBonusAmount: '0',
      })
      .where(eq(users.id, userId));
  }

  // Payment request methods
  async getPaymentRequest(id: string): Promise<PaymentRequest | undefined> {
    const result = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id)).limit(1);
    return result[0];
  }

  async getPaymentRequestsByUserId(userId: string): Promise<PaymentRequest[]> {
    return await db.select()
      .from(paymentRequests)
      .where(eq(paymentRequests.userId, userId))
      .orderBy(desc(paymentRequests.createdAt));
  }

  async createPaymentRequest(insertRequest: InsertPaymentRequest): Promise<PaymentRequest> {
    const result = await db.insert(paymentRequests).values(insertRequest).returning();
    return result[0];
  }

  async updatePaymentRequestStatus(id: string, status: string): Promise<void> {
    const updates: any = { status };
    if (status === 'paid' || status === 'rejected') {
      updates.completedAt = new Date();
    }
    await db.update(paymentRequests)
      .set(updates)
      .where(eq(paymentRequests.id, id));
  }

  async updatePaymentRequestWithReceipt(id: string, status: string, receipt: any): Promise<void> {
    await db.update(paymentRequests)
      .set({ status, receipt })
      .where(eq(paymentRequests.id, id));
  }

  async updatePaymentRequestFull(id: string, updates: { status?: string; receipt?: any; adminComment?: string; amountRub?: string; amountUsdt?: string }): Promise<void> {
    const finalUpdates: any = { ...updates };
    if (updates.status === 'paid' || updates.status === 'rejected') {
      finalUpdates.completedAt = new Date();
    }
    await db.update(paymentRequests)
      .set(finalUpdates)
      .where(eq(paymentRequests.id, id));
  }

  async assignPaymentRequestToOperator(requestId: string, operatorId: string): Promise<boolean> {
    const result = await db.update(paymentRequests)
      .set({ 
        assignedOperatorId: operatorId,
        assignedAt: new Date(),
        status: 'assigned',
      })
      .where(and(
        eq(paymentRequests.id, requestId),
        eq(paymentRequests.status, 'submitted'),
        isNull(paymentRequests.assignedOperatorId)
      ))
      .returning();
    
    return result.length > 0;
  }

  async getAllPaymentRequests(): Promise<PaymentRequest[]> {
    return await db.select()
      .from(paymentRequests)
      .orderBy(desc(paymentRequests.createdAt));
  }

  async getAllPaymentRequestsWithJoins(): Promise<Array<{
    request: PaymentRequest;
    user: User | null;
    operator: Operator | null;
  }>> {
    const result = await db
      .select({
        request: paymentRequests,
        user: users,
        operator: operators,
      })
      .from(paymentRequests)
      .leftJoin(users, eq(paymentRequests.userId, users.id))
      .leftJoin(operators, eq(paymentRequests.assignedOperatorId, operators.id))
      .orderBy(desc(paymentRequests.createdAt));
    return result;
  }

  // Notification methods
  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(insertNotification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.id, id));
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      ));
    return result.length;
  }

  // Deposit methods
  async getDeposit(id: string): Promise<Deposit | undefined> {
    const result = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
    return result[0];
  }

  async getDepositsByUserId(userId: string): Promise<Deposit[]> {
    return await db.select()
      .from(deposits)
      .where(eq(deposits.userId, userId))
      .orderBy(desc(deposits.createdAt));
  }

  async getPendingDeposits(): Promise<Deposit[]> {
    return await db.select()
      .from(deposits)
      .where(eq(deposits.status, 'pending'))
      .orderBy(desc(deposits.createdAt));
  }

  async getAllDeposits(): Promise<Deposit[]> {
    return await db.select()
      .from(deposits)
      .orderBy(desc(deposits.createdAt));
  }

  async getAllDepositsWithJoins(): Promise<Array<{
    deposit: Deposit;
    user: User | null;
  }>> {
    const result = await db
      .select({
        deposit: deposits,
        user: users,
      })
      .from(deposits)
      .leftJoin(users, eq(deposits.userId, users.id))
      .orderBy(desc(deposits.createdAt));
    return result;
  }

  async createDeposit(insertDeposit: InsertDeposit): Promise<Deposit> {
    const result = await db.insert(deposits).values(insertDeposit).returning();
    return result[0];
  }

  async confirmDeposit(id: string, confirmedBy: string): Promise<void> {
    await db.update(deposits)
      .set({ 
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy 
      })
      .where(eq(deposits.id, id));
  }

  async manualConfirmDeposit(id: string, actualAmount: string, txHash: string, confirmedBy: string): Promise<void> {
    await db.update(deposits)
      .set({ 
        status: 'confirmed',
        txHash,
        confirmedAt: new Date(),
        confirmedBy 
      })
      .where(eq(deposits.id, id));
  }

  async rejectDeposit(id: string): Promise<void> {
    await db.update(deposits)
      .set({ status: 'rejected' })
      .where(eq(deposits.id, id));
  }

  async getActiveDeposits(): Promise<Deposit[]> {
    const now = new Date();
    return await db.select()
      .from(deposits)
      .where(
        and(
          or(
            eq(deposits.status, 'pending'),
            eq(deposits.status, 'awaiting_payment')
          ),
          or(
            sql`${deposits.expiresAt} > ${now}`,
            sql`${deposits.expiresAt} IS NULL`
          )
        )
      )
      .orderBy(desc(deposits.createdAt));
  }

  async updateDepositStatus(id: string, status: string): Promise<void> {
    await db.update(deposits)
      .set({ status })
      .where(eq(deposits.id, id));
  }

  async expireOldDeposits(): Promise<number> {
    const now = new Date();
    const result = await db.update(deposits)
      .set({ status: 'expired' })
      .where(
        and(
          or(
            eq(deposits.status, 'pending'),
            eq(deposits.status, 'awaiting_payment')
          ),
          lt(deposits.expiresAt, now)
        )
      )
      .returning({ id: deposits.id });
    
    return result.length;
  }

  async countUserPendingDeposits(userId: string): Promise<number> {
    const result = await db.select()
      .from(deposits)
      .where(
        and(
          eq(deposits.userId, userId),
          eq(deposits.status, 'pending')
        )
      );
    return result.length;
  }

  async getDepositByTxHash(txHash: string): Promise<Deposit | undefined> {
    const result = await db.select()
      .from(deposits)
      .where(eq(deposits.txHash, txHash))
      .limit(1);
    return result[0];
  }

  async findPendingDepositByPayableAmount(payableAmount: number): Promise<Deposit | undefined> {
    try {
      logger.debug('Starting query for amount', { payableAmount });
      const now = new Date();
      const payableAmountStr = formatUsdtForStorage(payableAmount);
      
      const result = await db.select()
        .from(deposits)
        .where(
          and(
            eq(deposits.status, 'pending'),
            eq(deposits.payableAmount, payableAmountStr),
            gt(deposits.expiresAt, now)
          )
        )
        .orderBy(deposits.createdAt)
        .limit(1);
      
      logger.debug('Query successful', { result: result[0] ? 'found' : 'not found' });
      return result[0];
    } catch (error) {
      logger.error('findPendingDepositByPayableAmount ERROR', error);
      throw error;
    }
  }

  async confirmDepositWithTransaction(depositId: string, txHash: string, actualAmount: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        const depositResult = await tx.select()
          .from(deposits)
          .where(eq(deposits.id, depositId))
          .limit(1);
        
        const deposit = depositResult[0];
        if (!deposit) {
          throw new Error('Deposit not found');
        }

        const userResult = await tx.select()
          .from(users)
          .where(eq(users.id, deposit.userId))
          .limit(1);
        
        const user = userResult[0];
        if (!user) {
          throw new Error('User not found');
        }

        await tx.update(deposits)
          .set({
            status: 'confirmed',
            txHash,
            confirmedAt: new Date(),
            amount: formatUsdtForStorage(actualAmount),
          })
          .where(eq(deposits.id, depositId));

        const currentBalanceScaled = decimalStringToBigInt(user.availableBalance);
        const actualAmountScaled = decimalStringToBigInt(actualAmount);
        const newBalanceScaled = currentBalanceScaled + actualAmountScaled;
        const newBalance = bigIntToDecimal(newBalanceScaled);
        
        await tx.update(users)
          .set({
            availableBalance: formatUsdtForStorage(newBalance),
          })
          .where(eq(users.id, deposit.userId));

        await tx.insert(notifications).values({
          userId: deposit.userId,
          message: `Баланс пополнен на ${formatUsdtBalance(actualAmount)} USDT. Депозит подтверждён блокчейном.`,
          isRead: 0,
        });

        return true;
      });
    } catch (error) {
      logger.error('Error confirming deposit with transaction', error);
      return false;
    }
  }

  // TronScan state management
  async getTronScanState(): Promise<TronScanState | undefined> {
    try {
      logger.debug('Starting query...');
      const result = await db.select()
        .from(tronScanState)
        .limit(1);
      logger.debug('Query successful', { result: result[0] ? 'found' : 'not found' });
      return result[0];
    } catch (error) {
      logger.error('getTronScanState ERROR', error);
      throw error;
    }
  }

  async createTronScanState(data: InsertTronScanState): Promise<TronScanState> {
    try {
      logger.debug('Starting insert with data', data);
      const result = await db.insert(tronScanState)
        .values(data)
        .returning();
      logger.debug('Insert successful');
      return result[0];
    } catch (error) {
      logger.error('createTronScanState ERROR', error);
      throw error;
    }
  }

  async updateTronScanState(lastProcessedBlockNumber: number): Promise<void> {
    try {
      logger.debug('Starting update for block', { lastProcessedBlockNumber });
      const state = await this.getTronScanState();
      
      if (state) {
        logger.debug('Updating existing state', { id: state.id });
        await db.update(tronScanState)
          .set({
            lastProcessedBlockNumber: lastProcessedBlockNumber.toString(),
            lastSuccessfulScan: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tronScanState.id, state.id));
        logger.debug('Update successful');
      } else {
        logger.debug('No existing state, creating new');
        await this.createTronScanState({
          lastProcessedBlockNumber: lastProcessedBlockNumber.toString(),
        });
      }
    } catch (error) {
      logger.error('updateTronScanState ERROR', error);
      throw error;
    }
  }

  async updateTronScanStateWithTimestamp(lastProcessedBlockNumber: number, lastProcessedTimestamp: Date): Promise<void> {
    try {
      logger.debug('Starting update for block', { lastProcessedBlockNumber, lastProcessedTimestamp });
      const state = await this.getTronScanState();
      
      if (state) {
        logger.debug('Updating existing state', { id: state.id });
        await db.update(tronScanState)
          .set({
            lastProcessedBlockNumber: lastProcessedBlockNumber.toString(),
            lastProcessedTimestamp,
            lastSuccessfulScan: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tronScanState.id, state.id));
        logger.debug('Update successful');
      } else {
        logger.debug('No existing state, creating new');
        await this.createTronScanState({
          lastProcessedBlockNumber: lastProcessedBlockNumber.toString(),
        });
      }
    } catch (error) {
      logger.error('updateTronScanStateWithTimestamp ERROR', error);
      throw error;
    }
  }

  // Operator methods
  async getOperator(id: string): Promise<Operator | undefined> {
    const result = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
    return result[0];
  }

  async getOperatorByLogin(login: string): Promise<Operator | undefined> {
    const result = await db.select().from(operators).where(eq(operators.login, login)).limit(1);
    return result[0];
  }

  async getAllOperators(): Promise<Operator[]> {
    return await db.select()
      .from(operators)
      .orderBy(desc(operators.createdAt));
  }

  async createOperator(insertOperator: InsertOperator): Promise<Operator> {
    const result = await db.insert(operators).values(insertOperator).returning();
    return result[0];
  }

  async updateOperatorStatus(id: string, isActive: number): Promise<void> {
    await db.update(operators)
      .set({ isActive })
      .where(eq(operators.id, id));
  }

  async deleteOperator(id: string): Promise<void> {
    await db.delete(operators).where(eq(operators.id, id));
  }

  async setOperatorOnline(operatorId: string, isOnline: boolean): Promise<void> {
    await db.update(operators)
      .set({ 
        isOnline: isOnline ? 1 : 0,
        lastActivityAt: new Date()
      })
      .where(eq(operators.id, operatorId));
  }

  async setOperatorChatId(operatorId: string, chatId: string): Promise<void> {
    await db.update(operators)
      .set({ chatId })
      .where(eq(operators.id, operatorId));
  }

  async getOnlineOperators(): Promise<Operator[]> {
    return await db.select()
      .from(operators)
      .where(and(
        eq(operators.isOnline, 1),
        eq(operators.isActive, 1)
      ))
      .orderBy(desc(operators.lastActivityAt));
  }

  async assignOperatorToPaymentRequest(requestId: string, operatorId: string): Promise<void> {
    await db.update(paymentRequests)
      .set({ assignedOperatorId: operatorId, assignedAt: new Date() })
      .where(eq(paymentRequests.id, requestId));
  }

  async updateOperatorActivity(operatorId: string): Promise<void> {
    await db.update(operators)
      .set({ lastActivityAt: new Date() })
      .where(eq(operators.id, operatorId));
  }

  async updateOperatorCredentials(operatorId: string, updates: { login?: string; passwordHash?: string; salt?: string }): Promise<void> {
    await db.update(operators)
      .set(updates)
      .where(eq(operators.id, operatorId));
  }

  async getOperatorStatistics(operatorId: string): Promise<{
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
    averageConversionRate: number | null;
  }> {
    const completedRequests = await db
      .select()
      .from(paymentRequests)
      .where(
        and(
          eq(paymentRequests.assignedOperatorId, operatorId),
          or(
            eq(paymentRequests.status, 'paid'),
            eq(paymentRequests.status, 'rejected'),
            eq(paymentRequests.status, 'cancelled')
          )
        )
      );

    const paidRequests = completedRequests.filter(r => r.status === 'paid');
    const rejectedRequests = completedRequests.filter(r => r.status === 'rejected');

    const totalAmountRub = paidRequests.reduce((sum, r) => sum + parseFloat(r.amountRub), 0) + 
                           rejectedRequests.reduce((sum, r) => sum + parseFloat(r.amountRub), 0);
    const paidAmountRub = paidRequests.reduce((sum, r) => sum + parseFloat(r.amountRub), 0);
    const rejectedAmountRub = rejectedRequests.reduce((sum, r) => sum + parseFloat(r.amountRub), 0);

    const totalAmountUsdt = paidRequests.reduce((sum, r) => sum + parseFloat(r.amountUsdt), 0) + 
                            rejectedRequests.reduce((sum, r) => sum + parseFloat(r.amountUsdt), 0);
    const paidAmountUsdt = paidRequests.reduce((sum, r) => sum + parseFloat(r.amountUsdt), 0);
    const rejectedAmountUsdt = rejectedRequests.reduce((sum, r) => sum + parseFloat(r.amountUsdt), 0);

    const conversionRate = completedRequests.length > 0 
      ? (paidRequests.length / completedRequests.length) * 100 
      : 0;

    const averageConversionRate = totalAmountUsdt > 0 
      ? totalAmountRub / totalAmountUsdt 
      : null;

    return {
      totalCount: completedRequests.length,
      paidCount: paidRequests.length,
      rejectedCount: rejectedRequests.length,
      totalAmountRub,
      paidAmountRub,
      rejectedAmountRub,
      totalAmountUsdt,
      paidAmountUsdt,
      rejectedAmountUsdt,
      conversionRate,
      averageConversionRate,
    };
  }
}

export const storage = new PostgresStorage();
