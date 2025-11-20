import { storage } from '../storage';
import { getBot } from '../telegram/bot';
import { createLogger } from '../utils/logger';

const logger = createLogger('notifications');

export type NotificationType = 
  | 'deposit_confirmed' 
  | 'payment_paid' 
  | 'payment_rejected' 
  | 'payment_status_changed'
  | 'general';

function formatUsdt(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

function getShortId(id: string): string {
  return id.slice(-6);
}

export async function sendTelegramNotification(chatId: string, message: string): Promise<boolean> {
  try {
    const bot = getBot();
    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
    logger.info(`Telegram notification sent to chatId ${chatId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending Telegram notification to chatId ${chatId}:`, error);
    return false;
  }
}

export async function createInAppNotification(
  userId: string,
  message: string,
  type: NotificationType = 'general',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await storage.createNotification({
      userId,
      message,
      type,
      metadata: metadata || null,
      isRead: 0,
    });
    logger.info(`In-app notification created for user ${userId}`);
  } catch (error) {
    logger.error(`Error creating in-app notification for user ${userId}:`, error);
  }
}

export async function sendUserNotification(
  userId: string,
  message: string,
  type: NotificationType = 'general',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await createInAppNotification(userId, message, type, metadata);

    const user = await storage.getUser(userId);
    if (user?.chatId) {
      await sendTelegramNotification(user.chatId, message);
    } else {
      logger.info(`User ${userId} does not have chatId, skipping Telegram notification`);
    }
  } catch (error) {
    logger.error(`Error sending user notification to ${userId}:`, error);
  }
}

export async function notifyDepositConfirmed(userId: string, depositAmount: number | string): Promise<void> {
  const amount = formatUsdt(depositAmount);
  const message = `✅ Депозит подтверждён! На ваш счёт зачислено ${amount} USDT`;
  
  await sendUserNotification(userId, message, 'deposit_confirmed', {
    amount,
    depositAmount: depositAmount.toString(),
  });
}

export async function notifyPaymentPaid(
  userId: string,
  paymentRequestId: string,
  amountUsdt: number | string
): Promise<void> {
  const amount = formatUsdt(amountUsdt);
  const shortId = getShortId(paymentRequestId);
  const message = `✅ Оплата #${shortId} выполнена! Сумма: ${amount} USDT`;
  
  await sendUserNotification(userId, message, 'payment_paid', {
    paymentRequestId,
    amount,
    amountUsdt: amountUsdt.toString(),
  });
}

export async function notifyPaymentRejected(
  userId: string,
  paymentRequestId: string,
  reason?: string
): Promise<void> {
  const shortId = getShortId(paymentRequestId);
  const reasonText = reason || 'Не указана';
  const message = `❌ Заявка #${shortId} отклонена. Причина: ${reasonText}`;
  
  await sendUserNotification(userId, message, 'payment_rejected', {
    paymentRequestId,
    reason: reasonText,
  });
}

export async function notifyPaymentStatusChanged(
  userId: string,
  paymentRequestId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const shortId = getShortId(paymentRequestId);
  
  const statusMap: Record<string, string> = {
    'submitted': 'Подана',
    'in_progress': 'В обработке',
    'paid': 'Оплачена',
    'rejected': 'Отклонена',
    'cancelled': 'Отменена',
  };
  
  const oldStatusText = statusMap[oldStatus] || oldStatus;
  const newStatusText = statusMap[newStatus] || newStatus;
  
  const message = `📋 Статус заявки #${shortId} изменён: ${oldStatusText} → ${newStatusText}`;
  
  await sendUserNotification(userId, message, 'payment_status_changed', {
    paymentRequestId,
    oldStatus,
    newStatus,
    oldStatusText,
    newStatusText,
  });
}
