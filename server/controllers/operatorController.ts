import type { Request, Response } from 'express';
import { storage } from '../storage';
import { verifyPasswordWithSalt } from '../utils/password';
import { notifyPaymentPaid, notifyPaymentRejected } from '../services/notificationService';
import { createLogger } from '../utils/logger';

const logger = createLogger('operatorController');

export async function operatorLogin(req: Request, res: Response) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ message: 'Логин и пароль обязательны' });
    }

    const operator = await storage.getOperatorByLogin(login);
    
    if (!operator) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    if (operator.isActive === 0) {
      return res.status(403).json({ message: 'Аккаунт оператора деактивирован' });
    }

    const isPasswordValid = verifyPasswordWithSalt(password, operator.salt, operator.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    if (req.session) {
      req.session.operatorId = operator.id;
    }

    res.json({
      id: operator.id,
      login: operator.login,
      isOnline: operator.isOnline === 1,
      createdAt: operator.createdAt,
    });
  } catch (error) {
    logger.error('Operator login error:', error);
    res.status(500).json({ message: 'Ошибка входа' });
  }
}

export async function operatorUpdateOnlineStatus(req: Request, res: Response) {
  try {
    const { operatorId } = req.params;
    const { isOnline } = req.body;

    if (isOnline === undefined) {
      return res.status(400).json({ message: 'isOnline is required' });
    }

    const operator = await storage.getOperator(operatorId);
    if (!operator) {
      return res.status(404).json({ message: 'Operator not found' });
    }

    if (operator.isActive === 0) {
      return res.status(403).json({ message: 'Operator account is deactivated' });
    }

    await storage.setOperatorOnline(operatorId, isOnline);

    res.json({ 
      success: true, 
      isOnline: isOnline,
      message: isOnline ? 'Вы в сети' : 'Вы оффлайн'
    });
  } catch (error) {
    logger.error('Operator update online status error:', error);
    res.status(500).json({ message: 'Ошибка изменения статуса' });
  }
}

export async function getPaymentRequestsForOperator(req: Request, res: Response) {
  try {
    const { operatorId } = req.params;
    const { status } = req.query;

    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    let requests = await storage.getAllPaymentRequests();

    if (status === 'active') {
      requests = requests.filter(r => 
        (r.assignedOperatorId === operatorId || (r.status === 'submitted' && !r.assignedOperatorId)) &&
        ['submitted', 'assigned', 'processing'].includes(r.status)
      );
    } else if (status === 'completed') {
      requests = requests.filter(r => 
        r.assignedOperatorId === operatorId &&
        ['paid', 'rejected', 'cancelled'].includes(r.status)
      );
    } else if (status && status !== 'all') {
      requests = requests.filter(r => 
        (r.assignedOperatorId === operatorId || (r.status === 'submitted' && !r.assignedOperatorId)) &&
        r.status === status
      );
    } else {
      requests = requests.filter(r => 
        r.assignedOperatorId === operatorId || (r.status === 'submitted' && !r.assignedOperatorId)
      );
    }

    const requestsWithUsernames = await Promise.all(
      requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return {
          ...request,
          username: user?.username || 'Unknown',
        };
      })
    );

    res.json(requestsWithUsernames);
  } catch (error) {
    logger.error('Get payment requests error:', error);
    res.status(500).json({ message: 'Ошибка загрузки заявок' });
  }
}

export async function operatorTakePayment(req: Request, res: Response) {
  try {
    const { operatorId, requestId } = req.params;

    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const success = await storage.assignPaymentRequestToOperator(requestId, operatorId);

    if (!success) {
      return res.status(400).json({ message: 'Заявка уже взята другим оператором или обработана' });
    }

    logger.info(`Operator ${operatorId} took payment request ${requestId}`);

    res.json({ 
      success: true,
      message: 'Заявка взята в работу',
      requestId,
    });
  } catch (error) {
    logger.error('Take payment error:', error);
    res.status(500).json({ message: 'Ошибка при взятии заявки' });
  }
}

export async function operatorProcessPayment(req: Request, res: Response) {
  try {
    const { operatorId, requestId } = req.params;
    const { status, adminComment, receipt, amountRub } = req.body;

    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (!['paid', 'rejected', 'processing'].includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    if (request.assignedOperatorId !== operatorId) {
      return res.status(403).json({ message: 'Эта заявка не назначена вам' });
    }

    const updates: any = { status };
    if (adminComment) updates.adminComment = adminComment;
    if (receipt) updates.receipt = receipt;
    if (amountRub) updates.amountRub = amountRub;

    await storage.updatePaymentRequestFull(requestId, updates);

    if (status === 'paid' || status === 'rejected') {
      const user = await storage.getUser(request.userId);
      if (user) {
        const requestAmount = parseFloat(request.amountUsdt);
        
        if (status === 'paid') {
          const newFrozen = parseFloat(user.frozenBalance) - requestAmount;
          await storage.updateUserBalance(
            request.userId,
            user.availableBalance,
            newFrozen.toString()
          );
          await notifyPaymentPaid(request.userId, request.id, requestAmount);
        } else if (status === 'rejected') {
          const newAvailable = parseFloat(user.availableBalance) + requestAmount;
          const newFrozen = parseFloat(user.frozenBalance) - requestAmount;
          await storage.updateUserBalance(
            request.userId,
            newAvailable.toString(),
            newFrozen.toString()
          );
          await notifyPaymentRejected(request.userId, request.id, adminComment || 'Не указана');
        }
      }
    }

    res.json({ message: 'Заявка обработана' });
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({ message: 'Ошибка обработки заявки' });
  }
}

export async function getPaymentRequestForOperator(req: Request, res: Response) {
  try {
    const { operatorId, id } = req.params;

    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const request = await storage.getPaymentRequest(id);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    if (request.assignedOperatorId !== operatorId) {
      return res.status(403).json({ message: 'Доступ запрещен. Вы можете просматривать только свои заявки.' });
    }

    const user = await storage.getUser(request.userId);

    let assignedOperatorLogin: string | null = null;
    if (request.assignedOperatorId) {
      const assignedOperator = await storage.getOperator(request.assignedOperatorId);
      assignedOperatorLogin = assignedOperator?.login || null;
    }

    let processingTimeMinutes: number | null = null;
    if (request.assignedAt && request.completedAt) {
      const diffMs = request.completedAt.getTime() - request.assignedAt.getTime();
      processingTimeMinutes = Math.round(diffMs / 60000);
    }

    res.json({
      id: request.id,
      userId: request.userId,
      telegramId: user?.telegramId || null,
      username: user?.username || 'Unknown',
      fullName: user?.fullName || null,
      avatarUrl: user?.avatarUrl || null,
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments || [],
      comment: request.comment || '',
      status: request.status,
      receipt: request.receipt || null,
      adminComment: request.adminComment || '',
      assignedOperatorId: request.assignedOperatorId || null,
      assignedOperatorLogin,
      assignedAt: request.assignedAt?.toISOString() || null,
      completedAt: request.completedAt?.toISOString() || null,
      processingTimeMinutes,
      createdAt: request.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error('Get payment request for operator error:', error);
    res.status(500).json({ message: 'Ошибка загрузки заявки' });
  }
}

export async function getOperatorStatistics(req: Request, res: Response) {
  try {
    const { operatorId } = req.params;

    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const statistics = await storage.getOperatorStatistics(operatorId);
    res.json(statistics);
  } catch (error) {
    logger.error('Get operator statistics error:', error);
    res.status(500).json({ message: 'Ошибка загрузки статистики' });
  }
}
