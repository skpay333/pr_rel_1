import type { Request, Response } from 'express';
import { storage } from '../storage';
import { validateTelegramWebAppData } from '../utils/telegram';
import { generatePromoCode } from '../utils/promoCode';
import { createLogger } from '../utils/logger';

const logger = createLogger('userController');

/**
 * Get or create user based on Telegram data
 * Endpoint: POST /api/user/auth
 */
export async function authenticateUser(req: Request, res: Response) {
  try {
    const { initData, telegramId, username } = req.body;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // If initData is provided, validate it
    if (initData) {
      const botToken = process.env.BOT_TOKEN;
      
      if (!botToken) {
        logger.error('BOT_TOKEN is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const validatedData = validateTelegramWebAppData(initData, botToken);
      
      if (!validatedData || !validatedData.user) {
        return res.status(401).json({ error: 'Invalid Telegram authentication data' });
      }

      // Extract user info from validated initData
      const tgUser = validatedData.user as any; // Type assertion for Telegram user object
      const tgId = tgUser.id.toString();
      const tgUsername = tgUser.username || tgUser.first_name || `user_${tgUser.id}`;
      
      // Build fullName from first_name and last_name
      const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUsername;
      
      // Get avatar URL if available (photo_url is available in Telegram Web App user object)
      const avatarUrl = tgUser.photo_url || null;

      // Try to find existing user
      let user = await storage.getUserByTelegramId(tgId);

      // Create new user if doesn't exist
      if (!user) {
        const promoCode = await generatePromoCode(tgUsername);
        user = await storage.createUser({
          telegramId: tgId,
          username: tgUsername,
          fullName,
          avatarUrl,
          availableBalance: '0',
          frozenBalance: '0',
          promoCode,
        });
      }

      return res.json({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        fullName: user.fullName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        availableBalance: parseFloat(user.availableBalance),
        frozenBalance: parseFloat(user.frozenBalance),
        promoCode: user.promoCode || undefined,
        referrerId: user.referrerId || null,
        signupBonusActive: user.signupBonusActive,
        signupBonusExpiresAt: user.signupBonusExpiresAt || null,
        signupBonusAmount: parseFloat(user.signupBonusAmount),
        referralBalance: parseFloat(user.referralBalance),
        referralTotalEarned: parseFloat(user.referralTotalEarned),
        referralTotalWithdrawn: parseFloat(user.referralTotalWithdrawn),
        registeredAt: user.registeredAt,
      });
    }

    // Demo mode fallback - ONLY in development without initData
    if (isDevelopment && telegramId) {
      logger.warn('Running in DEMO MODE - no initData validation performed');
      
      // Try to find existing user
      let user = await storage.getUserByTelegramId(telegramId.toString());

      // Create new user if doesn't exist
      if (!user) {
        const userName = username || `user_${telegramId}`;
        const promoCode = await generatePromoCode(userName);
        user = await storage.createUser({
          telegramId: telegramId.toString(),
          username: userName,
          fullName: username || `User ${telegramId}`,
          avatarUrl: null,
          availableBalance: '0',
          frozenBalance: '0',
          promoCode,
        });
      }

      return res.json({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        fullName: user.fullName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        availableBalance: parseFloat(user.availableBalance),
        frozenBalance: parseFloat(user.frozenBalance),
        promoCode: user.promoCode || undefined,
        referrerId: user.referrerId || null,
        signupBonusActive: user.signupBonusActive,
        signupBonusExpiresAt: user.signupBonusExpiresAt || null,
        signupBonusAmount: parseFloat(user.signupBonusAmount),
        referralBalance: parseFloat(user.referralBalance),
        referralTotalEarned: parseFloat(user.referralTotalEarned),
        referralTotalWithdrawn: parseFloat(user.referralTotalWithdrawn),
        registeredAt: user.registeredAt,
      });
    }

    // No initData provided and not in development mode
    return res.status(401).json({ 
      error: 'Telegram authentication required. Please provide initData.' 
    });
  } catch (error) {
    logger.error('Error authenticating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user balance
 * Endpoint: GET /api/user/:userId/balance
 */
export async function getUserBalance(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      availableBalance: parseFloat(user.availableBalance),
      frozenBalance: parseFloat(user.frozenBalance),
    });
  } catch (error) {
    logger.error('Error getting user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
