import { storage } from '../storage';
import type { PaymentRequest } from '@shared/schema';
import { formatUsdtBalance } from '../config/tron';
import { createLogger } from '../utils/logger';

const logger = createLogger('operatorService');

let operatorBot: any = null;

export function setOperatorBot(bot: any) {
  operatorBot = bot;
}

export async function setOperatorOnline(operatorId: string, isOnline: boolean): Promise<void> {
  await storage.setOperatorOnline(operatorId, isOnline);
}

export async function getOnlineOperators() {
  return await storage.getOnlineOperators();
}

export async function assignTaskToOperator(paymentRequestId: string, operatorId: string): Promise<void> {
  await storage.assignOperatorToPaymentRequest(paymentRequestId, operatorId);
}

export async function notifyOnlineOperators(paymentRequest: PaymentRequest): Promise<void> {
  try {
    if (!operatorBot) {
      logger.error('Operator bot not initialized');
      return;
    }

    const onlineOperators = await getOnlineOperators();
    
    if (onlineOperators.length === 0) {
      logger.info('No online operators to notify');
      return;
    }

    const user = await storage.getUser(paymentRequest.userId);
    const username = user?.username || 'Неизвестно';
    
    const amountRub = parseFloat(paymentRequest.amountRub);
    const amountUsdt = parseFloat(paymentRequest.amountUsdt);
    
    const message = `🆕 <b>Новая заявка на выплату</b>\n\n` +
      `👤 Клиент: ${username}\n` +
      `💵 Сумма: ${amountRub.toLocaleString('ru-RU')} ₽\n` +
      `💎 USDT: ${formatUsdtBalance(amountUsdt).slice(0, -6)} USDT\n` +
      `⚡️ Срочность: ${paymentRequest.urgency === 'urgent' ? 'Срочная' : 'Обычная'}\n` +
      `🆔 ID: ${paymentRequest.id.slice(-6)}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Взять в работу', callback_data: `take_${paymentRequest.id}` },
          { text: '❌ Отклонить', callback_data: `reject_${paymentRequest.id}` }
        ]
      ]
    };

    for (const operator of onlineOperators) {
      if (operator.chatId) {
        try {
          await operatorBot.sendMessage(operator.chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
          logger.info(`Notification sent to operator ${operator.login} (chatId: ${operator.chatId})`);
        } catch (error) {
          logger.error(`Failed to send notification to operator ${operator.login}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Error in notifyOnlineOperators:', error);
  }
}

export async function notifyOperatorTaskTaken(operatorChatIds: string[], paymentRequestId: string): Promise<void> {
  try {
    if (!operatorBot) {
      logger.error('Operator bot not initialized');
      return;
    }

    const message = `ℹ️ Заявка №${paymentRequestId.slice(-6)} уже взята в работу другим оператором`;

    for (const chatId of operatorChatIds) {
      try {
        await operatorBot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      } catch (error) {
        logger.error(`Failed to notify operator at chatId ${chatId}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error in notifyOperatorTaskTaken:', error);
  }
}
