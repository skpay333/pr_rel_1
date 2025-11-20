import type { Request, Response } from 'express';
import { getBot } from './bot';
import { getOperatorBot, handleOperatorStart, handleOperatorMessage, handleOperatorOnline, handleOperatorOffline, handleOperatorStatus, handleOperatorCallback } from './operatorBot';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';

const logger = createLogger('webhooks');

/**
 * Handle incoming webhook updates from Telegram
 * Endpoint: POST /telegram/webhook
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const update = req.body;
    const bot = getBot();

    // Handle /start command
    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id.toString();
      const telegramId = update.message.from?.id?.toString();
      
      // Store or update chatId for the user
      if (telegramId) {
        try {
          const user = await storage.getUserByTelegramId(telegramId);
          if (user && user.chatId !== chatId) {
            await storage.updateUserChatId(user.id, chatId);
            logger.info(`Updated chatId for user ${user.id} (Telegram ID: ${telegramId})`);
          }
        } catch (error) {
          logger.error('Error updating user chatId:', error);
        }
      }
      
      // Get WebApp URL from Replit domains or environment variable
      const webAppUrl = process.env.WEBAPP_URL || 
        (process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : ''
        );

      // Guard against empty WebApp URL - critical to prevent 500 errors
      if (!webAppUrl) {
        logger.error('[Webhook] CRITICAL: WebApp URL is not configured. Set WEBAPP_URL or REPLIT_DOMAINS environment variable.');
        await bot.sendMessage(chatId, 'Добро пожаловать в Romax Pay! 💰\n\nПриложение временно недоступно. Пожалуйста, попробуйте позже.');
        return res.json({ ok: false, reason: 'webapp_url_missing' });
      }

      await bot.sendMessage(chatId, 'Рады видеть вас в Romax Pay! 💰\n\nПлатите криптой за покупки в рублях свободно.', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть приложение',
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      });
    }

    // Handle callback queries
    if (update.callback_query) {
      await bot.answerCallbackQuery(update.callback_query.id);
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify webhook setup
 * Endpoint: GET /telegram/webhook
 */
export async function verifyWebhook(_req: Request, res: Response) {
  try {
    const bot = getBot();
    const info = await bot.getWebHookInfo();
    res.json({
      url: info.url,
      hasCustomCertificate: info.has_custom_certificate,
      pendingUpdateCount: info.pending_update_count,
      lastErrorDate: info.last_error_date,
      lastErrorMessage: info.last_error_message,
    });
  } catch (error) {
    logger.error('Error getting webhook info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle incoming webhook updates from Telegram for operator bot
 * Endpoint: POST /telegram/operator-webhook
 */
export async function handleOperatorWebhook(req: Request, res: Response) {
  try {
    const update = req.body;
    const bot = getOperatorBot();

    // Handle messages (commands and text)
    if (update.message) {
      const chatId = update.message.chat.id.toString();
      const text = update.message.text || '';

      // Handle commands
      if (text.startsWith('/start')) {
        await handleOperatorStart(chatId, bot);
      } else if (text.startsWith('/online')) {
        await handleOperatorOnline(chatId, bot);
      } else if (text.startsWith('/offline')) {
        await handleOperatorOffline(chatId, bot);
      } else if (text.startsWith('/status')) {
        await handleOperatorStatus(chatId, bot);
      } else {
        // Handle regular text messages (login/password flow)
        await handleOperatorMessage(chatId, text, bot);
      }
    }

    // Handle callback queries
    if (update.callback_query) {
      const chatId = update.callback_query.message?.chat.id.toString();
      const data = update.callback_query.data || '';
      const messageId = update.callback_query.message?.message_id;

      if (chatId && messageId) {
        await handleOperatorCallback(chatId, data, messageId, bot);
      }

      await bot.answerCallbackQuery(update.callback_query.id);
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Error handling operator webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify operator webhook setup
 * Endpoint: GET /telegram/operator-webhook
 */
export async function verifyOperatorWebhook(_req: Request, res: Response) {
  try {
    const bot = getOperatorBot();
    const info = await bot.getWebHookInfo();
    res.json({
      url: info.url,
      hasCustomCertificate: info.has_custom_certificate,
      pendingUpdateCount: info.pending_update_count,
      lastErrorDate: info.last_error_date,
      lastErrorMessage: info.last_error_message,
    });
  } catch (error) {
    logger.error('Error getting operator webhook info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
