import TelegramBot from 'node-telegram-bot-api';
import { storage } from '../storage';
import { hashPasswordWithSalt } from '../utils/password';
import { setOperatorOnline, assignTaskToOperator, notifyOperatorTaskTaken } from '../services/operatorService';
import { sendNotificationToUser } from './bot';
import { formatUsdtBalance } from '../config/tron';
import { createLogger } from '../utils/logger';

const logger = createLogger('operatorBot');

let operatorBot: TelegramBot | null = null;

export const loginSessions = new Map<string, { stage: 'login' | 'password'; login?: string }>();

export function initializeOperatorBot(token: string): TelegramBot {
  if (operatorBot) {
    return operatorBot;
  }

  operatorBot = new TelegramBot(token, { polling: false });

  operatorBot.setMyCommands([
    { command: 'start', description: 'Авторизация оператора' },
    { command: 'online', description: 'Перейти в онлайн' },
    { command: 'offline', description: 'Перейти в офлайн' },
    { command: 'status', description: 'Проверить статус' },
  ]);

  logger.info('Operator bot initialized successfully');
  return operatorBot;
}

export function getOperatorBot(): TelegramBot {
  if (!operatorBot) {
    throw new Error('Operator bot not initialized. Call initializeOperatorBot first.');
  }
  return operatorBot;
}

export async function handleOperatorStart(chatId: string, bot: TelegramBot) {
  loginSessions.set(chatId, { stage: 'login' });
  
  await bot.sendMessage(
    chatId,
    '👋 <b>Добро пожаловать в панель оператора!</b>\n\n' +
    'Для авторизации введите ваш логин:',
    { parse_mode: 'HTML' }
  );
}

