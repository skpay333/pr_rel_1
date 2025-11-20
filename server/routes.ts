import type { Express } from "express";
import { createServer, type Server } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";

// Controllers
import { authenticateUser, getUserBalance } from "./controllers/userController";
import { getUserPaymentRequests, getPaymentRequest, createPaymentRequest, updatePaymentRequestStatus } from "./controllers/paymentController";
import { getUserNotifications, markNotificationAsRead, getUnreadNotificationsCount } from "./controllers/notificationController";
import { adminLogin, getAllUsers, getAllPaymentRequests, updateUserBalance, addUserDeposit, approvePaymentRequest, cancelPaymentRequest, processPaymentRequest, getPaymentRequestForAdmin, getAllOperators, createOperator, updateOperatorStatus, updateOperatorOnlineStatus, deleteOperator, updateOperatorCredentials, getOperatorStatisticsForAdmin, adminGetUserStats } from "./controllers/adminController";
import { createDeposit, createAutomatedDeposit, getUserDeposits, getPendingDeposits, getAllDeposits, confirmDeposit, manualConfirmDeposit, rejectDeposit, cancelDeposit, adminGetDepositDetails } from "./controllers/depositController";
import { operatorLogin, getPaymentRequestsForOperator, operatorProcessPayment, operatorUpdateOnlineStatus, getPaymentRequestForOperator, getOperatorStatistics, operatorTakePayment } from "./controllers/operatorController";
import { activatePromoCode, getReferralStats, withdrawReferralBalance } from "./controllers/referralController";
import { handleWebhook, verifyWebhook, handleOperatorWebhook, verifyOperatorWebhook } from "./telegram/webhooks";

// Middleware
import { requireOperatorAuth } from "./middleware/operatorAuth";

// Services
import { getCurrentExchangeRate } from "./services/exchangeRate";

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for Replit environment
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow Telegram WebApp
  }));

  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://telegram.org', process.env.REPLIT_DOMAINS || '']
      : '*',
    credentials: true,
  }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development for polling
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Test endpoint to check logging
  app.get('/test-logging', (_req, res) => {
    console.log('[TEST] This is a test log message');
    res.json({ message: 'test logging endpoint' });
  });

  // User routes
  app.post('/api/user/auth', authenticateUser);
  app.get('/api/user/:userId/balance', getUserBalance);

  // Payment routes
  app.get('/api/payments/user/:userId', getUserPaymentRequests);
  app.get('/api/payments/:requestId', getPaymentRequest);
  app.post('/api/payments/create', createPaymentRequest);
  app.patch('/api/payments/:requestId/status', updatePaymentRequestStatus);

  // Notification routes
  app.get('/api/notifications/user/:userId', getUserNotifications);
  app.get('/api/notifications/user/:userId/unread-count', getUnreadNotificationsCount);
  app.patch('/api/notifications/:notificationId/read', markNotificationAsRead);

  // Deposit routes
  app.post('/api/deposits/create-automated', createAutomatedDeposit);
  app.post('/api/deposits/create', createDeposit);
  app.get('/api/deposits/user/:userId', getUserDeposits);
  app.post('/api/deposits/:id/cancel', cancelDeposit);

  // Referral routes
  app.post('/api/referral/activate', activatePromoCode);
  app.get('/api/referral/stats/:userId', getReferralStats);
  app.post('/api/referral/withdraw', withdrawReferralBalance);

  // Exchange rate endpoint - Real CBR rates
  app.get('/api/exchange-rate', (_req, res) => {
    const exchangeRateData = getCurrentExchangeRate();
    res.json(exchangeRateData);
  });

  // Admin routes
  app.post('/api/admin/login', adminLogin);
  app.get('/api/admin/users', getAllUsers);
  app.get('/api/admin/users/:userId/stats', adminGetUserStats);
  app.get('/api/admin/payments', getAllPaymentRequests);
  app.get('/api/admin/payments/:id', getPaymentRequestForAdmin);
  app.post('/api/admin/user/:userId/balance', updateUserBalance);
  app.post('/api/admin/user/:userId/deposit', addUserDeposit);
  app.post('/api/admin/payment/:requestId/approve', approvePaymentRequest);
  app.post('/api/admin/payment/:requestId/cancel', cancelPaymentRequest);
  app.patch('/api/admin/payments/:id/process', processPaymentRequest);
  app.get('/api/admin/deposits/pending', getPendingDeposits);
  app.get('/api/admin/deposits/all', getAllDeposits);
  app.get('/api/admin/deposits/:depositId/details', adminGetDepositDetails);
  app.post('/api/admin/deposits/:depositId/confirm', confirmDeposit);
  app.post('/api/admin/deposits/:depositId/manual-confirm', manualConfirmDeposit);
  app.post('/api/admin/deposits/:depositId/reject', rejectDeposit);
  
  // Admin operator management routes
  app.get('/api/admin/operators', getAllOperators);
  app.post('/api/admin/operators', createOperator);
  app.patch('/api/admin/operators/:id/status', updateOperatorStatus);
  app.patch('/api/admin/operators/:id/online-status', updateOperatorOnlineStatus);
  app.patch('/api/admin/operators/:id/credentials', updateOperatorCredentials);
  app.get('/api/admin/operators/:id/statistics', getOperatorStatisticsForAdmin);
  app.delete('/api/admin/operators/:id', deleteOperator);

  // Operator routes
  app.post('/api/operator/login', operatorLogin);
  app.get('/api/operator/:operatorId/payments', requireOperatorAuth, getPaymentRequestsForOperator);
  app.get('/api/operator/:operatorId/payments/:id', requireOperatorAuth, getPaymentRequestForOperator);
  app.post('/api/operator/:operatorId/payments/:requestId/take', requireOperatorAuth, operatorTakePayment);
  app.patch('/api/operator/:operatorId/payments/:requestId/process', requireOperatorAuth, operatorProcessPayment);
  app.patch('/api/operator/:operatorId/online-status', requireOperatorAuth, operatorUpdateOnlineStatus);
  app.get('/api/operator/:operatorId/statistics', requireOperatorAuth, getOperatorStatistics);

  // Telegram webhook routes
  app.post('/telegram/webhook', handleWebhook);
  app.get('/telegram/webhook', verifyWebhook);

  // Telegram operator webhook routes
  app.post('/telegram/operator-webhook', handleOperatorWebhook);
  app.get('/telegram/operator-webhook', verifyOperatorWebhook);

  const httpServer = createServer(app);

  return httpServer;
}
