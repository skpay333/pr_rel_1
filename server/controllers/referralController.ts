import type { Request, Response } from 'express';
import { storage } from '../storage';
import { sendUserNotification } from '../services/notificationService';
import { createLogger } from '../utils/logger';

const logger = createLogger('referralController');

export async function activatePromoCode(req: Request, res: Response) {
  try {
    const { userId, promoCode } = req.body;

    if (!userId || !promoCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.referrerId) {
      return res.status(400).json({ error: 'You have already activated a promo code' });
    }

    const referrer = await storage.getUserByPromoCode(promoCode);
    if (!referrer) {
      return res.status(404).json({ error: 'Такого промокода не существует' });
    }

    if (referrer.id === userId) {
      return res.status(400).json({ error: 'Нельзя использовать свой промокод' });
    }

    const userDeposits = await storage.getDepositsByUserId(userId);
    const hasDeposits = userDeposits.some(d => d.status === 'confirmed');
    if (hasDeposits) {
      return res.status(400).json({ error: 'Ой, а Вы уже делали депозит и не можете применить промокод 😭' });
    }

    const signupBonusAmount = '5.00000000';
    const expiresAt = new Date(user.registeredAt);
    expiresAt.setDate(expiresAt.getDate() + 15);

    await storage.activateReferralBonus(userId, referrer.id, signupBonusAmount, expiresAt);

    await sendUserNotification(
      userId,
      `🎉 Приветственный бонус 5 USDT зачислен! Действителен до ${expiresAt.toLocaleDateString('ru-RU')}`,
      'general',
      {
        bonusAmount: signupBonusAmount,
        expiresAt: expiresAt.toISOString(),
      }
    );

    await sendUserNotification(
      referrer.id,
      `🎁 Новый реферал! Пользователь ${user.username} активировал ваш промокод`,
      'general',
      {
        referralId: userId,
        referralUsername: user.username,
      }
    );

    res.json({
      success: true,
      signupBonusAmount: parseFloat(signupBonusAmount),
      signupBonusExpiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logger.error('Error activating promo code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReferralStats(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referralsCount = await storage.getReferralsCount(userId);

    res.json({
      promoCode: user.promoCode || null,
      referrerId: user.referrerId || null,
      referralsCount,
      referralBalance: parseFloat(user.referralBalance),
      referralTotalEarned: parseFloat(user.referralTotalEarned),
      referralTotalWithdrawn: parseFloat(user.referralTotalWithdrawn),
    });
  } catch (error) {
    logger.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function withdrawReferralBalance(req: Request, res: Response) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referralBalance = parseFloat(user.referralBalance);
    const minWithdrawal = 50;

    if (referralBalance < minWithdrawal) {
      return res.status(400).json({ 
        error: `Minimum withdrawal amount is ${minWithdrawal} USDT. Your balance: ${referralBalance.toFixed(2)} USDT` 
      });
    }

    await storage.withdrawReferralBalance(userId, referralBalance);

    await sendUserNotification(
      userId,
      `💰 Вывод реферальных средств: ${referralBalance.toFixed(2)} USDT переведено на основной баланс`,
      'general',
      {
        withdrawnAmount: referralBalance.toFixed(8),
      }
    );

    res.json({
      success: true,
      withdrawnAmount: referralBalance,
      newAvailableBalance: parseFloat(user.availableBalance) + referralBalance,
      newReferralBalance: 0,
    });
  } catch (error) {
    logger.error('Error withdrawing referral balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