export async function handleOperatorMessage(chatId: string, text: string, bot: TelegramBot) {
  const session = loginSessions.get(chatId);
  
  if (!session) {
    await bot.sendMessage(
      chatId,
      'Используйте /start для авторизации',
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (session.stage === 'login') {
    loginSessions.set(chatId, { stage: 'password', login: text });
    await bot.sendMessage(
      chatId,
      '🔐 Введите пароль:',
      { parse_mode: 'HTML' }
    );
  } else if (session.stage === 'password') {
    await handleLogin(chatId, session.login!, text, bot);
    loginSessions.delete(chatId);
  }
}

async function handleLogin(chatId: string, login: string, password: string, bot: TelegramBot) {
  try {
    const operator = await storage.getOperatorByLogin(login);
    
    if (!operator) {
      await bot.sendMessage(
        chatId,
        '❌ Неверный логин или пароль.\n\nИспользуйте /start для повторной попытки',
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (operator.isActive !== 1) {
      await bot.sendMessage(
        chatId,
        '❌ Ваш аккаунт деактивирован. Обратитесь к администратору.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const passwordHash = hashPasswordWithSalt(password, operator.salt);
    
    if (passwordHash !== operator.passwordHash) {
      await bot.sendMessage(
        chatId,
        '❌ Неверный логин или пароль.\n\nИспользуйте /start для повторной попытки',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await storage.setOperatorChatId(operator.id, chatId);
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🟢 Онлайн', callback_data: 'status_online' },
          { text: '🔴 Офлайн', callback_data: 'status_offline' }
        ]
      ]
    };

    await bot.sendMessage(
      chatId,
      `✅ <b>Авторизация успешна!</b>\n\n` +
      `👤 Оператор: ${operator.login}\n` +
      `📊 Статус: ${operator.isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}\n\n` +
      `Выберите свой статус:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  } catch (error) {
    logger.error('Error in handleLogin', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка авторизации. Попробуйте позже.',
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleOperatorOnline(chatId: string, bot: TelegramBot) {
  try {
    const operators = await storage.getAllOperators();
    const operator = operators.find(op => op.chatId === chatId);
    
    if (!operator) {
      await bot.sendMessage(
        chatId,
        '❌ Используйте /start для авторизации',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await setOperatorOnline(operator.id, true);
    
    await bot.sendMessage(
      chatId,
      '🟢 <b>Вы в сети!</b>\n\nТеперь вы будете получать уведомления о новых заявках.',
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in handleOnline', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при изменении статуса',
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleOperatorOffline(chatId: string, bot: TelegramBot) {
  try {
    const operators = await storage.getAllOperators();
    const operator = operators.find(op => op.chatId === chatId);
    
    if (!operator) {
      await bot.sendMessage(
        chatId,
        '❌ Используйте /start для авторизации',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await setOperatorOnline(operator.id, false);
    
    await bot.sendMessage(
      chatId,
      '🔴 <b>Вы оффлайн</b>\n\nВы больше не будете получать уведомления о новых заявках.',
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in handleOffline', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при изменении статуса',
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleOperatorStatus(chatId: string, bot: TelegramBot) {
  try {
    const operators = await storage.getAllOperators();
    const operator = operators.find(op => op.chatId === chatId);
    
    if (!operator) {
      await bot.sendMessage(
        chatId,
        '❌ Используйте /start для авторизации',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const statusEmoji = operator.isOnline ? '🟢' : '🔴';
    const statusText = operator.isOnline ? 'Онлайн' : 'Офлайн';
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🟢 Онлайн', callback_data: 'status_online' },
          { text: '🔴 Офлайн', callback_data: 'status_offline' }
        ]
      ]
    };

    await bot.sendMessage(
      chatId,
      `📊 <b>Статус оператора</b>\n\n` +
      `👤 Логин: ${operator.login}\n` +
      `${statusEmoji} Статус: ${statusText}\n` +
      `⏰ Последняя активность: ${operator.lastActivityAt ? new Date(operator.lastActivityAt).toLocaleString('ru-RU') : 'N/A'}\n\n` +
      `Изменить статус:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  } catch (error) {
    logger.error('Error in handleStatus', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при получении статуса',
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleOperatorCallback(chatId: string, data: string, messageId: number, bot: TelegramBot) {
  try {
    if (data === 'status_online' || data === 'status_offline') {
      await handleStatusChange(chatId, data === 'status_online', messageId, bot);
    } else if (data.startsWith('take_')) {
      const requestId = data.substring(5);
      await handleTakeTask(chatId, requestId, messageId, bot);
    } else if (data.startsWith('reject_')) {
      const requestId = data.substring(7);
      await handleRejectTask(chatId, requestId, messageId, bot);
    }
  } catch (error) {
    logger.error('Error in handleCallback', error);
  }
}

async function handleStatusChange(chatId: string, isOnline: boolean, messageId: number, bot: TelegramBot) {
  try {
    const operators = await storage.getAllOperators();
    const operator = operators.find(op => op.chatId === chatId);
    
    if (!operator) {
      await bot.sendMessage(chatId, '❌ Ошибка: оператор не найден');
      return;
    }

    await setOperatorOnline(operator.id, isOnline);
    
    const statusEmoji = isOnline ? '🟢' : '🔴';
    const statusText = isOnline ? 'Онлайн' : 'Офлайн';
    
    await bot.editMessageText(
      `${statusEmoji} <b>Статус изменен: ${statusText}</b>\n\n` +
      `${isOnline ? 'Вы будете получать уведомления о новых заявках.' : 'Вы больше не будете получать уведомления.'}`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML'
      }
    );
  } catch (error) {
    logger.error('Error in handleStatusChange', error);
  }
}

async function handleTakeTask(chatId: string, requestId: string, messageId: number, bot: TelegramBot) {
  try {
    const operators = await storage.getAllOperators();
    const operator = operators.find(op => op.chatId === chatId);
    
    if (!operator) {
      await bot.sendMessage(chatId, '❌ Ошибка: оператор не найден');
      return;
    }

    const request = await storage.getPaymentRequest(requestId);
    
    if (!request) {
      await bot.editMessageText(
        '❌ Заявка не найдена',
        { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
      );
      return;
    }

    if (request.assignedOperatorId) {
      await bot.editMessageText(
        `ℹ️ Заявка №${requestId.slice(-6)} уже взята в работу другим оператором`,
        { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
      );
      return;
    }

    if (request.status !== 'submitted') {
      await bot.editMessageText(
        `ℹ️ Заявка №${requestId.slice(-6)} уже обработана (статус: ${request.status})`,
        { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
      );
      return;
    }

    await assignTaskToOperator(requestId, operator.id);
    
    await storage.updatePaymentRequestStatus(requestId, 'assigned');

    const user = await storage.getUser(request.userId);
    const amountRub = parseFloat(request.amountRub);
    const amountUsdt = parseFloat(request.amountUsdt);

    await bot.editMessageText(
      `✅ <b>Заявка взята в работу!</b>\n\n` +
      `🆔 ID: ${requestId.slice(-6)}\n` +
      `👤 Клиент: ${user?.username || 'Неизвестно'}\n` +
      `💵 Сумма: ${amountRub.toLocaleString('ru-RU')} ₽\n` +
      `💎 USDT: ${formatUsdtBalance(amountUsdt).slice(0, -6)} USDT\n\n` +
      `Используйте веб-панель для обработки заявки.`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
    );

    const onlineOperators = await storage.getOnlineOperators();
    const otherOperatorChatIds = onlineOperators
      .filter(op => op.id !== operator.id && op.chatId)
      .map(op => op.chatId!);
    
    await notifyOperatorTaskTaken(otherOperatorChatIds, requestId);

    if (user) {
      await sendNotificationToUser(
        user.telegramId,
        `⏳ <b>Заявка в обработке</b>\n\n` +
        `Ваша заявка №${requestId.slice(-6)} взята в работу оператором.\n` +
        `Ожидайте обработки.`
      );
    }

    await storage.createNotification({
      userId: request.userId,
      requestId: request.id,
      message: `Заявка №${requestId.slice(-6)} взята в работу оператором`,
      isRead: 0,
    });
  } catch (error) {
    logger.error('Error in handleTakeTask', error);
    await bot.sendMessage(chatId, '❌ Ошибка при взятии заявки в работу');
  }
}

async function handleRejectTask(chatId: string, requestId: string, messageId: number, bot: TelegramBot) {
  try {
    const operators = await storage.getAllOperators();
    const operator = operators.find(op => op.chatId === chatId);
    
    if (!operator) {
      await bot.sendMessage(chatId, '❌ Ошибка: оператор не найден');
      return;
    }

    await bot.editMessageText(
      `❌ Заявка №${requestId.slice(-6)} отклонена\n\n` +
      `Она останется доступной для других операторов.`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in handleRejectTask', error);
  }
}

/**
 * Set up webhook for the operator bot
 */
export async function setupOperatorWebhook(webhookUrl: string) {
  const botInstance = getOperatorBot();
  
  try {
    await botInstance.setWebHook(webhookUrl);
    logger.info(`Operator webhook set to: ${webhookUrl}`);
  } catch (error) {
    logger.error('Error setting operator webhook', error);
    throw error;
  }
}

/**
 * Get operator webhook info
 */
export async function getOperatorWebhookInfo() {
  const botInstance = getOperatorBot();
  return await botInstance.getWebHookInfo();
}

/**
 * Remove operator webhook (useful for local development)
 */
export async function removeOperatorWebhook() {
  const botInstance = getOperatorBot();
  try {
    await botInstance.deleteWebHook();
    logger.info('Operator webhook removed');
  } catch (error) {
    logger.error('Error removing operator webhook', error);
  }
}
