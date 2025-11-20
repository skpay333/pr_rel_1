import { storage } from '../storage';
import { sendUserNotification } from './notificationService';
import { createLogger } from '../utils/logger';

const logger = createLogger('signupBonus');

const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

async function checkExpiredSignupBonuses() {
  try {
    logger.info('Checking for expired signup bonuses...');
    
    const expiredUsers = await storage.getExpiredSignupBonuses();
    
    if (expiredUsers.length === 0) {
      logger.info('No expired signup bonuses found');
      return;
    }

    logger.info(`Found ${expiredUsers.length} expired signup bonuses`);

    for (const user of expiredUsers) {
      try {
        const bonusAmount = parseFloat(user.signupBonusAmount);
        
        await storage.expireSignupBonus(user.id);

        await sendUserNotification(
          user.id,
          `⏰ Срок действия приветственного бонуса истёк. Списано ${bonusAmount.toFixed(2)} USDT`,
          'general',
          {
            expiredBonusAmount: bonusAmount.toFixed(8),
          }
        );

        logger.info(`Expired bonus for user ${user.id}: ${bonusAmount} USDT`);
      } catch (error) {
        logger.error(`Error processing user ${user.id}`, error);
      }
    }

    logger.info(`Successfully processed ${expiredUsers.length} expired bonuses`);
  } catch (error) {
    logger.error('Error checking expired bonuses', error);
  }
}

let expirationInterval: NodeJS.Timeout | null = null;

export async function startSignupBonusExpirationService() {
  logger.info('Service started');
  
  await checkExpiredSignupBonuses();
  
  if (expirationInterval) {
    clearInterval(expirationInterval);
  }
  
  expirationInterval = setInterval(async () => {
    await checkExpiredSignupBonuses();
  }, CHECK_INTERVAL);
}

export function stopSignupBonusExpirationService(): void {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
    logger.info('Signup bonus expiration service stopped.');
  }
}
