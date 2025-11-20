var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";

// server/storage.ts
import { eq, desc, and, or, lt, gt, sql as sql2, isNull } from "drizzle-orm";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  deposits: () => deposits,
  insertDepositSchema: () => insertDepositSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOperatorSchema: () => insertOperatorSchema,
  insertPaymentRequestSchema: () => insertPaymentRequestSchema,
  insertTronScanStateSchema: () => insertTronScanStateSchema,
  insertUserSchema: () => insertUserSchema,
  notifications: () => notifications,
  operators: () => operators,
  paymentRequests: () => paymentRequests,
  tronScanState: () => tronScanState,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, integer, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  chatId: text("chat_id"),
  availableBalance: numeric("available_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  frozenBalance: numeric("frozen_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  promoCode: text("promo_code").unique(),
  referrerId: varchar("referrer_id"),
  signupBonusActive: integer("signup_bonus_active").notNull().default(0),
  signupBonusExpiresAt: timestamp("signup_bonus_expires_at"),
  signupBonusAmount: numeric("signup_bonus_amount", { precision: 18, scale: 8 }).notNull().default("0"),
  referralBalance: numeric("referral_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  referralTotalEarned: numeric("referral_total_earned", { precision: 18, scale: 8 }).notNull().default("0"),
  referralTotalWithdrawn: numeric("referral_total_withdrawn", { precision: 18, scale: 8 }).notNull().default("0"),
  registeredAt: timestamp("registered_at").notNull().defaultNow()
});
var paymentRequests = pgTable("payment_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amountRub: numeric("amount_rub", { precision: 18, scale: 2 }).notNull(),
  amountUsdt: numeric("amount_usdt", { precision: 18, scale: 8 }).notNull(),
  frozenRate: numeric("frozen_rate", { precision: 18, scale: 2 }).notNull(),
  urgency: text("urgency").notNull(),
  hasUrgentFee: integer("has_urgent_fee").notNull().default(0),
  attachments: jsonb("attachments"),
  comment: text("comment"),
  status: text("status").notNull().default("submitted"),
  receipt: jsonb("receipt"),
  adminComment: text("admin_comment"),
  assignedOperatorId: varchar("assigned_operator_id"),
  assignedAt: timestamp("assigned_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: index("payment_requests_user_id_idx").on(table.userId),
  statusIdx: index("payment_requests_status_idx").on(table.status),
  createdAtIdx: index("payment_requests_created_at_idx").on(table.createdAt)
}));
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  requestId: varchar("request_id"),
  type: text("type"),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt)
}));
var deposits = pgTable("deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  requestedAmount: numeric("requested_amount", { precision: 18, scale: 8 }),
  payableAmount: numeric("payable_amount", { precision: 18, scale: 8 }),
  walletAddress: text("wallet_address"),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("pending"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: varchar("confirmed_by")
}, (table) => ({
  uniquePendingPayableAmount: uniqueIndex("unique_pending_payable_amount").on(table.payableAmount).where(sql`${table.status} = 'pending' AND ${table.payableAmount} IS NOT NULL`),
  userIdIdx: index("deposits_user_id_idx").on(table.userId),
  statusIdx: index("deposits_status_idx").on(table.status),
  createdAtIdx: index("deposits_created_at_idx").on(table.createdAt)
}));
var operators = pgTable("operators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: varchar("salt", { length: 64 }).notNull(),
  isActive: integer("is_active").notNull().default(1),
  isOnline: integer("is_online").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at"),
  chatId: text("chat_id"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var tronScanState = pgTable("tron_scan_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lastProcessedBlockNumber: text("last_processed_block_number").notNull().default("0"),
  lastProcessedTimestamp: timestamp("last_processed_timestamp").notNull().defaultNow(),
  lastSuccessfulScan: timestamp("last_successful_scan").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  registeredAt: true
});
var insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({
  id: true,
  createdAt: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});
var insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
  confirmedBy: true
});
var insertTronScanStateSchema = createInsertSchema(tronScanState).omit({
  id: true,
  lastProcessedTimestamp: true,
  lastSuccessfulScan: true,
  updatedAt: true
});
var insertOperatorSchema = createInsertSchema(operators).omit({
  id: true,
  createdAt: true
});

// server/db.ts
var { Pool } = pkg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/config/tron.ts
import { TronWeb } from "tronweb";

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react/jsx-runtime"],
          "react-query": ["@tanstack/react-query"],
          "ui-core": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-switch"
          ],
          "ui-extended": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot"
          ],
          "ui-additional": [
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-aspect-ratio"
          ],
          "form-vendor": [
            "react-hook-form",
            "@hookform/resolvers",
            "zod"
          ],
          "router-vendor": ["wouter"],
          "icons-vendor": ["lucide-react"],
          "charts-vendor": ["recharts"],
          "utils-vendor": [
            "clsx",
            "tailwind-merge",
            "class-variance-authority",
            "date-fns"
          ]
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api")) {
      return next();
    }
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/config/tron.ts
var USDT_DECIMALS = 6;
var BALANCE_DECIMALS = 8;
function getMasterWalletAddress() {
  const address = process.env.MASTER_WALLET_ADDRESS || "THVyqrSDMBvpibitvTt4xJFWxVgY61acLu";
  if (!isValidTronAddress(address)) {
    throw new Error(`Invalid TRON master wallet address: ${address}`);
  }
  return address;
}
function getUsdtContractAddress() {
  return process.env.USDT_CONTRACT_ADDRESS || "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
}
function getTronGridApiKey() {
  return process.env.TRONGRID_API_KEY;
}
function isValidTronAddress(address) {
  try {
    if (!address || address.length !== 34) {
      return false;
    }
    if (!address.startsWith("T")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
function initializeTronWeb() {
  const apiKey = getTronGridApiKey();
  const config = {
    fullHost: "https://api.trongrid.io"
  };
  if (apiKey) {
    config.headers = { "TRON-PRO-API-KEY": apiKey };
    log("TronWeb initialized with API key");
  } else {
    log("\u26A0\uFE0F TronWeb initialized without API key - rate limits apply");
  }
  return new TronWeb(config);
}
function convertFromSun(amountInSun) {
  const amountBigInt = BigInt(amountInSun);
  const divisor = BigInt(10 ** USDT_DECIMALS);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;
  const amountStr = `${wholePart}.${fractionalPart.toString().padStart(USDT_DECIMALS, "0")}`;
  const amount = parseFloat(amountStr);
  return parseFloat(amount.toFixed(BALANCE_DECIMALS));
}
function formatUsdtBalance(amount) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toFixed(2);
}
function formatUsdtForStorage(amount) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toFixed(8);
}

// server/utils/logger.ts
var Logger = class {
  serviceName;
  isDevelopment;
  constructor(serviceName = "app") {
    this.serviceName = serviceName;
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }
  formatTimestamp() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  formatMessage(level, message, data) {
    const timestamp2 = this.formatTimestamp();
    const time = new Date(timestamp2).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" });
    let formattedMessage = `${time} [${this.serviceName}] ${message}`;
    if (data !== void 0) {
      formattedMessage += ` :: ${JSON.stringify(data)}`;
    }
    return formattedMessage;
  }
  log(level, message, data) {
    const formattedMessage = this.formatMessage(level, message, data);
    switch (level) {
      case "error":
        console.error(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "debug":
        if (this.isDevelopment) {
          console.log(`[DEBUG] ${formattedMessage}`);
        }
        break;
      case "info":
      default:
        console.log(formattedMessage);
        break;
    }
  }
  info(message, data) {
    this.log("info", message, data);
  }
  warn(message, data) {
    this.log("warn", message, data);
  }
  error(message, error) {
    if (error instanceof Error) {
      this.log("error", message, {
        message: error.message,
        stack: this.isDevelopment ? error.stack : void 0
      });
    } else if (error) {
      this.log("error", message, error);
    } else {
      this.log("error", message);
    }
  }
  debug(message, data) {
    this.log("debug", message, data);
  }
};
function createLogger2(serviceName) {
  return new Logger(serviceName);
}
var logger = new Logger("server");

// server/storage.ts
var logger2 = createLogger2("storage");
var USDT_SCALE = 1e8;
function decimalStringToBigInt(value) {
  let str;
  if (typeof value === "number") {
    str = value.toLocaleString("en-US", {
      useGrouping: false,
      minimumFractionDigits: 0,
      maximumFractionDigits: 20
    });
  } else {
    str = value;
  }
  const isNegative = str.startsWith("-");
  const absStr = isNegative ? str.slice(1) : str;
  const [intPart, decPart = ""] = absStr.split(".");
  if (!decPart || decPart.length <= 8) {
    const paddedDec = decPart.padEnd(8, "0");
    const result2 = BigInt(intPart || "0") * BigInt(USDT_SCALE) + BigInt(paddedDec);
    return isNegative ? -result2 : result2;
  }
  const first8Digits = decPart.slice(0, 8);
  const digit9 = parseInt(decPart[8] || "0", 10);
  let fractionalScaled = BigInt(first8Digits);
  let integerPart = BigInt(intPart || "0");
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
function bigIntToDecimal(value) {
  return Number(value) / USDT_SCALE;
}
var PostgresStorage = class {
  // User methods
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByTelegramId(telegramId) {
    const result = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    return result[0];
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async updateUserBalance(userId, availableBalance, frozenBalance) {
    await db.update(users).set({ availableBalance, frozenBalance }).where(eq(users.id, userId));
  }
  async updateUserChatId(userId, chatId) {
    await db.update(users).set({ chatId }).where(eq(users.id, userId));
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.registeredAt));
  }
  async getUserByPromoCode(promoCode) {
    const result = await db.select().from(users).where(sql2`LOWER(${users.promoCode}) = LOWER(${promoCode})`).limit(1);
    return result[0];
  }
  async getReferralsCount(userId) {
    const result = await db.select().from(users).where(eq(users.referrerId, userId));
    return result.length;
  }
  async updateReferralBalance(userId, commissionAmount) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const currentBalance = parseFloat(user.referralBalance);
    const currentEarned = parseFloat(user.referralTotalEarned);
    const commission = parseFloat(commissionAmount);
    const newBalance = (currentBalance + commission).toFixed(8);
    const newEarned = (currentEarned + commission).toFixed(8);
    await db.update(users).set({
      referralBalance: newBalance,
      referralTotalEarned: newEarned
    }).where(eq(users.id, userId));
  }
  async activateReferralBonus(userId, referrerId, bonusAmount, expiresAt) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const currentBalance = parseFloat(user.availableBalance);
    const bonus = parseFloat(bonusAmount);
    const newBalance = (currentBalance + bonus).toFixed(8);
    await db.update(users).set({
      referrerId,
      availableBalance: newBalance,
      signupBonusActive: 1,
      signupBonusAmount: bonusAmount,
      signupBonusExpiresAt: expiresAt
    }).where(eq(users.id, userId));
  }
  async withdrawReferralBalance(userId, amount) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const currentAvailable = parseFloat(user.availableBalance);
    const currentReferral = parseFloat(user.referralBalance);
    const currentWithdrawn = parseFloat(user.referralTotalWithdrawn);
    const newAvailable = (currentAvailable + amount).toFixed(8);
    const newReferral = (currentReferral - amount).toFixed(8);
    const newWithdrawn = (currentWithdrawn + amount).toFixed(8);
    await db.update(users).set({
      availableBalance: newAvailable,
      referralBalance: newReferral,
      referralTotalWithdrawn: newWithdrawn
    }).where(eq(users.id, userId));
  }
  async getExpiredSignupBonuses() {
    const now = /* @__PURE__ */ new Date();
    return await db.select().from(users).where(
      and(
        eq(users.signupBonusActive, 1),
        lt(users.signupBonusExpiresAt, now)
      )
    );
  }
  async expireSignupBonus(userId) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const currentBalance = parseFloat(user.availableBalance);
    const bonusAmount = parseFloat(user.signupBonusAmount);
    const newBalance = Math.max(0, currentBalance - bonusAmount).toFixed(8);
    await db.update(users).set({
      availableBalance: newBalance,
      signupBonusActive: 0,
      signupBonusAmount: "0"
    }).where(eq(users.id, userId));
  }
  // Payment request methods
  async getPaymentRequest(id) {
    const result = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id)).limit(1);
    return result[0];
  }
  async getPaymentRequestsByUserId(userId) {
    return await db.select().from(paymentRequests).where(eq(paymentRequests.userId, userId)).orderBy(desc(paymentRequests.createdAt));
  }
  async createPaymentRequest(insertRequest) {
    const result = await db.insert(paymentRequests).values(insertRequest).returning();
    return result[0];
  }
  async updatePaymentRequestStatus(id, status) {
    const updates = { status };
    if (status === "paid" || status === "rejected") {
      updates.completedAt = /* @__PURE__ */ new Date();
    }
    await db.update(paymentRequests).set(updates).where(eq(paymentRequests.id, id));
  }
  async updatePaymentRequestWithReceipt(id, status, receipt) {
    await db.update(paymentRequests).set({ status, receipt }).where(eq(paymentRequests.id, id));
  }
  async updatePaymentRequestFull(id, updates) {
    const finalUpdates = { ...updates };
    if (updates.status === "paid" || updates.status === "rejected") {
      finalUpdates.completedAt = /* @__PURE__ */ new Date();
    }
    await db.update(paymentRequests).set(finalUpdates).where(eq(paymentRequests.id, id));
  }
  async assignPaymentRequestToOperator(requestId, operatorId) {
    const result = await db.update(paymentRequests).set({
      assignedOperatorId: operatorId,
      assignedAt: /* @__PURE__ */ new Date(),
      status: "assigned"
    }).where(and(
      eq(paymentRequests.id, requestId),
      eq(paymentRequests.status, "submitted"),
      isNull(paymentRequests.assignedOperatorId)
    )).returning();
    return result.length > 0;
  }
  async getAllPaymentRequests() {
    return await db.select().from(paymentRequests).orderBy(desc(paymentRequests.createdAt));
  }
  async getAllPaymentRequestsWithJoins() {
    const result = await db.select({
      request: paymentRequests,
      user: users,
      operator: operators
    }).from(paymentRequests).leftJoin(users, eq(paymentRequests.userId, users.id)).leftJoin(operators, eq(paymentRequests.assignedOperatorId, operators.id)).orderBy(desc(paymentRequests.createdAt));
    return result;
  }
  // Notification methods
  async getNotificationsByUserId(userId) {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async createNotification(insertNotification) {
    const result = await db.insert(notifications).values(insertNotification).returning();
    return result[0];
  }
  async markNotificationAsRead(id) {
    await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
  }
  async getUnreadNotificationsCount(userId) {
    const result = await db.select().from(notifications).where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, 0)
    ));
    return result.length;
  }
  // Deposit methods
  async getDeposit(id) {
    const result = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
    return result[0];
  }
  async getDepositsByUserId(userId) {
    return await db.select().from(deposits).where(eq(deposits.userId, userId)).orderBy(desc(deposits.createdAt));
  }
  async getPendingDeposits() {
    return await db.select().from(deposits).where(eq(deposits.status, "pending")).orderBy(desc(deposits.createdAt));
  }
  async getAllDeposits() {
    return await db.select().from(deposits).orderBy(desc(deposits.createdAt));
  }
  async getAllDepositsWithJoins() {
    const result = await db.select({
      deposit: deposits,
      user: users
    }).from(deposits).leftJoin(users, eq(deposits.userId, users.id)).orderBy(desc(deposits.createdAt));
    return result;
  }
  async createDeposit(insertDeposit) {
    const result = await db.insert(deposits).values(insertDeposit).returning();
    return result[0];
  }
  async confirmDeposit(id, confirmedBy) {
    await db.update(deposits).set({
      status: "confirmed",
      confirmedAt: /* @__PURE__ */ new Date(),
      confirmedBy
    }).where(eq(deposits.id, id));
  }
  async manualConfirmDeposit(id, actualAmount, txHash, confirmedBy) {
    await db.update(deposits).set({
      status: "confirmed",
      txHash,
      confirmedAt: /* @__PURE__ */ new Date(),
      confirmedBy
    }).where(eq(deposits.id, id));
  }
  async rejectDeposit(id) {
    await db.update(deposits).set({ status: "rejected" }).where(eq(deposits.id, id));
  }
  async getActiveDeposits() {
    const now = /* @__PURE__ */ new Date();
    return await db.select().from(deposits).where(
      and(
        or(
          eq(deposits.status, "pending"),
          eq(deposits.status, "awaiting_payment")
        ),
        or(
          sql2`${deposits.expiresAt} > ${now}`,
          sql2`${deposits.expiresAt} IS NULL`
        )
      )
    ).orderBy(desc(deposits.createdAt));
  }
  async updateDepositStatus(id, status) {
    await db.update(deposits).set({ status }).where(eq(deposits.id, id));
  }
  async expireOldDeposits() {
    const now = /* @__PURE__ */ new Date();
    const result = await db.update(deposits).set({ status: "expired" }).where(
      and(
        or(
          eq(deposits.status, "pending"),
          eq(deposits.status, "awaiting_payment")
        ),
        lt(deposits.expiresAt, now)
      )
    ).returning({ id: deposits.id });
    return result.length;
  }
  async countUserPendingDeposits(userId) {
    const result = await db.select().from(deposits).where(
      and(
        eq(deposits.userId, userId),
        eq(deposits.status, "pending")
      )
    );
    return result.length;
  }
  async getDepositByTxHash(txHash) {
    const result = await db.select().from(deposits).where(eq(deposits.txHash, txHash)).limit(1);
    return result[0];
  }
  async findPendingDepositByPayableAmount(payableAmount) {
    try {
      logger2.debug("Starting query for amount", { payableAmount });
      const now = /* @__PURE__ */ new Date();
      const payableAmountStr = formatUsdtForStorage(payableAmount);
      const result = await db.select().from(deposits).where(
        and(
          eq(deposits.status, "pending"),
          eq(deposits.payableAmount, payableAmountStr),
          gt(deposits.expiresAt, now)
        )
      ).orderBy(deposits.createdAt).limit(1);
      logger2.debug("Query successful", { result: result[0] ? "found" : "not found" });
      return result[0];
    } catch (error) {
      logger2.error("findPendingDepositByPayableAmount ERROR", error);
      throw error;
    }
  }
  async confirmDepositWithTransaction(depositId, txHash, actualAmount) {
    try {
      return await db.transaction(async (tx) => {
        const depositResult = await tx.select().from(deposits).where(eq(deposits.id, depositId)).limit(1);
        const deposit = depositResult[0];
        if (!deposit) {
          throw new Error("Deposit not found");
        }
        const userResult = await tx.select().from(users).where(eq(users.id, deposit.userId)).limit(1);
        const user = userResult[0];
        if (!user) {
          throw new Error("User not found");
        }
        await tx.update(deposits).set({
          status: "confirmed",
          txHash,
          confirmedAt: /* @__PURE__ */ new Date(),
          amount: formatUsdtForStorage(actualAmount)
        }).where(eq(deposits.id, depositId));
        const currentBalanceScaled = decimalStringToBigInt(user.availableBalance);
        const actualAmountScaled = decimalStringToBigInt(actualAmount);
        const newBalanceScaled = currentBalanceScaled + actualAmountScaled;
        const newBalance = bigIntToDecimal(newBalanceScaled);
        await tx.update(users).set({
          availableBalance: formatUsdtForStorage(newBalance)
        }).where(eq(users.id, deposit.userId));
        await tx.insert(notifications).values({
          userId: deposit.userId,
          message: `\u0411\u0430\u043B\u0430\u043D\u0441 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D \u043D\u0430 ${formatUsdtBalance(actualAmount)} USDT. \u0414\u0435\u043F\u043E\u0437\u0438\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u043E\u043C.`,
          isRead: 0
        });
        return true;
      });
    } catch (error) {
      logger2.error("Error confirming deposit with transaction", error);
      return false;
    }
  }
  // TronScan state management
  async getTronScanState() {
    try {
      logger2.debug("Starting query...");
      const result = await db.select().from(tronScanState).limit(1);
      logger2.debug("Query successful", { result: result[0] ? "found" : "not found" });
      return result[0];
    } catch (error) {
      logger2.error("getTronScanState ERROR", error);
      throw error;
    }
  }
  async createTronScanState(data) {
    try {
      logger2.debug("Starting insert with data", data);
      const result = await db.insert(tronScanState).values(data).returning();
      logger2.debug("Insert successful");
      return result[0];
    } catch (error) {
      logger2.error("createTronScanState ERROR", error);
      throw error;
    }
  }
  async updateTronScanState(lastProcessedBlockNumber) {
    try {
      logger2.debug("Starting update for block", { lastProcessedBlockNumber });
      const state = await this.getTronScanState();
      if (state) {
        logger2.debug("Updating existing state", { id: state.id });
        await db.update(tronScanState).set({
          lastProcessedBlockNumber: lastProcessedBlockNumber.toString(),
          lastSuccessfulScan: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(tronScanState.id, state.id));
        logger2.debug("Update successful");
      } else {
        logger2.debug("No existing state, creating new");
        await this.createTronScanState({
          lastProcessedBlockNumber: lastProcessedBlockNumber.toString()
        });
      }
    } catch (error) {
      logger2.error("updateTronScanState ERROR", error);
      throw error;
    }
  }
  async updateTronScanStateWithTimestamp(lastProcessedBlockNumber, lastProcessedTimestamp) {
    try {
      logger2.debug("Starting update for block", { lastProcessedBlockNumber, lastProcessedTimestamp });
      const state = await this.getTronScanState();
      if (state) {
        logger2.debug("Updating existing state", { id: state.id });
        await db.update(tronScanState).set({
          lastProcessedBlockNumber: lastProcessedBlockNumber.toString(),
          lastProcessedTimestamp,
          lastSuccessfulScan: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(tronScanState.id, state.id));
        logger2.debug("Update successful");
      } else {
        logger2.debug("No existing state, creating new");
        await this.createTronScanState({
          lastProcessedBlockNumber: lastProcessedBlockNumber.toString()
        });
      }
    } catch (error) {
      logger2.error("updateTronScanStateWithTimestamp ERROR", error);
      throw error;
    }
  }
  // Operator methods
  async getOperator(id) {
    const result = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
    return result[0];
  }
  async getOperatorByLogin(login) {
    const result = await db.select().from(operators).where(eq(operators.login, login)).limit(1);
    return result[0];
  }
  async getAllOperators() {
    return await db.select().from(operators).orderBy(desc(operators.createdAt));
  }
  async createOperator(insertOperator) {
    const result = await db.insert(operators).values(insertOperator).returning();
    return result[0];
  }
  async updateOperatorStatus(id, isActive) {
    await db.update(operators).set({ isActive }).where(eq(operators.id, id));
  }
  async deleteOperator(id) {
    await db.delete(operators).where(eq(operators.id, id));
  }
  async setOperatorOnline(operatorId, isOnline) {
    await db.update(operators).set({
      isOnline: isOnline ? 1 : 0,
      lastActivityAt: /* @__PURE__ */ new Date()
    }).where(eq(operators.id, operatorId));
  }
  async setOperatorChatId(operatorId, chatId) {
    await db.update(operators).set({ chatId }).where(eq(operators.id, operatorId));
  }
  async getOnlineOperators() {
    return await db.select().from(operators).where(and(
      eq(operators.isOnline, 1),
      eq(operators.isActive, 1)
    )).orderBy(desc(operators.lastActivityAt));
  }
  async assignOperatorToPaymentRequest(requestId, operatorId) {
    await db.update(paymentRequests).set({ assignedOperatorId: operatorId, assignedAt: /* @__PURE__ */ new Date() }).where(eq(paymentRequests.id, requestId));
  }
  async updateOperatorActivity(operatorId) {
    await db.update(operators).set({ lastActivityAt: /* @__PURE__ */ new Date() }).where(eq(operators.id, operatorId));
  }
  async updateOperatorCredentials(operatorId, updates) {
    await db.update(operators).set(updates).where(eq(operators.id, operatorId));
  }
  async getOperatorStatistics(operatorId) {
    const completedRequests = await db.select().from(paymentRequests).where(
      and(
        eq(paymentRequests.assignedOperatorId, operatorId),
        or(
          eq(paymentRequests.status, "paid"),
          eq(paymentRequests.status, "rejected")
        )
      )
    );
    const paidRequests = completedRequests.filter((r) => r.status === "paid");
    const rejectedRequests = completedRequests.filter((r) => r.status === "rejected");
    const totalAmountRub = completedRequests.reduce((sum, r) => sum + parseFloat(r.amountRub), 0);
    const paidAmountRub = paidRequests.reduce((sum, r) => sum + parseFloat(r.amountRub), 0);
    const rejectedAmountRub = rejectedRequests.reduce((sum, r) => sum + parseFloat(r.amountRub), 0);
    const totalAmountUsdt = completedRequests.reduce((sum, r) => sum + parseFloat(r.amountUsdt), 0);
    const paidAmountUsdt = paidRequests.reduce((sum, r) => sum + parseFloat(r.amountUsdt), 0);
    const rejectedAmountUsdt = rejectedRequests.reduce((sum, r) => sum + parseFloat(r.amountUsdt), 0);
    const conversionRate = completedRequests.length > 0 ? paidRequests.length / completedRequests.length * 100 : 0;
    const averageConversionRate = totalAmountUsdt > 0 ? totalAmountRub / totalAmountUsdt : null;
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
      averageConversionRate
    };
  }
};
var storage = new PostgresStorage();

// server/utils/telegram.ts
import crypto from "crypto";
var logger3 = createLogger2("telegram-utils");
function validateTelegramWebAppData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return null;
    }
    params.delete("hash");
    const dataCheckArr = [];
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (computedHash !== hash) {
      return null;
    }
    const userStr = params.get("user");
    const authDate = parseInt(params.get("auth_date") || "0", 10);
    const now = Math.floor(Date.now() / 1e3);
    if (now - authDate > 86400) {
      return null;
    }
    return {
      query_id: params.get("query_id") || void 0,
      user: userStr ? JSON.parse(userStr) : void 0,
      auth_date: authDate,
      hash
    };
  } catch (error) {
    logger3.error("Error validating Telegram WebApp data:", error);
    return null;
  }
}

// server/utils/promoCode.ts
function shuffleString(str) {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}
function generateRandomLetters(count) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < count; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}
async function generatePromoCode(username) {
  let baseString = username.toUpperCase().replace(/[^A-Z]/g, "");
  if (baseString.length < 4) {
    const needed = 4 - baseString.length;
    baseString += generateRandomLetters(needed);
  }
  let attempts = 0;
  const maxAttempts = 100;
  while (attempts < maxAttempts) {
    const promoCode = shuffleString(baseString);
    const existingUser = await storage.getUserByPromoCode(promoCode);
    if (!existingUser) {
      return promoCode;
    }
    attempts++;
  }
  const randomSuffix = Math.floor(Math.random() * 1e4).toString().padStart(4, "0");
  return shuffleString(baseString) + randomSuffix;
}

// server/controllers/userController.ts
var logger4 = createLogger2("userController");
async function authenticateUser(req, res) {
  try {
    const { initData, telegramId, username } = req.body;
    const isDevelopment = process.env.NODE_ENV === "development";
    if (initData) {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        logger4.error("BOT_TOKEN is not configured");
        return res.status(500).json({ error: "Server configuration error" });
      }
      const validatedData = validateTelegramWebAppData(initData, botToken);
      if (!validatedData || !validatedData.user) {
        return res.status(401).json({ error: "Invalid Telegram authentication data" });
      }
      const tgUser = validatedData.user;
      const tgId = tgUser.id.toString();
      const tgUsername = tgUser.username || tgUser.first_name || `user_${tgUser.id}`;
      const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || tgUsername;
      const avatarUrl = tgUser.photo_url || null;
      let user = await storage.getUserByTelegramId(tgId);
      if (!user) {
        const promoCode = await generatePromoCode(tgUsername);
        user = await storage.createUser({
          telegramId: tgId,
          username: tgUsername,
          fullName,
          avatarUrl,
          availableBalance: "0",
          frozenBalance: "0",
          promoCode
        });
      }
      return res.json({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        fullName: user.fullName || void 0,
        avatarUrl: user.avatarUrl || void 0,
        availableBalance: parseFloat(user.availableBalance),
        frozenBalance: parseFloat(user.frozenBalance),
        promoCode: user.promoCode || void 0,
        referrerId: user.referrerId || null,
        signupBonusActive: user.signupBonusActive,
        signupBonusExpiresAt: user.signupBonusExpiresAt || null,
        signupBonusAmount: parseFloat(user.signupBonusAmount),
        referralBalance: parseFloat(user.referralBalance),
        referralTotalEarned: parseFloat(user.referralTotalEarned),
        referralTotalWithdrawn: parseFloat(user.referralTotalWithdrawn),
        registeredAt: user.registeredAt
      });
    }
    if (isDevelopment && telegramId) {
      logger4.warn("Running in DEMO MODE - no initData validation performed");
      let user = await storage.getUserByTelegramId(telegramId.toString());
      if (!user) {
        const userName = username || `user_${telegramId}`;
        const promoCode = await generatePromoCode(userName);
        user = await storage.createUser({
          telegramId: telegramId.toString(),
          username: userName,
          fullName: username || `User ${telegramId}`,
          avatarUrl: null,
          availableBalance: "0",
          frozenBalance: "0",
          promoCode
        });
      }
      return res.json({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        fullName: user.fullName || void 0,
        avatarUrl: user.avatarUrl || void 0,
        availableBalance: parseFloat(user.availableBalance),
        frozenBalance: parseFloat(user.frozenBalance),
        promoCode: user.promoCode || void 0,
        referrerId: user.referrerId || null,
        signupBonusActive: user.signupBonusActive,
        signupBonusExpiresAt: user.signupBonusExpiresAt || null,
        signupBonusAmount: parseFloat(user.signupBonusAmount),
        referralBalance: parseFloat(user.referralBalance),
        referralTotalEarned: parseFloat(user.referralTotalEarned),
        referralTotalWithdrawn: parseFloat(user.referralTotalWithdrawn),
        registeredAt: user.registeredAt
      });
    }
    return res.status(401).json({
      error: "Telegram authentication required. Please provide initData."
    });
  } catch (error) {
    logger4.error("Error authenticating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getUserBalance(req, res) {
  try {
    const { userId } = req.params;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      availableBalance: parseFloat(user.availableBalance),
      frozenBalance: parseFloat(user.frozenBalance)
    });
  } catch (error) {
    logger4.error("Error getting user balance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/services/operatorService.ts
var logger5 = createLogger2("operatorService");
var operatorBot = null;
function setOperatorBot(bot2) {
  operatorBot = bot2;
}
async function setOperatorOnline(operatorId, isOnline) {
  await storage.setOperatorOnline(operatorId, isOnline);
}
async function getOnlineOperators() {
  return await storage.getOnlineOperators();
}
async function assignTaskToOperator(paymentRequestId, operatorId) {
  await storage.assignOperatorToPaymentRequest(paymentRequestId, operatorId);
}
async function notifyOnlineOperators(paymentRequest) {
  try {
    if (!operatorBot) {
      logger5.error("Operator bot not initialized");
      return;
    }
    const onlineOperators = await getOnlineOperators();
    if (onlineOperators.length === 0) {
      logger5.info("No online operators to notify");
      return;
    }
    const user = await storage.getUser(paymentRequest.userId);
    const username = user?.username || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
    const amountRub = parseFloat(paymentRequest.amountRub);
    const amountUsdt = parseFloat(paymentRequest.amountUsdt);
    const message = `\u{1F195} <b>\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u0432\u044B\u043F\u043B\u0430\u0442\u0443</b>

\u{1F464} \u041A\u043B\u0438\u0435\u043D\u0442: ${username}
\u{1F4B5} \u0421\u0443\u043C\u043C\u0430: ${amountRub.toLocaleString("ru-RU")} \u20BD
\u{1F48E} USDT: ${formatUsdtBalance(amountUsdt).slice(0, -6)} USDT
\u26A1\uFE0F \u0421\u0440\u043E\u0447\u043D\u043E\u0441\u0442\u044C: ${paymentRequest.urgency === "urgent" ? "\u0421\u0440\u043E\u0447\u043D\u0430\u044F" : "\u041E\u0431\u044B\u0447\u043D\u0430\u044F"}
\u{1F194} ID: ${paymentRequest.id.slice(-6)}`;
    const keyboard = {
      inline_keyboard: [
        [
          { text: "\u2705 \u0412\u0437\u044F\u0442\u044C \u0432 \u0440\u0430\u0431\u043E\u0442\u0443", callback_data: `take_${paymentRequest.id}` },
          { text: "\u274C \u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C", callback_data: `reject_${paymentRequest.id}` }
        ]
      ]
    };
    for (const operator of onlineOperators) {
      if (operator.chatId) {
        try {
          await operatorBot.sendMessage(operator.chatId, message, {
            parse_mode: "HTML",
            reply_markup: keyboard
          });
          logger5.info(`Notification sent to operator ${operator.login} (chatId: ${operator.chatId})`);
        } catch (error) {
          logger5.error(`Failed to send notification to operator ${operator.login}:`, error);
        }
      }
    }
  } catch (error) {
    logger5.error("Error in notifyOnlineOperators:", error);
  }
}
async function notifyOperatorTaskTaken(operatorChatIds, paymentRequestId) {
  try {
    if (!operatorBot) {
      logger5.error("Operator bot not initialized");
      return;
    }
    const message = `\u2139\uFE0F \u0417\u0430\u044F\u0432\u043A\u0430 \u2116${paymentRequestId.slice(-6)} \u0443\u0436\u0435 \u0432\u0437\u044F\u0442\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443 \u0434\u0440\u0443\u0433\u0438\u043C \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C`;
    for (const chatId of operatorChatIds) {
      try {
        await operatorBot.sendMessage(chatId, message, { parse_mode: "HTML" });
      } catch (error) {
        logger5.error(`Failed to notify operator at chatId ${chatId}:`, error);
      }
    }
  } catch (error) {
    logger5.error("Error in notifyOperatorTaskTaken:", error);
  }
}

// server/telegram/bot.ts
import TelegramBot from "node-telegram-bot-api";
var logger6 = createLogger2("telegram");
var bot = null;
function initializeBot(token) {
  if (bot) {
    return bot;
  }
  bot = new TelegramBot(token, { polling: false });
  bot.setMyCommands([
    { command: "start", description: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435" }
  ]);
  return bot;
}
function getBot() {
  if (!bot) {
    throw new Error("Bot not initialized. Call initializeBot first.");
  }
  return bot;
}
async function setupMenuButton(webAppUrl) {
  const botInstance = getBot();
  try {
    await botInstance.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435",
        web_app: {
          url: webAppUrl
        }
      }
    });
    logger6.info("Menu button configured successfully");
  } catch (error) {
    logger6.error("Error setting up menu button", error);
  }
}
async function setupWebhook(webhookUrl) {
  const botInstance = getBot();
  try {
    await botInstance.setWebHook(webhookUrl);
    logger6.info(`Webhook set to: ${webhookUrl}`);
  } catch (error) {
    logger6.error("Error setting webhook", error);
    throw error;
  }
}
async function sendNotificationToUser(telegramId, message) {
  try {
    const botInstance = getBot();
    await botInstance.sendMessage(telegramId, message, {
      parse_mode: "HTML"
    });
    logger6.info(`Notification sent to Telegram user ${telegramId}`);
  } catch (error) {
    logger6.error(`Error sending notification to Telegram user ${telegramId}`, error);
  }
}

// server/services/notificationService.ts
var logger7 = createLogger2("notifications");
function formatUsdt(amount) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}
function getShortId(id) {
  return id.slice(-6);
}
async function sendTelegramNotification(chatId, message) {
  try {
    const bot2 = getBot();
    await bot2.sendMessage(chatId, message, {
      parse_mode: "HTML"
    });
    logger7.info(`Telegram notification sent to chatId ${chatId}`);
    return true;
  } catch (error) {
    logger7.error(`Error sending Telegram notification to chatId ${chatId}:`, error);
    return false;
  }
}
async function createInAppNotification(userId, message, type = "general", metadata) {
  try {
    await storage.createNotification({
      userId,
      message,
      type,
      metadata: metadata || null,
      isRead: 0
    });
    logger7.info(`In-app notification created for user ${userId}`);
  } catch (error) {
    logger7.error(`Error creating in-app notification for user ${userId}:`, error);
  }
}
async function sendUserNotification(userId, message, type = "general", metadata) {
  try {
    await createInAppNotification(userId, message, type, metadata);
    const user = await storage.getUser(userId);
    if (user?.chatId) {
      await sendTelegramNotification(user.chatId, message);
    } else {
      logger7.info(`User ${userId} does not have chatId, skipping Telegram notification`);
    }
  } catch (error) {
    logger7.error(`Error sending user notification to ${userId}:`, error);
  }
}
async function notifyDepositConfirmed(userId, depositAmount) {
  const amount = formatUsdt(depositAmount);
  const message = `\u2705 \u0414\u0435\u043F\u043E\u0437\u0438\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D! \u041D\u0430 \u0432\u0430\u0448 \u0441\u0447\u0451\u0442 \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E ${amount} USDT`;
  await sendUserNotification(userId, message, "deposit_confirmed", {
    amount,
    depositAmount: depositAmount.toString()
  });
}
async function notifyPaymentPaid(userId, paymentRequestId, amountUsdt) {
  const amount = formatUsdt(amountUsdt);
  const shortId = getShortId(paymentRequestId);
  const message = `\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 #${shortId} \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430! \u0421\u0443\u043C\u043C\u0430: ${amount} USDT`;
  await sendUserNotification(userId, message, "payment_paid", {
    paymentRequestId,
    amount,
    amountUsdt: amountUsdt.toString()
  });
}
async function notifyPaymentRejected(userId, paymentRequestId, reason) {
  const shortId = getShortId(paymentRequestId);
  const reasonText = reason || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430";
  const message = `\u274C \u0417\u0430\u044F\u0432\u043A\u0430 #${shortId} \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430. \u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${reasonText}`;
  await sendUserNotification(userId, message, "payment_rejected", {
    paymentRequestId,
    reason: reasonText
  });
}
async function notifyPaymentStatusChanged(userId, paymentRequestId, oldStatus, newStatus) {
  const shortId = getShortId(paymentRequestId);
  const statusMap = {
    "submitted": "\u041F\u043E\u0434\u0430\u043D\u0430",
    "in_progress": "\u0412 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435",
    "paid": "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u0430",
    "rejected": "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430",
    "cancelled": "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430"
  };
  const oldStatusText = statusMap[oldStatus] || oldStatus;
  const newStatusText = statusMap[newStatus] || newStatus;
  const message = `\u{1F4CB} \u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u044F\u0432\u043A\u0438 #${shortId} \u0438\u0437\u043C\u0435\u043D\u0451\u043D: ${oldStatusText} \u2192 ${newStatusText}`;
  await sendUserNotification(userId, message, "payment_status_changed", {
    paymentRequestId,
    oldStatus,
    newStatus,
    oldStatusText,
    newStatusText
  });
}

// server/controllers/paymentController.ts
var logger8 = createLogger2("paymentController");
async function getUserPaymentRequests(req, res) {
  try {
    const { userId } = req.params;
    const requests = await storage.getPaymentRequestsByUserId(userId);
    const formatted = requests.map((req2) => ({
      id: req2.id,
      amountRub: parseFloat(req2.amountRub),
      amountUsdt: parseFloat(req2.amountUsdt),
      frozenRate: parseFloat(req2.frozenRate),
      urgency: req2.urgency,
      hasUrgentFee: req2.hasUrgentFee === 1,
      usdtFrozen: parseFloat(req2.amountUsdt),
      attachments: req2.attachments || [],
      comment: req2.comment || "",
      status: req2.status,
      // receipt is admin-only, not exposed to regular users
      receipt: req2.status === "paid" ? req2.receipt || void 0 : void 0,
      createdAt: req2.createdAt.toISOString()
    }));
    res.json(formatted);
  } catch (error) {
    logger8.error("Error getting payment requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getPaymentRequest(req, res) {
  try {
    const { requestId } = req.params;
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
    res.json({
      id: request.id,
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments || [],
      comment: request.comment || "",
      status: request.status,
      createdAt: request.createdAt.toISOString()
    });
  } catch (error) {
    logger8.error("Error getting payment request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function createPaymentRequest(req, res) {
  try {
    const { userId, amountRub, amountUsdt, frozenRate, urgency, attachments, comment } = req.body;
    if (!userId || !amountRub || !amountUsdt || !frozenRate || !urgency) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const availableBalance = parseFloat(user.availableBalance);
    const requestAmount = parseFloat(amountUsdt);
    if (availableBalance < requestAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    const request = await storage.createPaymentRequest({
      userId,
      amountRub: amountRub.toString(),
      amountUsdt: amountUsdt.toString(),
      frozenRate: frozenRate.toString(),
      urgency,
      hasUrgentFee: urgency === "urgent" ? 1 : 0,
      attachments: attachments || [],
      comment: comment || null,
      status: "submitted"
    });
    const newAvailableBalance = (availableBalance - requestAmount).toFixed(8);
    const frozenBalance = parseFloat(user.frozenBalance);
    const newFrozenBalance = (frozenBalance + requestAmount).toFixed(8);
    await storage.updateUserBalance(userId, newAvailableBalance, newFrozenBalance);
    await sendUserNotification(
      userId,
      `\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 ${parseFloat(amountRub).toLocaleString("ru-RU")} \u20BD \u0441\u043E\u0437\u0434\u0430\u043D\u0430`,
      "general"
    );
    try {
      await notifyOnlineOperators(request);
    } catch (error) {
      logger8.error("Failed to notify operators:", error);
    }
    res.json({
      id: request.id,
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments || [],
      comment: request.comment || "",
      status: request.status,
      receipt: request.receipt || void 0,
      createdAt: request.createdAt.toISOString()
    });
  } catch (error) {
    logger8.error("Error creating payment request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function updatePaymentRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    if (!["submitted", "processing", "paid", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await storage.updatePaymentRequestStatus(requestId, status);
    if (status === "paid") {
      const frozenBalance = parseFloat(user.frozenBalance);
      const requestAmount = parseFloat(request.amountUsdt);
      const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);
      await storage.updateUserBalance(request.userId, user.availableBalance, newFrozenBalance);
      await notifyPaymentPaid(request.userId, request.id, requestAmount);
      if (user.referrerId) {
        try {
          const referrer = await storage.getUser(user.referrerId);
          if (referrer) {
            const amountRub = parseFloat(request.amountRub);
            const frozenRate = parseFloat(request.frozenRate);
            const commissionPercent = 5e-3;
            const commissionRub = amountRub * commissionPercent;
            const commissionUsdt = (commissionRub / frozenRate).toFixed(8);
            await storage.updateReferralBalance(user.referrerId, commissionUsdt);
            await sendUserNotification(
              user.referrerId,
              `\u{1F4B0} \u0420\u0435\u0444\u0435\u0440\u0430\u043B\u044C\u043D\u0430\u044F \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u044F: +${parseFloat(commissionUsdt).toFixed(2)} USDT \u043E\u0442 \u043E\u043F\u043B\u0430\u0442\u044B \u0432\u0430\u0448\u0435\u0433\u043E \u0440\u0435\u0444\u0435\u0440\u0430\u043B\u0430`,
              "general",
              {
                referralId: user.id,
                referralUsername: user.username,
                commissionUsdt,
                paymentId: request.id
              }
            );
            logger8.info(`[Referral] Commission credited: ${commissionUsdt} USDT to user ${user.referrerId} from payment ${request.id}`);
          }
        } catch (error) {
          logger8.error("[Referral] Error processing referral commission:", error);
        }
      }
    } else if (status === "rejected") {
      const availableBalance = parseFloat(user.availableBalance);
      const frozenBalance = parseFloat(user.frozenBalance);
      const requestAmount = parseFloat(request.amountUsdt);
      const newAvailableBalance = (availableBalance + requestAmount).toFixed(8);
      const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);
      await storage.updateUserBalance(request.userId, newAvailableBalance, newFrozenBalance);
      await notifyPaymentRejected(request.userId, request.id, "\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430");
    } else if (status === "cancelled") {
      const availableBalance = parseFloat(user.availableBalance);
      const frozenBalance = parseFloat(user.frozenBalance);
      const requestAmount = parseFloat(request.amountUsdt);
      const newAvailableBalance = (availableBalance + requestAmount).toFixed(8);
      const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);
      await storage.updateUserBalance(request.userId, newAvailableBalance, newFrozenBalance);
      await sendUserNotification(
        request.userId,
        `\u0417\u0430\u044F\u0432\u043A\u0430 \u2116${request.id.slice(-6)} \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430. \u0421\u0440\u0435\u0434\u0441\u0442\u0432\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B.`,
        "general"
      );
    } else {
      await sendUserNotification(
        request.userId,
        `\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u044F\u0432\u043A\u0438 \u2116${request.id.slice(-6)} \u0438\u0437\u043C\u0435\u043D\u0435\u043D: ${status}`,
        "general"
      );
    }
    res.json({ success: true, status });
  } catch (error) {
    logger8.error("Error updating payment request status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/controllers/notificationController.ts
var logger9 = createLogger2("notificationController");
async function getUserNotifications(req, res) {
  try {
    const { userId } = req.params;
    const notifications2 = await storage.getNotificationsByUserId(userId);
    const formatted = notifications2.map((notif) => ({
      id: notif.id,
      requestId: notif.requestId,
      type: notif.type,
      message: notif.message,
      isRead: notif.isRead === 1,
      createdAt: notif.createdAt.toISOString()
    }));
    res.json(formatted);
  } catch (error) {
    logger9.error("Error getting notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function markNotificationAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    await storage.markNotificationAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    logger9.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getUnreadNotificationsCount(req, res) {
  try {
    const { userId } = req.params;
    const count = await storage.getUnreadNotificationsCount(userId);
    res.json({ count });
  } catch (error) {
    logger9.error("Error getting unread count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/utils/password.ts
import crypto2 from "crypto";
var ITERATIONS = 1e5;
var KEY_LENGTH = 64;
var DIGEST = "sha512";
function generateSalt() {
  return crypto2.randomBytes(32).toString("hex");
}
function hashPasswordWithSalt(password, salt) {
  return crypto2.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
}
function verifyPasswordWithSalt(password, salt, hash) {
  const verifyHash = hashPasswordWithSalt(password, salt);
  return hash === verifyHash;
}

// server/controllers/adminController.ts
var logger10 = createLogger2("adminController");
function verifyAdminPassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  return password === adminPassword;
}
async function adminLogin(req, res) {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
    if (!verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Invalid password" });
    }
    res.json({ success: true, message: "Login successful" });
  } catch (error) {
    logger10.error("Error in admin login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getAllUsers(req, res) {
  try {
    const { password } = req.query;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const allUsers = await storage.getAllUsers();
    const formattedUsers = allUsers.map((user) => ({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      availableBalance: parseFloat(user.availableBalance),
      frozenBalance: parseFloat(user.frozenBalance),
      registeredAt: user.registeredAt.toISOString()
    }));
    res.json(formattedUsers);
  } catch (error) {
    logger10.error("Error getting all users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getAllPaymentRequests(req, res) {
  try {
    const { password, status, userId, urgency } = req.query;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    let requestsWithJoins = await storage.getAllPaymentRequestsWithJoins();
    if (status && status !== "all") {
      if (status === "active") {
        requestsWithJoins = requestsWithJoins.filter((r) => ["submitted", "assigned", "processing"].includes(r.request.status));
      } else if (status === "completed") {
        requestsWithJoins = requestsWithJoins.filter((r) => ["paid", "rejected", "cancelled"].includes(r.request.status));
      } else {
        requestsWithJoins = requestsWithJoins.filter((r) => r.request.status === status);
      }
    }
    if (userId) {
      requestsWithJoins = requestsWithJoins.filter((r) => r.request.userId === userId);
    }
    if (urgency && urgency !== "all") {
      requestsWithJoins = requestsWithJoins.filter((r) => r.request.urgency === urgency);
    }
    const requestsWithUsers = requestsWithJoins.map(({ request, user, operator }) => {
      let processingTimeMinutes = null;
      if (request.assignedAt && request.completedAt) {
        const diffMs = request.completedAt.getTime() - request.assignedAt.getTime();
        processingTimeMinutes = Math.round(diffMs / 6e4);
      }
      return {
        id: request.id,
        userId: request.userId,
        username: user?.username || "Unknown",
        fullName: user?.fullName || null,
        avatarUrl: user?.avatarUrl || null,
        amountRub: parseFloat(request.amountRub),
        amountUsdt: parseFloat(request.amountUsdt),
        frozenRate: parseFloat(request.frozenRate),
        urgency: request.urgency,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        assignedOperatorLogin: operator?.login || null,
        assignedAt: request.assignedAt?.toISOString() || null,
        completedAt: request.completedAt?.toISOString() || null,
        processingTimeMinutes
      };
    });
    res.json(requestsWithUsers);
  } catch (error) {
    logger10.error("Error getting all payment requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function updateUserBalance(req, res) {
  try {
    const { userId } = req.params;
    const { password, availableBalance, frozenBalance } = req.body;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (availableBalance === void 0 || frozenBalance === void 0) {
      return res.status(400).json({ error: "Both availableBalance and frozenBalance are required" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await storage.updateUserBalance(
      userId,
      availableBalance.toString(),
      frozenBalance.toString()
    );
    await sendUserNotification(
      userId,
      `\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0438\u0437\u043C\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ${availableBalance} USDT, \u0417\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u043E: ${frozenBalance} USDT`,
      "general"
    );
    res.json({ success: true, message: "Balance updated successfully" });
  } catch (error) {
    logger10.error("Error updating user balance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function addUserDeposit(req, res) {
  try {
    const { userId } = req.params;
    const { password, amount } = req.body;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid deposit amount is required" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const currentAvailable = parseFloat(user.availableBalance);
    const newAvailable = (currentAvailable + amount).toFixed(8);
    await storage.updateUserBalance(userId, newAvailable, user.frozenBalance);
    await sendUserNotification(
      userId,
      `\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0441\u0447\u0435\u0442\u0430: +${amount} USDT. \u041D\u043E\u0432\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: ${newAvailable} USDT`,
      "general"
    );
    res.json({
      success: true,
      message: "Deposit added successfully",
      newBalance: parseFloat(newAvailable)
    });
  } catch (error) {
    logger10.error("Error adding deposit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function approvePaymentRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { password } = req.body;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
    if (request.status === "paid") {
      return res.status(400).json({ error: "Payment request already paid" });
    }
    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const oldStatus = request.status;
    await storage.updatePaymentRequestStatus(requestId, "paid");
    const frozenBalance = parseFloat(user.frozenBalance);
    const requestAmount = parseFloat(request.amountUsdt);
    const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);
    await storage.updateUserBalance(request.userId, user.availableBalance, newFrozenBalance);
    await notifyPaymentPaid(request.userId, request.id, requestAmount);
    if (oldStatus !== "paid") {
      await notifyPaymentStatusChanged(request.userId, request.id, oldStatus, "paid");
    }
    res.json({
      success: true,
      message: "Payment request approved and paid"
    });
  } catch (error) {
    logger10.error("Error approving payment request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function cancelPaymentRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { password } = req.body;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
    if (request.status === "paid") {
      return res.status(400).json({ error: "Cannot cancel paid request" });
    }
    if (request.status === "cancelled") {
      return res.status(400).json({ error: "Payment request already cancelled" });
    }
    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const oldStatus = request.status;
    await storage.updatePaymentRequestStatus(requestId, "cancelled");
    const availableBalance = parseFloat(user.availableBalance);
    const frozenBalance = parseFloat(user.frozenBalance);
    const requestAmount = parseFloat(request.amountUsdt);
    const newAvailableBalance = (availableBalance + requestAmount).toFixed(8);
    const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);
    await storage.updateUserBalance(request.userId, newAvailableBalance, newFrozenBalance);
    await notifyPaymentRejected(request.userId, request.id, "\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C");
    if (oldStatus !== "cancelled") {
      await notifyPaymentStatusChanged(request.userId, request.id, oldStatus, "cancelled");
    }
    res.json({
      success: true,
      message: "Payment request cancelled, funds returned to user"
    });
  } catch (error) {
    logger10.error("Error cancelling payment request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getPaymentRequestForAdmin(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.query;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const request = await storage.getPaymentRequest(id);
    if (!request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
    const user = await storage.getUser(request.userId);
    let assignedOperatorLogin = null;
    if (request.assignedOperatorId) {
      const operator = await storage.getOperator(request.assignedOperatorId);
      assignedOperatorLogin = operator?.login || null;
    }
    let processingTimeMinutes = null;
    if (request.assignedAt && request.completedAt) {
      const diffMs = request.completedAt.getTime() - request.assignedAt.getTime();
      processingTimeMinutes = Math.round(diffMs / 6e4);
    }
    res.json({
      id: request.id,
      userId: request.userId,
      telegramId: user?.telegramId || null,
      username: user?.username || "Unknown",
      fullName: user?.fullName || null,
      avatarUrl: user?.avatarUrl || null,
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments || [],
      comment: request.comment || "",
      status: request.status,
      receipt: request.receipt || null,
      adminComment: request.adminComment || "",
      assignedOperatorId: request.assignedOperatorId || null,
      assignedOperatorLogin,
      assignedAt: request.assignedAt?.toISOString() || null,
      completedAt: request.completedAt?.toISOString() || null,
      processingTimeMinutes,
      createdAt: request.createdAt.toISOString()
    });
  } catch (error) {
    logger10.error("Error getting payment request for admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function processPaymentRequest(req, res) {
  try {
    const { id } = req.params;
    const { password, status, receipt, adminComment, newAmountRub } = req.body;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!["paid", "rejected"].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "paid" or "rejected"' });
    }
    if (receipt) {
      const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!receipt.mimeType || !allowedMimeTypes.includes(receipt.mimeType)) {
        return res.status(400).json({ error: "Invalid receipt mime type. Allowed: PDF, JPG, PNG" });
      }
      const base64Length = receipt.value?.length || 0;
      const approximateFileSize = base64Length * 3 / 4;
      const maxSize = 10 * 1024 * 1024;
      if (approximateFileSize > maxSize) {
        return res.status(400).json({ error: "Receipt file too large. Maximum size: 10MB" });
      }
      if (!receipt.name || !receipt.type) {
        return res.status(400).json({ error: "Receipt must include name and type" });
      }
    }
    const request = await storage.getPaymentRequest(id);
    if (!request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
    if (request.status === "paid" || request.status === "rejected") {
      return res.status(400).json({ error: `Payment request already ${request.status}` });
    }
    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let finalAmountRub = parseFloat(request.amountRub);
    let finalAmountUsdt = parseFloat(request.amountUsdt);
    const frozenRate = parseFloat(request.frozenRate);
    let amountAdjustmentUsdt = 0;
    if (newAmountRub && Math.abs(newAmountRub - finalAmountRub) > 0.01) {
      const newAmountUsdt = newAmountRub / frozenRate;
      const oldAmountUsdt = parseFloat(request.amountUsdt);
      amountAdjustmentUsdt = newAmountUsdt - oldAmountUsdt;
      if (amountAdjustmentUsdt > 1e-8) {
        const availableBalance2 = parseFloat(user.availableBalance);
        if (availableBalance2 < amountAdjustmentUsdt) {
          return res.status(400).json({
            error: `\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u043A\u043B\u0438\u0435\u043D\u0442\u0430. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ${availableBalance2.toFixed(2)} USDT, \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E: ${amountAdjustmentUsdt.toFixed(2)} USDT. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0437\u0430\u044F\u0432\u043A\u0443.`,
            insufficientBalance: true,
            available: availableBalance2.toFixed(2),
            required: amountAdjustmentUsdt.toFixed(2)
          });
        }
      }
      finalAmountRub = newAmountRub;
      finalAmountUsdt = newAmountUsdt;
    }
    const updates = { status };
    if (receipt) updates.receipt = receipt;
    if (adminComment) updates.adminComment = adminComment;
    if (newAmountRub && Math.abs(newAmountRub - parseFloat(request.amountRub)) > 0.01) {
      updates.amountRub = finalAmountRub.toFixed(2);
      updates.amountUsdt = finalAmountUsdt.toFixed(8);
    }
    const oldStatus = request.status;
    await storage.updatePaymentRequestFull(id, updates);
    let frozenBalance = parseFloat(user.frozenBalance);
    let availableBalance = parseFloat(user.availableBalance);
    if (amountAdjustmentUsdt !== 0) {
      if (amountAdjustmentUsdt > 0) {
        availableBalance -= amountAdjustmentUsdt;
        frozenBalance += amountAdjustmentUsdt;
      } else {
        const excessUsdt = Math.abs(amountAdjustmentUsdt);
        availableBalance += excessUsdt;
        frozenBalance -= excessUsdt;
      }
    }
    const requestAmount = finalAmountUsdt;
    if (status === "paid") {
      frozenBalance = Math.max(0, frozenBalance - requestAmount);
      await storage.updateUserBalance(request.userId, availableBalance.toFixed(8), frozenBalance.toFixed(8));
      await notifyPaymentPaid(request.userId, request.id, requestAmount);
      if (oldStatus !== "paid") {
        await notifyPaymentStatusChanged(request.userId, request.id, oldStatus, "paid");
      }
    } else if (status === "rejected") {
      availableBalance += requestAmount;
      frozenBalance = Math.max(0, frozenBalance - requestAmount);
      await storage.updateUserBalance(request.userId, availableBalance.toFixed(8), frozenBalance.toFixed(8));
      await notifyPaymentRejected(request.userId, request.id, adminComment || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430");
      if (oldStatus !== "rejected") {
        await notifyPaymentStatusChanged(request.userId, request.id, oldStatus, "rejected");
      }
    }
    const updatedRequest = await storage.getPaymentRequest(id);
    if (!updatedRequest) {
      return res.status(500).json({ error: "Failed to fetch updated payment request" });
    }
    res.json({
      success: true,
      message: `Payment request ${status}`,
      paymentRequest: {
        id: updatedRequest.id,
        userId: updatedRequest.userId,
        username: user.username,
        amountRub: parseFloat(updatedRequest.amountRub),
        amountUsdt: parseFloat(updatedRequest.amountUsdt),
        frozenRate: parseFloat(updatedRequest.frozenRate),
        urgency: updatedRequest.urgency,
        hasUrgentFee: updatedRequest.hasUrgentFee === 1,
        usdtFrozen: parseFloat(updatedRequest.amountUsdt),
        attachments: updatedRequest.attachments || [],
        comment: updatedRequest.comment || "",
        status: updatedRequest.status,
        receipt: updatedRequest.receipt || null,
        createdAt: updatedRequest.createdAt.toISOString()
      }
    });
  } catch (error) {
    logger10.error("Error processing payment request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getAllOperators(req, res) {
  try {
    const { password } = req.query;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const operators2 = await storage.getAllOperators();
    const formattedOperators = operators2.map((op) => ({
      id: op.id,
      login: op.login,
      isActive: op.isActive === 1,
      createdAt: op.createdAt.toISOString()
    }));
    res.json(formattedOperators);
  } catch (error) {
    logger10.error("Error getting operators:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function createOperator(req, res) {
  try {
    const { password, login, operatorPassword } = req.body;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!login || !operatorPassword) {
      return res.status(400).json({ error: "Login and password are required" });
    }
    const existingOperator = await storage.getOperatorByLogin(login);
    if (existingOperator) {
      return res.status(400).json({ error: "\u041B\u043E\u0433\u0438\u043D \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F" });
    }
    const salt = generateSalt();
    const passwordHash = hashPasswordWithSalt(operatorPassword, salt);
    const operator = await storage.createOperator({
      login,
      passwordHash,
      salt,
      isActive: 1
    });
    res.json({
      id: operator.id,
      login: operator.login,
      isActive: operator.isActive === 1,
      createdAt: operator.createdAt.toISOString()
    });
  } catch (error) {
    logger10.error("Error creating operator:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function updateOperatorStatus(req, res) {
  try {
    const { password, isActive } = req.body;
    const { id } = req.params;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }
    await storage.updateOperatorStatus(id, isActive ? 1 : 0);
    res.json({ success: true, message: "\u0421\u0442\u0430\u0442\u0443\u0441 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D" });
  } catch (error) {
    logger10.error("Error updating operator status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function updateOperatorOnlineStatus(req, res) {
  try {
    const { id } = req.params;
    const { password, isOnline } = req.body;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (isOnline === void 0) {
      return res.status(400).json({ error: "isOnline field is required" });
    }
    const operator = await storage.getOperator(id);
    if (!operator) {
      return res.status(404).json({ error: "Operator not found" });
    }
    await storage.setOperatorOnline(id, isOnline);
    const updatedOperator = await storage.getOperator(id);
    res.json({
      id: updatedOperator.id,
      login: updatedOperator.login,
      isActive: updatedOperator.isActive === 1,
      isOnline: updatedOperator.isOnline === 1,
      lastActivityAt: updatedOperator.lastActivityAt?.toISOString() || null,
      createdAt: updatedOperator.createdAt.toISOString()
    });
  } catch (error) {
    logger10.error("Error updating operator online status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function deleteOperator(req, res) {
  try {
    const { password } = req.body;
    const { id } = req.params;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await storage.deleteOperator(id);
    res.json({ success: true, message: "\u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u0443\u0434\u0430\u043B\u0435\u043D" });
  } catch (error) {
    logger10.error("Error deleting operator:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function updateOperatorCredentials(req, res) {
  try {
    const { password, login, newPassword } = req.body;
    const { id } = req.params;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const operator = await storage.getOperator(id);
    if (!operator) {
      return res.status(404).json({ error: "\u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    }
    if (login && login !== operator.login) {
      const existingOperator = await storage.getOperatorByLogin(login);
      if (existingOperator) {
        return res.status(400).json({ error: "\u041B\u043E\u0433\u0438\u043D \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442" });
      }
    }
    const updates = {};
    if (login && login !== operator.login) {
      updates.login = login;
    }
    if (newPassword) {
      const salt = generateSalt();
      const passwordHash = hashPasswordWithSalt(newPassword, salt);
      updates.passwordHash = passwordHash;
      updates.salt = salt;
    }
    if (Object.keys(updates).length > 0) {
      await storage.updateOperatorCredentials(id, updates);
    }
    res.json({ success: true, message: "\u0414\u0430\u043D\u043D\u044B\u0435 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B" });
  } catch (error) {
    logger10.error("Error updating operator credentials:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getOperatorStatisticsForAdmin(req, res) {
  try {
    const { password } = req.query;
    const { id } = req.params;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const operator = await storage.getOperator(id);
    if (!operator) {
      return res.status(404).json({ error: "\u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    }
    const statistics = await storage.getOperatorStatistics(id);
    res.json(statistics);
  } catch (error) {
    logger10.error("Error getting operator statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function adminGetUserStats(req, res) {
  try {
    const { password } = req.query;
    const { userId } = req.params;
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    }
    const deposits2 = await storage.getDepositsByUserId(userId);
    const payments = await storage.getPaymentRequestsByUserId(userId);
    const confirmedDeposits = deposits2.filter((d) => d.status === "confirmed");
    const totalDeposits = confirmedDeposits.length;
    const totalDepositedAmount = confirmedDeposits.reduce(
      (sum, d) => sum + parseFloat(d.amount),
      0
    );
    const lastDepositDate = confirmedDeposits.length > 0 ? confirmedDeposits[0].confirmedAt?.toISOString() || null : null;
    const completedPayments = payments.filter((p) => p.status === "paid");
    const totalPayments = completedPayments.length;
    const totalPaidAmountUsdt = completedPayments.reduce(
      (sum, p) => sum + parseFloat(p.amountUsdt),
      0
    );
    const totalPaidAmountRub = completedPayments.reduce(
      (sum, p) => sum + parseFloat(p.amountRub),
      0
    );
    const lastPaymentDate = completedPayments.length > 0 ? completedPayments[0].completedAt?.toISOString() || null : null;
    const recentDeposits = deposits2.slice(0, 5).map((d) => ({
      id: d.id,
      amount: parseFloat(d.amount),
      status: d.status,
      txHash: d.txHash,
      createdAt: d.createdAt.toISOString(),
      confirmedAt: d.confirmedAt?.toISOString() || null
    }));
    const recentPayments = payments.slice(0, 5).map((p) => ({
      id: p.id,
      amountRub: parseFloat(p.amountRub),
      amountUsdt: parseFloat(p.amountUsdt),
      status: p.status,
      urgency: p.urgency,
      createdAt: p.createdAt.toISOString(),
      completedAt: p.completedAt?.toISOString() || null
    }));
    const availableBalance = parseFloat(user.availableBalance);
    const frozenBalance = parseFloat(user.frozenBalance);
    const totalBalance = availableBalance + frozenBalance;
    res.json({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      registeredAt: user.registeredAt.toISOString(),
      availableBalance,
      frozenBalance,
      totalBalance,
      totalDeposits,
      totalDepositedAmount,
      lastDepositDate,
      totalPayments,
      totalPaidAmountUsdt,
      totalPaidAmountRub,
      lastPaymentDate,
      recentDeposits,
      recentPayments
    });
  } catch (error) {
    logger10.error("Error getting user statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/services/depositUniqueness.ts
var MIN_DEPOSIT_USDT = 30;
var MAX_DEPOSIT_USDT = 2e4;
var MAX_DELTA_CENTS = BigInt(1e9);
var SCALE = BigInt(1e8);
function validateDepositAmount(amount) {
  if (amount < MIN_DEPOSIT_USDT) {
    return { valid: false, error: `\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0443\u043C\u043C\u0430 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F ${MIN_DEPOSIT_USDT} USDT` };
  }
  if (amount > MAX_DEPOSIT_USDT) {
    return { valid: false, error: `\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0443\u043C\u043C\u0430 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F ${MAX_DEPOSIT_USDT} USDT` };
  }
  return { valid: true };
}
function decimalStringToBigInt2(value) {
  let str;
  if (typeof value === "number") {
    str = value.toLocaleString("en-US", {
      useGrouping: false,
      minimumFractionDigits: 0,
      maximumFractionDigits: 20
    });
  } else {
    str = value;
  }
  const isNegative = str.startsWith("-");
  const absStr = isNegative ? str.slice(1) : str;
  const [intPart, decPart = ""] = absStr.split(".");
  if (!decPart || decPart.length <= 8) {
    const paddedDec = decPart.padEnd(8, "0");
    const result2 = BigInt(intPart || "0") * SCALE + BigInt(paddedDec);
    return isNegative ? -result2 : result2;
  }
  const first8Digits = decPart.slice(0, 8);
  const digit9 = parseInt(decPart[8] || "0", 10);
  let fractionalScaled = BigInt(first8Digits);
  let integerPart = BigInt(intPart || "0");
  if (digit9 >= 5) {
    fractionalScaled += BigInt(1);
    if (fractionalScaled >= SCALE) {
      integerPart += BigInt(1);
      fractionalScaled = BigInt(0);
    }
  }
  const result = integerPart * SCALE + fractionalScaled;
  return isNegative ? -result : result;
}
function bigIntToDecimal2(scaled) {
  return Number(scaled) / Number(SCALE);
}
async function generateUniquePayableAmount(requestedAmount) {
  const scaledRequested = decimalStringToBigInt2(requestedAmount);
  const activeDeposits = await storage.getActiveDeposits();
  console.log(`[generateUniquePayableAmount] Requested: ${requestedAmount} USDT`);
  console.log(`[generateUniquePayableAmount] Found ${activeDeposits.length} active deposits`);
  const usedAmountsScaled = new Set(
    activeDeposits.map((d) => d.payableAmount ? decimalStringToBigInt2(d.payableAmount) : null).filter((amt) => amt !== null)
  );
  if (usedAmountsScaled.size > 0) {
    console.log(`[generateUniquePayableAmount] Used amounts: ${Array.from(usedAmountsScaled).map((amt) => bigIntToDecimal2(amt)).join(", ")}`);
  }
  if (!usedAmountsScaled.has(scaledRequested)) {
    console.log(`[generateUniquePayableAmount] Exact amount ${requestedAmount} is available, using it`);
    return bigIntToDecimal2(scaledRequested);
  }
  console.log(`[generateUniquePayableAmount] Amount ${requestedAmount} is already in use, searching for unique variation...`);
  const ONE_CENT = BigInt(1e6);
  let deltaScaled = ONE_CENT;
  let attempts = 0;
  const maxAttempts = 200;
  while (attempts < maxAttempts && deltaScaled <= MAX_DELTA_CENTS) {
    const candidateDown = scaledRequested - deltaScaled;
    if (candidateDown >= scaledRequested - MAX_DELTA_CENTS) {
      if (!usedAmountsScaled.has(candidateDown)) {
        const uniqueAmount = bigIntToDecimal2(candidateDown);
        console.log(`[generateUniquePayableAmount] Found unique amount: ${uniqueAmount} (${requestedAmount} - ${bigIntToDecimal2(deltaScaled)})`);
        return uniqueAmount;
      }
    }
    attempts++;
    const candidateUp = scaledRequested + deltaScaled;
    if (candidateUp <= scaledRequested + MAX_DELTA_CENTS) {
      if (!usedAmountsScaled.has(candidateUp)) {
        const uniqueAmount = bigIntToDecimal2(candidateUp);
        console.log(`[generateUniquePayableAmount] Found unique amount: ${uniqueAmount} (${requestedAmount} + ${bigIntToDecimal2(deltaScaled)})`);
        return uniqueAmount;
      }
    }
    attempts++;
    deltaScaled += ONE_CENT;
  }
  const requestedStr = formatUsdtBalance(bigIntToDecimal2(scaledRequested));
  throw new Error(
    `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u0434\u043B\u044F ${requestedStr} USDT. \u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0434\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0432 \u0441 \u043F\u043E\u0445\u043E\u0436\u0438\u043C\u0438 \u0441\u0443\u043C\u043C\u0430\u043C\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.`
  );
}

// server/config/constants.ts
var MAX_PENDING_DEPOSITS = 3;

// server/controllers/depositController.ts
var logger11 = createLogger2("depositController");
function verifyAdminPassword2(password) {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  return password === adminPassword;
}
var DEPOSIT_EXPIRATION_MINUTES = 10;
async function createAutomatedDeposit(req, res) {
  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { userId, requestedAmount: rawRequestedAmount } = req.body;
      logger11.info(`[createAutomatedDeposit] START (attempt ${attempt}/${MAX_RETRIES}) - userId: ${userId}, rawAmount: ${rawRequestedAmount}`);
      if (!userId || rawRequestedAmount === void 0 || rawRequestedAmount === null) {
        return res.status(400).json({ error: "userId \u0438 requestedAmount \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
      }
      const requestedAmount = parseFloat(rawRequestedAmount);
      if (isNaN(requestedAmount)) {
        return res.status(400).json({ error: "requestedAmount \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0447\u0438\u0441\u043B\u043E\u043C" });
      }
      const validation = validateDepositAmount(requestedAmount);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      const pendingDepositsCount = await storage.countUserPendingDeposits(userId);
      if (pendingDepositsCount >= MAX_PENDING_DEPOSITS) {
        return res.status(400).json({
          error: `\u0423 \u0432\u0430\u0441 \u0443\u0436\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u043E ${MAX_PENDING_DEPOSITS} \u0437\u0430\u044F\u0432\u043A\u0438 \u043D\u0430 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u043F\u043B\u0430\u0442\u0438\u0442\u0435 \u0438\u0445 \u0438\u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435\u043C \u043D\u043E\u0432\u043E\u0439.`
        });
      }
      logger11.info(`[createAutomatedDeposit] Calling generateUniquePayableAmount for ${requestedAmount} USDT`);
      const payableAmount = await generateUniquePayableAmount(requestedAmount);
      logger11.info(`[createAutomatedDeposit] Generated payableAmount: ${payableAmount} USDT`);
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + DEPOSIT_EXPIRATION_MINUTES);
      const insertDeposit = {
        userId,
        amount: formatUsdtForStorage(requestedAmount),
        requestedAmount: formatUsdtForStorage(requestedAmount),
        payableAmount: formatUsdtForStorage(payableAmount),
        walletAddress: getMasterWalletAddress(),
        expiresAt,
        status: "pending",
        txHash: null
      };
      const deposit = await storage.createDeposit(insertDeposit);
      logger11.info(`[createAutomatedDeposit] Deposit created successfully with payableAmount: ${payableAmount}`);
      await sendUserNotification(
        userId,
        `\u0421\u043E\u0437\u0434\u0430\u043D\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 ${formatUsdtBalance(requestedAmount)} USDT. \u041F\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u0440\u043E\u0432\u043D\u043E ${formatUsdtBalance(payableAmount)} USDT \u043D\u0430 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 10 \u043C\u0438\u043D\u0443\u0442.`,
        "general"
      );
      return res.json({
        id: deposit.id,
        walletAddress: getMasterWalletAddress(),
        requestedAmount,
        payableAmount,
        expiresAt: expiresAt.toISOString(),
        status: deposit.status,
        createdAt: deposit.createdAt.toISOString()
      });
    } catch (error) {
      const isUniqueConstraintViolation = error?.code === "23505" || error?.message?.includes("unique_pending_payable_amount") || error?.message?.includes("duplicate key");
      if (isUniqueConstraintViolation && attempt < MAX_RETRIES) {
        logger11.info(`[createAutomatedDeposit] Unique constraint violation on attempt ${attempt}, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }
      logger11.error(`[createAutomatedDeposit] Error on attempt ${attempt}:`, error);
      const errorMessage = error instanceof Error ? error.message : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0434\u0435\u043F\u043E\u0437\u0438\u0442";
      return res.status(500).json({ error: errorMessage });
    }
  }
  return res.status(500).json({
    error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0434\u0435\u043F\u043E\u0437\u0438\u0442 \u043F\u043E\u0441\u043B\u0435 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u043F\u043E\u043F\u044B\u0442\u043E\u043A. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437."
  });
}
async function createDeposit(req, res) {
  try {
    const { userId, amount, txHash } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: "userId and amount are required" });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }
    const insertDeposit = {
      userId,
      amount: formatUsdtForStorage(amount),
      status: "pending",
      txHash: txHash || null
    };
    const deposit = await storage.createDeposit(insertDeposit);
    await sendUserNotification(
      userId,
      `\u0421\u043E\u0437\u0434\u0430\u043D\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u0434\u0435\u043F\u043E\u0437\u0438\u0442 ${formatUsdtBalance(amount)} USDT. \u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C.`,
      "general"
    );
    res.json(deposit);
  } catch (error) {
    logger11.error("Error creating deposit:", error);
    res.status(500).json({ error: "Failed to create deposit" });
  }
}
async function getUserDeposits(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const deposits2 = await storage.getDepositsByUserId(userId);
    const formattedDeposits = deposits2.map((deposit) => ({
      ...deposit,
      amount: parseFloat(deposit.amount)
    }));
    res.json(formattedDeposits);
  } catch (error) {
    logger11.error("Error getting user deposits:", error);
    res.status(500).json({ error: "Failed to get deposits" });
  }
}
async function cancelDeposit(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Deposit ID is required" });
    }
    const deposit = await storage.getDeposit(id);
    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }
    if (deposit.status !== "pending") {
      return res.status(400).json({ error: "Only pending deposits can be cancelled" });
    }
    await storage.updateDepositStatus(id, "cancelled");
    await sendUserNotification(
      deposit.userId,
      `\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 ${formatUsdtBalance(deposit.requestedAmount || deposit.amount)} USDT \u0431\u044B\u043B\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430`,
      "general"
    );
    res.json({ success: true });
  } catch (error) {
    logger11.error("Error cancelling deposit:", error);
    res.status(500).json({ error: "Failed to cancel deposit" });
  }
}
async function getPendingDeposits(req, res) {
  try {
    const { password } = req.query;
    if (!password || !verifyAdminPassword2(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const deposits2 = await storage.getPendingDeposits();
    const users2 = await storage.getAllUsers();
    const userMap = new Map(users2.map((u) => [u.id, u]));
    const formattedDeposits = deposits2.map((deposit) => {
      const user = userMap.get(deposit.userId);
      return {
        ...deposit,
        amount: parseFloat(deposit.amount),
        username: user?.username || "Unknown"
      };
    });
    res.json(formattedDeposits);
  } catch (error) {
    logger11.error("Error getting pending deposits:", error);
    res.status(500).json({ error: "Failed to get pending deposits" });
  }
}
async function getAllDeposits(req, res) {
  try {
    const { password, status } = req.query;
    if (!password || !verifyAdminPassword2(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    let depositsWithJoins = await storage.getAllDepositsWithJoins();
    if (status && status !== "all") {
      depositsWithJoins = depositsWithJoins.filter((d) => d.deposit.status === status);
    }
    const formattedDeposits = depositsWithJoins.map(({ deposit, user }) => {
      return {
        ...deposit,
        amount: parseFloat(deposit.amount),
        username: user?.username || "Unknown"
      };
    });
    res.json(formattedDeposits);
  } catch (error) {
    logger11.error("Error getting all deposits:", error);
    res.status(500).json({ error: "Failed to get all deposits" });
  }
}
async function confirmDeposit(req, res) {
  try {
    const { depositId } = req.params;
    const { password, adminId = "admin" } = req.body;
    if (!password || !verifyAdminPassword2(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }
    if (deposit.status !== "pending") {
      return res.status(400).json({ error: "Deposit is not pending" });
    }
    const user = await storage.getUser(deposit.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const currentAvailable = parseFloat(user.availableBalance);
    const depositAmount = parseFloat(deposit.payableAmount || deposit.amount);
    const newAvailable = currentAvailable + depositAmount;
    await storage.updateUserBalance(
      deposit.userId,
      formatUsdtBalance(newAvailable),
      user.frozenBalance
    );
    await storage.confirmDeposit(depositId, adminId);
    await notifyDepositConfirmed(deposit.userId, depositAmount);
    res.json({
      success: true,
      message: "Deposit confirmed",
      newBalance: parseFloat(formatUsdtBalance(newAvailable))
    });
  } catch (error) {
    logger11.error("Error confirming deposit:", error);
    res.status(500).json({ error: "Failed to confirm deposit" });
  }
}
async function manualConfirmDeposit(req, res) {
  try {
    const { depositId } = req.params;
    const { password, actualAmount, txHash, adminId = "admin" } = req.body;
    if (!password || !verifyAdminPassword2(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!actualAmount || actualAmount <= 0) {
      return res.status(400).json({ error: "Invalid actual amount" });
    }
    if (!txHash || txHash.trim() === "") {
      return res.status(400).json({ error: "Transaction hash is required" });
    }
    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }
    if (deposit.status !== "expired" && deposit.status !== "cancelled") {
      return res.status(400).json({ error: "Manual confirmation is only allowed for expired or cancelled deposits" });
    }
    const user = await storage.getUser(deposit.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const currentAvailable = parseFloat(user.availableBalance);
    const actualAmountNum = parseFloat(actualAmount);
    const newAvailable = currentAvailable + actualAmountNum;
    await storage.updateUserBalance(
      deposit.userId,
      formatUsdtBalance(newAvailable),
      user.frozenBalance
    );
    await storage.manualConfirmDeposit(
      depositId,
      formatUsdtBalance(actualAmountNum),
      txHash.trim(),
      adminId
    );
    await notifyDepositConfirmed(deposit.userId, actualAmountNum);
    res.json({
      success: true,
      message: "Deposit manually confirmed",
      newBalance: parseFloat(formatUsdtBalance(newAvailable))
    });
  } catch (error) {
    logger11.error("Error manually confirming deposit:", error);
    res.status(500).json({ error: "Failed to manually confirm deposit" });
  }
}
async function rejectDeposit(req, res) {
  try {
    const { depositId } = req.params;
    const { password } = req.body;
    if (!password || !verifyAdminPassword2(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }
    if (deposit.status !== "pending") {
      return res.status(400).json({ error: "Deposit is not pending" });
    }
    await storage.rejectDeposit(depositId);
    await sendUserNotification(
      deposit.userId,
      "\u0414\u0435\u043F\u043E\u0437\u0438\u0442 \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D",
      "general"
    );
    res.json({
      success: true,
      message: "Deposit rejected"
    });
  } catch (error) {
    logger11.error("Error rejecting deposit:", error);
    res.status(500).json({ error: "Failed to reject deposit" });
  }
}
async function adminGetDepositDetails(req, res) {
  try {
    const { depositId } = req.params;
    const { password } = req.query;
    if (!password || !verifyAdminPassword2(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const deposit = await storage.getDeposit(depositId);
    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }
    const user = await storage.getUser(deposit.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const details = {
      id: deposit.id,
      userId: deposit.userId,
      username: user.username,
      fullName: user.fullName || null,
      avatarUrl: user.avatarUrl || null,
      status: deposit.status,
      requestedAmount: deposit.requestedAmount ? parseFloat(deposit.requestedAmount) : null,
      payableAmount: deposit.payableAmount ? parseFloat(deposit.payableAmount) : null,
      actualAmount: parseFloat(deposit.amount),
      txHash: deposit.txHash || null,
      createdAt: deposit.createdAt.toISOString(),
      confirmedAt: deposit.confirmedAt ? deposit.confirmedAt.toISOString() : null,
      expiresAt: deposit.expiresAt ? deposit.expiresAt.toISOString() : null,
      walletAddress: deposit.walletAddress || null
    };
    res.json(details);
  } catch (error) {
    logger11.error("Error getting deposit details:", error);
    res.status(500).json({ error: "Failed to get deposit details" });
  }
}

// server/controllers/operatorController.ts
var logger12 = createLogger2("operatorController");
async function operatorLogin(req, res) {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ message: "\u041B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
    }
    const operator = await storage.getOperatorByLogin(login);
    if (!operator) {
      return res.status(401).json({ message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
    }
    if (operator.isActive === 0) {
      return res.status(403).json({ message: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430 \u0434\u0435\u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D" });
    }
    const isPasswordValid = verifyPasswordWithSalt(password, operator.salt, operator.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
    }
    if (req.session) {
      req.session.operatorId = operator.id;
    }
    res.json({
      id: operator.id,
      login: operator.login,
      isOnline: operator.isOnline === 1,
      createdAt: operator.createdAt
    });
  } catch (error) {
    logger12.error("Operator login error:", error);
    res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0445\u043E\u0434\u0430" });
  }
}
async function operatorUpdateOnlineStatus(req, res) {
  try {
    const { operatorId } = req.params;
    const { isOnline } = req.body;
    if (isOnline === void 0) {
      return res.status(400).json({ message: "isOnline is required" });
    }
    const operator = await storage.getOperator(operatorId);
    if (!operator) {
      return res.status(404).json({ message: "Operator not found" });
    }
    if (operator.isActive === 0) {
      return res.status(403).json({ message: "Operator account is deactivated" });
    }
    await storage.setOperatorOnline(operatorId, isOnline);
    res.json({
      success: true,
      isOnline,
      message: isOnline ? "\u0412\u044B \u0432 \u0441\u0435\u0442\u0438" : "\u0412\u044B \u043E\u0444\u0444\u043B\u0430\u0439\u043D"
    });
  } catch (error) {
    logger12.error("Operator update online status error:", error);
    res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0442\u0443\u0441\u0430" });
  }
}
async function getPaymentRequestsForOperator(req, res) {
  try {
    const { operatorId } = req.params;
    const { status } = req.query;
    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D" });
    }
    let requests = await storage.getAllPaymentRequests();
    if (status === "active") {
      requests = requests.filter(
        (r) => (r.assignedOperatorId === operatorId || r.status === "submitted" && !r.assignedOperatorId) && ["submitted", "assigned", "processing"].includes(r.status)
      );
    } else if (status === "completed") {
      requests = requests.filter(
        (r) => r.assignedOperatorId === operatorId && ["paid", "rejected", "cancelled"].includes(r.status)
      );
    } else if (status && status !== "all") {
      requests = requests.filter(
        (r) => (r.assignedOperatorId === operatorId || r.status === "submitted" && !r.assignedOperatorId) && r.status === status
      );
    } else {
      requests = requests.filter(
        (r) => r.assignedOperatorId === operatorId || r.status === "submitted" && !r.assignedOperatorId
      );
    }
    const requestsWithUsernames = await Promise.all(
      requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return {
          ...request,
          username: user?.username || "Unknown"
        };
      })
    );
    res.json(requestsWithUsernames);
  } catch (error) {
    logger12.error("Get payment requests error:", error);
    res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0437\u0430\u044F\u0432\u043E\u043A" });
  }
}
async function operatorTakePayment(req, res) {
  try {
    const { operatorId, requestId } = req.params;
    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D" });
    }
    const success = await storage.assignPaymentRequestToOperator(requestId, operatorId);
    if (!success) {
      return res.status(400).json({ message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u0432\u0437\u044F\u0442\u0430 \u0434\u0440\u0443\u0433\u0438\u043C \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" });
    }
    logger12.info(`Operator ${operatorId} took payment request ${requestId}`);
    res.json({
      success: true,
      message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0432\u0437\u044F\u0442\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443",
      requestId
    });
  } catch (error) {
    logger12.error("Take payment error:", error);
    res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0432\u0437\u044F\u0442\u0438\u0438 \u0437\u0430\u044F\u0432\u043A\u0438" });
  }
}
async function operatorProcessPayment(req, res) {
  try {
    const { operatorId, requestId } = req.params;
    const { status, adminComment, receipt, amountRub } = req.body;
    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D" });
    }
    if (!["paid", "rejected", "processing"].includes(status)) {
      return res.status(400).json({ message: "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" });
    }
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    if (request.assignedOperatorId !== operatorId) {
      return res.status(403).json({ message: "\u042D\u0442\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0430 \u0432\u0430\u043C" });
    }
    const updates = { status };
    if (adminComment) updates.adminComment = adminComment;
    if (receipt) updates.receipt = receipt;
    if (amountRub) updates.amountRub = amountRub;
    await storage.updatePaymentRequestFull(requestId, updates);
    if (status === "paid" || status === "rejected") {
      const user = await storage.getUser(request.userId);
      if (user) {
        const requestAmount = parseFloat(request.amountUsdt);
        if (status === "paid") {
          const newFrozen = parseFloat(user.frozenBalance) - requestAmount;
          await storage.updateUserBalance(
            request.userId,
            user.availableBalance,
            newFrozen.toString()
          );
          await notifyPaymentPaid(request.userId, request.id, requestAmount);
        } else if (status === "rejected") {
          const newAvailable = parseFloat(user.availableBalance) + requestAmount;
          const newFrozen = parseFloat(user.frozenBalance) - requestAmount;
          await storage.updateUserBalance(
            request.userId,
            newAvailable.toString(),
            newFrozen.toString()
          );
          await notifyPaymentRejected(request.userId, request.id, adminComment || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430");
        }
      }
    }
    res.json({ message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" });
  } catch (error) {
    logger12.error("Process payment error:", error);
    res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0437\u0430\u044F\u0432\u043A\u0438" });
  }
}
async function getPaymentRequestForOperator(req, res) {
  try {
    const { operatorId, id } = req.params;
    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D" });
    }
    const request = await storage.getPaymentRequest(id);
    if (!request) {
      return res.status(404).json({ message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    if (request.assignedOperatorId !== operatorId) {
      return res.status(403).json({ message: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D. \u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u043F\u0440\u043E\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0432\u043E\u0438 \u0437\u0430\u044F\u0432\u043A\u0438." });
    }
    const user = await storage.getUser(request.userId);
    let assignedOperatorLogin = null;
    if (request.assignedOperatorId) {
      const assignedOperator = await storage.getOperator(request.assignedOperatorId);
      assignedOperatorLogin = assignedOperator?.login || null;
    }
    let processingTimeMinutes = null;
    if (request.assignedAt && request.completedAt) {
      const diffMs = request.completedAt.getTime() - request.assignedAt.getTime();
      processingTimeMinutes = Math.round(diffMs / 6e4);
    }
    res.json({
      id: request.id,
      userId: request.userId,
      telegramId: user?.telegramId || null,
      username: user?.username || "Unknown",
      fullName: user?.fullName || null,
      avatarUrl: user?.avatarUrl || null,
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments || [],
      comment: request.comment || "",
      status: request.status,
      receipt: request.receipt || null,
      adminComment: request.adminComment || "",
      assignedOperatorId: request.assignedOperatorId || null,
      assignedOperatorLogin,
      assignedAt: request.assignedAt?.toISOString() || null,
      completedAt: request.completedAt?.toISOString() || null,
      processingTimeMinutes,
      createdAt: request.createdAt.toISOString()
    });
  } catch (error) {
    logger12.error("Get payment request for operator error:", error);
    res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0437\u0430\u044F\u0432\u043A\u0438" });
  }
}
async function getOperatorStatistics(req, res) {
  try {
    const { operatorId } = req.params;
    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D" });
    }
    const statistics = await storage.getOperatorStatistics(operatorId);
    res.json(statistics);
  } catch (error) {
    logger12.error("Get operator statistics error:", error);
    res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438" });
  }
}

// server/controllers/referralController.ts
var logger13 = createLogger2("referralController");
async function activatePromoCode(req, res) {
  try {
    const { userId, promoCode } = req.body;
    if (!userId || !promoCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.referrerId) {
      return res.status(400).json({ error: "You have already activated a promo code" });
    }
    const referrer = await storage.getUserByPromoCode(promoCode);
    if (!referrer) {
      return res.status(404).json({ error: "\u0422\u0430\u043A\u043E\u0433\u043E \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0430 \u043D\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442" });
    }
    if (referrer.id === userId) {
      return res.status(400).json({ error: "\u041D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434" });
    }
    const userDeposits = await storage.getDepositsByUserId(userId);
    const hasDeposits = userDeposits.some((d) => d.status === "confirmed");
    if (hasDeposits) {
      return res.status(400).json({ error: "\u041E\u0439, \u0430 \u0412\u044B \u0443\u0436\u0435 \u0434\u0435\u043B\u0430\u043B\u0438 \u0434\u0435\u043F\u043E\u0437\u0438\u0442 \u0438 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442\u0435 \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u{1F62D}" });
    }
    const signupBonusAmount = "5.00000000";
    const expiresAt = new Date(user.registeredAt);
    expiresAt.setDate(expiresAt.getDate() + 15);
    await storage.activateReferralBonus(userId, referrer.id, signupBonusAmount, expiresAt);
    await sendUserNotification(
      userId,
      `\u{1F389} \u041F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0431\u043E\u043D\u0443\u0441 5 USDT \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D! \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u0435\u043D \u0434\u043E ${expiresAt.toLocaleDateString("ru-RU")}`,
      "general",
      {
        bonusAmount: signupBonusAmount,
        expiresAt: expiresAt.toISOString()
      }
    );
    await sendUserNotification(
      referrer.id,
      `\u{1F381} \u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u0444\u0435\u0440\u0430\u043B! \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${user.username} \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434`,
      "general",
      {
        referralId: userId,
        referralUsername: user.username
      }
    );
    res.json({
      success: true,
      signupBonusAmount: parseFloat(signupBonusAmount),
      signupBonusExpiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    logger13.error("Error activating promo code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getReferralStats(req, res) {
  try {
    const { userId } = req.params;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const referralsCount = await storage.getReferralsCount(userId);
    res.json({
      promoCode: user.promoCode || null,
      referrerId: user.referrerId || null,
      referralsCount,
      referralBalance: parseFloat(user.referralBalance),
      referralTotalEarned: parseFloat(user.referralTotalEarned),
      referralTotalWithdrawn: parseFloat(user.referralTotalWithdrawn)
    });
  } catch (error) {
    logger13.error("Error getting referral stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function withdrawReferralBalance(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
      `\u{1F4B0} \u0412\u044B\u0432\u043E\u0434 \u0440\u0435\u0444\u0435\u0440\u0430\u043B\u044C\u043D\u044B\u0445 \u0441\u0440\u0435\u0434\u0441\u0442\u0432: ${referralBalance.toFixed(2)} USDT \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0435\u043D\u043E \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0431\u0430\u043B\u0430\u043D\u0441`,
      "general",
      {
        withdrawnAmount: referralBalance.toFixed(8)
      }
    );
    res.json({
      success: true,
      withdrawnAmount: referralBalance,
      newAvailableBalance: parseFloat(user.availableBalance) + referralBalance,
      newReferralBalance: 0
    });
  } catch (error) {
    logger13.error("Error withdrawing referral balance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/telegram/operatorBot.ts
import TelegramBot2 from "node-telegram-bot-api";
var logger14 = createLogger2("operatorBot");
var operatorBot2 = null;
var loginSessions = /* @__PURE__ */ new Map();
function initializeOperatorBot(token) {
  if (operatorBot2) {
    return operatorBot2;
  }
  operatorBot2 = new TelegramBot2(token, { polling: false });
  operatorBot2.setMyCommands([
    { command: "start", description: "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430" },
    { command: "online", description: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043E\u043D\u043B\u0430\u0439\u043D" },
    { command: "offline", description: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043E\u0444\u043B\u0430\u0439\u043D" },
    { command: "status", description: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441" }
  ]);
  logger14.info("Operator bot initialized successfully");
  return operatorBot2;
}
function getOperatorBot() {
  if (!operatorBot2) {
    throw new Error("Operator bot not initialized. Call initializeOperatorBot first.");
  }
  return operatorBot2;
}
async function handleOperatorStart(chatId, bot2) {
  loginSessions.set(chatId, { stage: "login" });
  await bot2.sendMessage(
    chatId,
    "\u{1F44B} <b>\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 \u043F\u0430\u043D\u0435\u043B\u044C \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430!</b>\n\n\u0414\u043B\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 \u043B\u043E\u0433\u0438\u043D:",
    { parse_mode: "HTML" }
  );
}
async function handleOperatorMessage(chatId, text2, bot2) {
  const session2 = loginSessions.get(chatId);
  if (!session2) {
    await bot2.sendMessage(
      chatId,
      "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /start \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
      { parse_mode: "HTML" }
    );
    return;
  }
  if (session2.stage === "login") {
    loginSessions.set(chatId, { stage: "password", login: text2 });
    await bot2.sendMessage(
      chatId,
      "\u{1F510} \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C:",
      { parse_mode: "HTML" }
    );
  } else if (session2.stage === "password") {
    await handleLogin(chatId, session2.login, text2, bot2);
    loginSessions.delete(chatId);
  }
}
async function handleLogin(chatId, login, password, bot2) {
  try {
    const operator = await storage.getOperatorByLogin(login);
    if (!operator) {
      await bot2.sendMessage(
        chatId,
        "\u274C \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C.\n\n\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /start \u0434\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0439 \u043F\u043E\u043F\u044B\u0442\u043A\u0438",
        { parse_mode: "HTML" }
      );
      return;
    }
    if (operator.isActive !== 1) {
      await bot2.sendMessage(
        chatId,
        "\u274C \u0412\u0430\u0448 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0434\u0435\u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D. \u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443.",
        { parse_mode: "HTML" }
      );
      return;
    }
    const passwordHash = hashPasswordWithSalt(password, operator.salt);
    if (passwordHash !== operator.passwordHash) {
      await bot2.sendMessage(
        chatId,
        "\u274C \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C.\n\n\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /start \u0434\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0439 \u043F\u043E\u043F\u044B\u0442\u043A\u0438",
        { parse_mode: "HTML" }
      );
      return;
    }
    await storage.setOperatorChatId(operator.id, chatId);
    const keyboard = {
      inline_keyboard: [
        [
          { text: "\u{1F7E2} \u041E\u043D\u043B\u0430\u0439\u043D", callback_data: "status_online" },
          { text: "\u{1F534} \u041E\u0444\u043B\u0430\u0439\u043D", callback_data: "status_offline" }
        ]
      ]
    };
    await bot2.sendMessage(
      chatId,
      `\u2705 <b>\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u0443\u0441\u043F\u0435\u0448\u043D\u0430!</b>

\u{1F464} \u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440: ${operator.login}
\u{1F4CA} \u0421\u0442\u0430\u0442\u0443\u0441: ${operator.isOnline ? "\u{1F7E2} \u041E\u043D\u043B\u0430\u0439\u043D" : "\u{1F534} \u041E\u0444\u043B\u0430\u0439\u043D"}

\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u0441\u0442\u0430\u0442\u0443\u0441:`,
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  } catch (error) {
    logger14.error("Error in handleLogin", error);
    await bot2.sendMessage(
      chatId,
      "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.",
      { parse_mode: "HTML" }
    );
  }
}
async function handleOperatorOnline(chatId, bot2) {
  try {
    const operators2 = await storage.getAllOperators();
    const operator = operators2.find((op) => op.chatId === chatId);
    if (!operator) {
      await bot2.sendMessage(
        chatId,
        "\u274C \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /start \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
        { parse_mode: "HTML" }
      );
      return;
    }
    await setOperatorOnline(operator.id, true);
    await bot2.sendMessage(
      chatId,
      "\u{1F7E2} <b>\u0412\u044B \u0432 \u0441\u0435\u0442\u0438!</b>\n\n\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u043D\u043E\u0432\u044B\u0445 \u0437\u0430\u044F\u0432\u043A\u0430\u0445.",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    logger14.error("Error in handleOnline", error);
    await bot2.sendMessage(
      chatId,
      "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430",
      { parse_mode: "HTML" }
    );
  }
}
async function handleOperatorOffline(chatId, bot2) {
  try {
    const operators2 = await storage.getAllOperators();
    const operator = operators2.find((op) => op.chatId === chatId);
    if (!operator) {
      await bot2.sendMessage(
        chatId,
        "\u274C \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /start \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
        { parse_mode: "HTML" }
      );
      return;
    }
    await setOperatorOnline(operator.id, false);
    await bot2.sendMessage(
      chatId,
      "\u{1F534} <b>\u0412\u044B \u043E\u0444\u0444\u043B\u0430\u0439\u043D</b>\n\n\u0412\u044B \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u043D\u043E\u0432\u044B\u0445 \u0437\u0430\u044F\u0432\u043A\u0430\u0445.",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    logger14.error("Error in handleOffline", error);
    await bot2.sendMessage(
      chatId,
      "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430",
      { parse_mode: "HTML" }
    );
  }
}
async function handleOperatorStatus(chatId, bot2) {
  try {
    const operators2 = await storage.getAllOperators();
    const operator = operators2.find((op) => op.chatId === chatId);
    if (!operator) {
      await bot2.sendMessage(
        chatId,
        "\u274C \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /start \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
        { parse_mode: "HTML" }
      );
      return;
    }
    const statusEmoji = operator.isOnline ? "\u{1F7E2}" : "\u{1F534}";
    const statusText = operator.isOnline ? "\u041E\u043D\u043B\u0430\u0439\u043D" : "\u041E\u0444\u043B\u0430\u0439\u043D";
    const keyboard = {
      inline_keyboard: [
        [
          { text: "\u{1F7E2} \u041E\u043D\u043B\u0430\u0439\u043D", callback_data: "status_online" },
          { text: "\u{1F534} \u041E\u0444\u043B\u0430\u0439\u043D", callback_data: "status_offline" }
        ]
      ]
    };
    await bot2.sendMessage(
      chatId,
      `\u{1F4CA} <b>\u0421\u0442\u0430\u0442\u0443\u0441 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430</b>

\u{1F464} \u041B\u043E\u0433\u0438\u043D: ${operator.login}
${statusEmoji} \u0421\u0442\u0430\u0442\u0443\u0441: ${statusText}
\u23F0 \u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C: ${operator.lastActivityAt ? new Date(operator.lastActivityAt).toLocaleString("ru-RU") : "N/A"}

\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441:`,
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  } catch (error) {
    logger14.error("Error in handleStatus", error);
    await bot2.sendMessage(
      chatId,
      "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430",
      { parse_mode: "HTML" }
    );
  }
}
async function handleOperatorCallback(chatId, data, messageId, bot2) {
  try {
    if (data === "status_online" || data === "status_offline") {
      await handleStatusChange(chatId, data === "status_online", messageId, bot2);
    } else if (data.startsWith("take_")) {
      const requestId = data.substring(5);
      await handleTakeTask(chatId, requestId, messageId, bot2);
    } else if (data.startsWith("reject_")) {
      const requestId = data.substring(7);
      await handleRejectTask(chatId, requestId, messageId, bot2);
    }
  } catch (error) {
    logger14.error("Error in handleCallback", error);
  }
}
async function handleStatusChange(chatId, isOnline, messageId, bot2) {
  try {
    const operators2 = await storage.getAllOperators();
    const operator = operators2.find((op) => op.chatId === chatId);
    if (!operator) {
      await bot2.sendMessage(chatId, "\u274C \u041E\u0448\u0438\u0431\u043A\u0430: \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
      return;
    }
    await setOperatorOnline(operator.id, isOnline);
    const statusEmoji = isOnline ? "\u{1F7E2}" : "\u{1F534}";
    const statusText = isOnline ? "\u041E\u043D\u043B\u0430\u0439\u043D" : "\u041E\u0444\u043B\u0430\u0439\u043D";
    await bot2.editMessageText(
      `${statusEmoji} <b>\u0421\u0442\u0430\u0442\u0443\u0441 \u0438\u0437\u043C\u0435\u043D\u0435\u043D: ${statusText}</b>

${isOnline ? "\u0412\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u043D\u043E\u0432\u044B\u0445 \u0437\u0430\u044F\u0432\u043A\u0430\u0445." : "\u0412\u044B \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F."}`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML"
      }
    );
  } catch (error) {
    logger14.error("Error in handleStatusChange", error);
  }
}
async function handleTakeTask(chatId, requestId, messageId, bot2) {
  try {
    const operators2 = await storage.getAllOperators();
    const operator = operators2.find((op) => op.chatId === chatId);
    if (!operator) {
      await bot2.sendMessage(chatId, "\u274C \u041E\u0448\u0438\u0431\u043A\u0430: \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
      return;
    }
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      await bot2.editMessageText(
        "\u274C \u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430",
        { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
      );
      return;
    }
    if (request.assignedOperatorId) {
      await bot2.editMessageText(
        `\u2139\uFE0F \u0417\u0430\u044F\u0432\u043A\u0430 \u2116${requestId.slice(-6)} \u0443\u0436\u0435 \u0432\u0437\u044F\u0442\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443 \u0434\u0440\u0443\u0433\u0438\u043C \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C`,
        { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
      );
      return;
    }
    if (request.status !== "submitted") {
      await bot2.editMessageText(
        `\u2139\uFE0F \u0417\u0430\u044F\u0432\u043A\u0430 \u2116${requestId.slice(-6)} \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430 (\u0441\u0442\u0430\u0442\u0443\u0441: ${request.status})`,
        { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
      );
      return;
    }
    await assignTaskToOperator(requestId, operator.id);
    await storage.updatePaymentRequestStatus(requestId, "assigned");
    const user = await storage.getUser(request.userId);
    const amountRub = parseFloat(request.amountRub);
    const amountUsdt = parseFloat(request.amountUsdt);
    await bot2.editMessageText(
      `\u2705 <b>\u0417\u0430\u044F\u0432\u043A\u0430 \u0432\u0437\u044F\u0442\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443!</b>

\u{1F194} ID: ${requestId.slice(-6)}
\u{1F464} \u041A\u043B\u0438\u0435\u043D\u0442: ${user?.username || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E"}
\u{1F4B5} \u0421\u0443\u043C\u043C\u0430: ${amountRub.toLocaleString("ru-RU")} \u20BD
\u{1F48E} USDT: ${formatUsdtBalance(amountUsdt).slice(0, -6)} USDT

\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0432\u0435\u0431-\u043F\u0430\u043D\u0435\u043B\u044C \u0434\u043B\u044F \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0437\u0430\u044F\u0432\u043A\u0438.`,
      { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
    );
    const onlineOperators = await storage.getOnlineOperators();
    const otherOperatorChatIds = onlineOperators.filter((op) => op.id !== operator.id && op.chatId).map((op) => op.chatId);
    await notifyOperatorTaskTaken(otherOperatorChatIds, requestId);
    if (user) {
      await sendNotificationToUser(
        user.telegramId,
        `\u23F3 <b>\u0417\u0430\u044F\u0432\u043A\u0430 \u0432 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435</b>

\u0412\u0430\u0448\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u2116${requestId.slice(-6)} \u0432\u0437\u044F\u0442\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C.
\u041E\u0436\u0438\u0434\u0430\u0439\u0442\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438.`
      );
    }
    await storage.createNotification({
      userId: request.userId,
      requestId: request.id,
      message: `\u0417\u0430\u044F\u0432\u043A\u0430 \u2116${requestId.slice(-6)} \u0432\u0437\u044F\u0442\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C`,
      isRead: 0
    });
  } catch (error) {
    logger14.error("Error in handleTakeTask", error);
    await bot2.sendMessage(chatId, "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0432\u0437\u044F\u0442\u0438\u0438 \u0437\u0430\u044F\u0432\u043A\u0438 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443");
  }
}
async function handleRejectTask(chatId, requestId, messageId, bot2) {
  try {
    const operators2 = await storage.getAllOperators();
    const operator = operators2.find((op) => op.chatId === chatId);
    if (!operator) {
      await bot2.sendMessage(chatId, "\u274C \u041E\u0448\u0438\u0431\u043A\u0430: \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
      return;
    }
    await bot2.editMessageText(
      `\u274C \u0417\u0430\u044F\u0432\u043A\u0430 \u2116${requestId.slice(-6)} \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430

\u041E\u043D\u0430 \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0434\u043B\u044F \u0434\u0440\u0443\u0433\u0438\u0445 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u0432.`,
      { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
    );
  } catch (error) {
    logger14.error("Error in handleRejectTask", error);
  }
}

// server/telegram/webhooks.ts
var logger15 = createLogger2("webhooks");
async function handleWebhook(req, res) {
  try {
    const update = req.body;
    const bot2 = getBot();
    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id.toString();
      const telegramId = update.message.from?.id?.toString();
      if (telegramId) {
        try {
          const user = await storage.getUserByTelegramId(telegramId);
          if (user && user.chatId !== chatId) {
            await storage.updateUserChatId(user.id, chatId);
            logger15.info(`Updated chatId for user ${user.id} (Telegram ID: ${telegramId})`);
          }
        } catch (error) {
          logger15.error("Error updating user chatId:", error);
        }
      }
      const webAppUrl = process.env.WEBAPP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");
      if (!webAppUrl) {
        logger15.error("[Webhook] CRITICAL: WebApp URL is not configured. Set WEBAPP_URL or REPLIT_DOMAINS environment variable.");
        await bot2.sendMessage(chatId, "\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 Romax Pay! \u{1F4B0}\n\n\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        return res.json({ ok: false, reason: "webapp_url_missing" });
      }
      await bot2.sendMessage(chatId, "\u0420\u0430\u0434\u044B \u0432\u0438\u0434\u0435\u0442\u044C \u0432\u0430\u0441 \u0432 Romax Pay! \u{1F4B0}\n\n\u041F\u043B\u0430\u0442\u0438\u0442\u0435 \u043A\u0440\u0438\u043F\u0442\u043E\u0439 \u0437\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0438 \u0432 \u0440\u0443\u0431\u043B\u044F\u0445 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E.", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435",
                web_app: { url: webAppUrl }
              }
            ]
          ]
        }
      });
    }
    if (update.callback_query) {
      await bot2.answerCallbackQuery(update.callback_query.id);
    }
    res.json({ ok: true });
  } catch (error) {
    logger15.error("Error handling webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function verifyWebhook(_req, res) {
  try {
    const bot2 = getBot();
    const info = await bot2.getWebHookInfo();
    res.json({
      url: info.url,
      hasCustomCertificate: info.has_custom_certificate,
      pendingUpdateCount: info.pending_update_count,
      lastErrorDate: info.last_error_date,
      lastErrorMessage: info.last_error_message
    });
  } catch (error) {
    logger15.error("Error getting webhook info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function handleOperatorWebhook(req, res) {
  try {
    const update = req.body;
    const bot2 = getOperatorBot();
    if (update.message) {
      const chatId = update.message.chat.id.toString();
      const text2 = update.message.text || "";
      if (text2.startsWith("/start")) {
        await handleOperatorStart(chatId, bot2);
      } else if (text2.startsWith("/online")) {
        await handleOperatorOnline(chatId, bot2);
      } else if (text2.startsWith("/offline")) {
        await handleOperatorOffline(chatId, bot2);
      } else if (text2.startsWith("/status")) {
        await handleOperatorStatus(chatId, bot2);
      } else {
        await handleOperatorMessage(chatId, text2, bot2);
      }
    }
    if (update.callback_query) {
      const chatId = update.callback_query.message?.chat.id.toString();
      const data = update.callback_query.data || "";
      const messageId = update.callback_query.message?.message_id;
      if (chatId && messageId) {
        await handleOperatorCallback(chatId, data, messageId, bot2);
      }
      await bot2.answerCallbackQuery(update.callback_query.id);
    }
    res.json({ ok: true });
  } catch (error) {
    logger15.error("Error handling operator webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function verifyOperatorWebhook(_req, res) {
  try {
    const bot2 = getOperatorBot();
    const info = await bot2.getWebHookInfo();
    res.json({
      url: info.url,
      hasCustomCertificate: info.has_custom_certificate,
      pendingUpdateCount: info.pending_update_count,
      lastErrorDate: info.last_error_date,
      lastErrorMessage: info.last_error_message
    });
  } catch (error) {
    logger15.error("Error getting operator webhook info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/middleware/operatorAuth.ts
function requireOperatorAuth(req, res, next) {
  if (!req.session || !req.session.operatorId) {
    return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430" });
  }
  next();
}

// server/services/exchangeRate.ts
var logger16 = createLogger2("exchangeRate");
var cachedRate = null;
var updateInterval = null;
var EXCHANGE_API_URL = "https://open.er-api.com/v6/latest/USD";
var UPDATE_INTERVAL_MS = 30 * 60 * 1e3;
var MIN_VALID_RATE = 70;
var MAX_VALID_RATE = 120;
function isValidRate(rate) {
  return rate >= MIN_VALID_RATE && rate <= MAX_VALID_RATE && !isNaN(rate) && isFinite(rate);
}
async function fetchUsdRubRate() {
  try {
    const response = await fetch(EXCHANGE_API_URL);
    if (!response.ok) {
      throw new Error(`ExchangeRate API returned status ${response.status}`);
    }
    const data = await response.json();
    if (data.result !== "success") {
      throw new Error("ExchangeRate API returned unsuccessful result");
    }
    const rawRate = data.rates.RUB;
    const adjustedRate = rawRate * 0.995;
    const rate = Math.round(adjustedRate * 100) / 100;
    if (!rate || !isValidRate(rate)) {
      throw new Error(`Invalid rate: ${rate} (expected ${MIN_VALID_RATE}-${MAX_VALID_RATE})`);
    }
    logger16.info(`\u2713 Successfully fetched rate: ${rawRate.toFixed(2)} RUB/USD, adjusted: ${rate.toFixed(2)} RUB/USD (-0.5%)`);
    return {
      rate,
      source: "\u0411\u0438\u0440\u0436\u0435\u0432\u043E\u0439 \u043A\u0443\u0440\u0441 (\u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0435 30 \u043C\u0438\u043D\u0443\u0442)"
    };
  } catch (error) {
    logger16.error("Failed to fetch exchange rate", error);
    throw error;
  }
}
async function updateExchangeRate() {
  try {
    const { rate, source } = await fetchUsdRubRate();
    cachedRate = {
      rate,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      source
    };
  } catch (error) {
    logger16.error("Error updating exchange rate", error);
    if (!cachedRate) {
      logger16.warn("Using fallback rate as initial cache is empty");
      cachedRate = {
        rate: 95,
        // Reasonable fallback
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        source: "\u0420\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0439 \u043A\u0443\u0440\u0441 (API \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B)"
      };
    } else {
      logger16.info(`Using last known rate: ${cachedRate.rate.toFixed(2)} RUB/USD from ${cachedRate.timestamp}`);
    }
  }
}
async function startExchangeRateService() {
  logger16.info("Starting exchange rate service...");
  await updateExchangeRate();
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  updateInterval = setInterval(async () => {
    await updateExchangeRate();
  }, UPDATE_INTERVAL_MS);
  const intervalMinutes = UPDATE_INTERVAL_MS / (60 * 1e3);
  const requestsPerDay = Math.floor(24 * 60 / intervalMinutes);
  const requestsPerMonth = requestsPerDay * 30;
  logger16.info(`Exchange rate service started. Updates every ${intervalMinutes} minutes.`);
  logger16.info(`Estimated usage: ${requestsPerDay} requests/day, ${requestsPerMonth} requests/month (limit: 1500).`);
}
function stopExchangeRateService() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    logger16.info("Exchange rate service stopped.");
  }
}
function getCurrentExchangeRate() {
  if (!cachedRate) {
    return {
      rate: 95,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      source: "\u0411\u0438\u0440\u0436\u0435\u0432\u043E\u0439 \u043A\u0443\u0440\u0441 (\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430...)"
    };
  }
  return cachedRate;
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.set("trust proxy", 1);
  app2.use(helmet({
    contentSecurityPolicy: false
    // Allow Telegram WebApp
  }));
  app2.use(cors({
    origin: process.env.NODE_ENV === "production" ? ["https://telegram.org", process.env.REPLIT_DOMAINS || ""] : "*",
    credentials: true
  }));
  app2.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  }));
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: process.env.NODE_ENV === "production" ? 100 : 1e3,
    // Higher limit in development for polling
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.use("/api/", limiter);
  app2.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.get("/test-logging", (_req, res) => {
    console.log("[TEST] This is a test log message");
    res.json({ message: "test logging endpoint" });
  });
  app2.post("/api/user/auth", authenticateUser);
  app2.get("/api/user/:userId/balance", getUserBalance);
  app2.get("/api/payments/user/:userId", getUserPaymentRequests);
  app2.get("/api/payments/:requestId", getPaymentRequest);
  app2.post("/api/payments/create", createPaymentRequest);
  app2.patch("/api/payments/:requestId/status", updatePaymentRequestStatus);
  app2.get("/api/notifications/user/:userId", getUserNotifications);
  app2.get("/api/notifications/user/:userId/unread-count", getUnreadNotificationsCount);
  app2.patch("/api/notifications/:notificationId/read", markNotificationAsRead);
  app2.post("/api/deposits/create-automated", createAutomatedDeposit);
  app2.post("/api/deposits/create", createDeposit);
  app2.get("/api/deposits/user/:userId", getUserDeposits);
  app2.post("/api/deposits/:id/cancel", cancelDeposit);
  app2.post("/api/referral/activate", activatePromoCode);
  app2.get("/api/referral/stats/:userId", getReferralStats);
  app2.post("/api/referral/withdraw", withdrawReferralBalance);
  app2.get("/api/exchange-rate", (_req, res) => {
    const exchangeRateData = getCurrentExchangeRate();
    res.json(exchangeRateData);
  });
  app2.post("/api/admin/login", adminLogin);
  app2.get("/api/admin/users", getAllUsers);
  app2.get("/api/admin/users/:userId/stats", adminGetUserStats);
  app2.get("/api/admin/payments", getAllPaymentRequests);
  app2.get("/api/admin/payments/:id", getPaymentRequestForAdmin);
  app2.post("/api/admin/user/:userId/balance", updateUserBalance);
  app2.post("/api/admin/user/:userId/deposit", addUserDeposit);
  app2.post("/api/admin/payment/:requestId/approve", approvePaymentRequest);
  app2.post("/api/admin/payment/:requestId/cancel", cancelPaymentRequest);
  app2.patch("/api/admin/payments/:id/process", processPaymentRequest);
  app2.get("/api/admin/deposits/pending", getPendingDeposits);
  app2.get("/api/admin/deposits/all", getAllDeposits);
  app2.get("/api/admin/deposits/:depositId/details", adminGetDepositDetails);
  app2.post("/api/admin/deposits/:depositId/confirm", confirmDeposit);
  app2.post("/api/admin/deposits/:depositId/manual-confirm", manualConfirmDeposit);
  app2.post("/api/admin/deposits/:depositId/reject", rejectDeposit);
  app2.get("/api/admin/operators", getAllOperators);
  app2.post("/api/admin/operators", createOperator);
  app2.patch("/api/admin/operators/:id/status", updateOperatorStatus);
  app2.patch("/api/admin/operators/:id/online-status", updateOperatorOnlineStatus);
  app2.patch("/api/admin/operators/:id/credentials", updateOperatorCredentials);
  app2.get("/api/admin/operators/:id/statistics", getOperatorStatisticsForAdmin);
  app2.delete("/api/admin/operators/:id", deleteOperator);
  app2.post("/api/operator/login", operatorLogin);
  app2.get("/api/operator/:operatorId/payments", requireOperatorAuth, getPaymentRequestsForOperator);
  app2.get("/api/operator/:operatorId/payments/:id", requireOperatorAuth, getPaymentRequestForOperator);
  app2.post("/api/operator/:operatorId/payments/:requestId/take", requireOperatorAuth, operatorTakePayment);
  app2.patch("/api/operator/:operatorId/payments/:requestId/process", requireOperatorAuth, operatorProcessPayment);
  app2.patch("/api/operator/:operatorId/online-status", requireOperatorAuth, operatorUpdateOnlineStatus);
  app2.get("/api/operator/:operatorId/statistics", requireOperatorAuth, getOperatorStatistics);
  app2.post("/telegram/webhook", handleWebhook);
  app2.get("/telegram/webhook", verifyWebhook);
  app2.post("/telegram/operator-webhook", handleOperatorWebhook);
  app2.get("/telegram/operator-webhook", verifyOperatorWebhook);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/services/depositExpiration.ts
var logger17 = createLogger2("depositExpiration");
var expirationInterval = null;
var isRunning = false;
var EXPIRATION_CHECK_INTERVAL_MS = 30 * 1e3;
async function checkAndExpireDeposits() {
  if (isRunning) {
    logger17.warn("Previous expiration check still running, skipping this interval");
    return 0;
  }
  isRunning = true;
  try {
    const expiredCount = await storage.expireOldDeposits();
    if (expiredCount > 0) {
      logger17.info(`\u2713 Expired ${expiredCount} deposit(s)`);
    }
    return expiredCount;
  } catch (error) {
    logger17.error("Error expiring deposits", error);
    return 0;
  } finally {
    isRunning = false;
  }
}
async function startDepositExpirationService() {
  logger17.info("Starting deposit expiration service...");
  await checkAndExpireDeposits();
  if (expirationInterval) {
    clearInterval(expirationInterval);
  }
  expirationInterval = setInterval(async () => {
    await checkAndExpireDeposits();
  }, EXPIRATION_CHECK_INTERVAL_MS);
  const intervalSeconds = EXPIRATION_CHECK_INTERVAL_MS / 1e3;
  logger17.info(`Deposit expiration service started. Checks every ${intervalSeconds} seconds.`);
}
function stopDepositExpirationService() {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
    logger17.info("Deposit expiration service stopped.");
  }
}

// server/services/blockchainScanner.ts
var logger18 = createLogger2("blockchain");
var SCAN_INTERVAL_MS = 15 * 1e3;
var SCAN_WINDOW_MS = 2 * 60 * 1e3;
var MAX_EVENTS_PER_REQUEST = 200;
var scanInterval = null;
var isScanning = false;
var tronWeb;
var failedDeposits = [];
async function processTransferEvent(event) {
  try {
    const { transaction_id: txHash, result, block_timestamp } = event;
    if (!result || !result.to || !result.from || result.value === void 0) {
      return { success: true };
    }
    const toAddress = tronWeb.address.fromHex(result.to);
    const fromAddress = tronWeb.address.fromHex(result.from);
    const amount = convertFromSun(result.value);
    if (toAddress !== getMasterWalletAddress()) {
      return { success: true };
    }
    const existingDeposit = await storage.getDepositByTxHash(txHash);
    if (existingDeposit) {
      return { success: true };
    }
    const matchingDeposit = await storage.findPendingDepositByPayableAmount(amount);
    if (!matchingDeposit) {
      logger18.warn(`\u26A0\uFE0F No matching deposit for transfer: ${amount} USDT from ${fromAddress} (tx: ${txHash})`);
      return { success: true };
    }
    const success = await storage.confirmDepositWithTransaction(
      matchingDeposit.id,
      txHash,
      amount
    );
    if (success) {
      logger18.info(`\u2713 Confirmed deposit ${matchingDeposit.id}: ${amount} USDT for user ${matchingDeposit.userId} (tx: ${txHash})`);
      return { success: true };
    } else {
      const error = `Failed to confirm deposit ${matchingDeposit.id} with tx ${txHash}`;
      logger18.error(`\u274C ${error}`);
      failedDeposits.push({
        depositId: matchingDeposit.id,
        txHash,
        amount,
        error: "Database transaction failed",
        timestamp: /* @__PURE__ */ new Date()
      });
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger18.error("\u274C Error processing transfer event", error);
    return { success: false, error: errorMsg };
  }
}
async function fetchEventsWithBlockRange(minTimestamp, maxTimestamp) {
  const allEvents = [];
  let fingerprint = null;
  let iterationCount = 0;
  const maxIterations = 50;
  try {
    do {
      const options = {
        only_confirmed: true,
        event_name: "Transfer",
        min_block_timestamp: minTimestamp,
        max_block_timestamp: maxTimestamp,
        order_by: "block_timestamp,asc",
        limit: MAX_EVENTS_PER_REQUEST
      };
      if (fingerprint) {
        options.fingerprint = fingerprint;
      }
      const response = await tronWeb.event.getEventsByContractAddress(
        getUsdtContractAddress(),
        options
      );
      if (!response.success || !response.data || response.data.length === 0) {
        break;
      }
      const relevantEvents = response.data.filter((event) => {
        if (!event.result || !event.result.to) {
          return false;
        }
        try {
          const toAddress = tronWeb.address.fromHex(event.result.to);
          return toAddress === getMasterWalletAddress();
        } catch {
          return false;
        }
      });
      allEvents.push(...relevantEvents);
      const lastEvent = response.data[response.data.length - 1];
      fingerprint = lastEvent._fingerprint || null;
      if (!fingerprint) {
        break;
      }
      iterationCount++;
      if (iterationCount >= maxIterations) {
        logger18.warn(`\u26A0\uFE0F Reached max iterations (${maxIterations}) while fetching events`);
        break;
      }
    } while (fingerprint);
    return allEvents;
  } catch (error) {
    logger18.error("Error fetching events with block range", error);
    throw error;
  }
}
async function scanBlockchain() {
  if (isScanning) {
    logger18.warn("Previous blockchain scan still running, skipping this interval");
    return;
  }
  isScanning = true;
  try {
    const currentBlock = await tronWeb.trx.getCurrentBlock();
    const currentBlockNumber = currentBlock.block_header?.raw_data?.number || 0;
    const currentBlockTimestamp = currentBlock.block_header?.raw_data?.timestamp || Date.now();
    let scanState = await storage.getTronScanState();
    if (!scanState) {
      const initialTimestamp = currentBlockTimestamp - SCAN_WINDOW_MS;
      scanState = await storage.createTronScanState({
        lastProcessedBlockNumber: (currentBlockNumber - 40).toString()
      });
      await storage.updateTronScanStateWithTimestamp(
        currentBlockNumber - 40,
        new Date(initialTimestamp)
      );
      scanState = await storage.getTronScanState();
      if (!scanState) {
        throw new Error("Failed to create scan state");
      }
    }
    const lastProcessedTimestamp = scanState.lastProcessedTimestamp?.getTime() || currentBlockTimestamp - SCAN_WINDOW_MS;
    const minTimestamp = lastProcessedTimestamp;
    const maxTimestamp = currentBlockTimestamp;
    if (maxTimestamp <= minTimestamp) {
      return;
    }
    logger18.info(`Scanning blocks from timestamp ${minTimestamp} to ${maxTimestamp}...`);
    const events = await fetchEventsWithBlockRange(minTimestamp, maxTimestamp);
    logger18.info(`Found ${events.length} USDT transfer(s) to master wallet in scan window`);
    let allSuccessful = true;
    const processedResults = [];
    for (const event of events) {
      const result = await processTransferEvent(event);
      processedResults.push(result);
      if (!result.success) {
        allSuccessful = false;
        logger18.error(`\u274C Failed to process event tx: ${event.transaction_id} - ${result.error}`);
      }
    }
    if (!allSuccessful) {
      const failedCount = processedResults.filter((r) => !r.success).length;
      logger18.warn(`\u26A0\uFE0F WARNING: ${failedCount}/${events.length} events failed to process. Block number NOT advanced.`);
      logger18.warn(`\u26A0\uFE0F Last processed block remains at ${scanState.lastProcessedBlockNumber}`);
      if (failedDeposits.length > 0) {
        logger18.error("\u274C FAILED DEPOSITS REQUIRING MANUAL REVIEW:");
        failedDeposits.slice(-10).forEach((fd) => {
          logger18.error(`   - Deposit ID: ${fd.depositId}, TX: ${fd.txHash}, Amount: ${fd.amount} USDT, Error: ${fd.error}`);
        });
      }
      return;
    }
    await storage.updateTronScanStateWithTimestamp(currentBlockNumber, new Date(currentBlockTimestamp));
    logger18.info(`\u2713 Successfully processed all ${events.length} events (including 0 events case), advanced to block ${currentBlockNumber}`);
  } catch (error) {
    logger18.error("\u274C Error scanning blockchain", error);
    logger18.warn(`\u26A0\uFE0F State NOT advanced due to error. Will retry on next scan.`);
  } finally {
    isScanning = false;
  }
}
async function startBlockchainScanner() {
  logger18.info("Starting TRON blockchain scanner...");
  tronWeb = initializeTronWeb();
  await scanBlockchain();
  if (scanInterval) {
    clearInterval(scanInterval);
  }
  scanInterval = setInterval(async () => {
    await scanBlockchain();
  }, SCAN_INTERVAL_MS);
  const intervalSeconds = SCAN_INTERVAL_MS / 1e3;
  logger18.info(`Blockchain scanner started. Scans every ${intervalSeconds} seconds.`);
}
function stopBlockchainScanner() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
    logger18.info("Blockchain scanner stopped.");
  }
}

// server/services/signupBonusExpiration.ts
var logger19 = createLogger2("signupBonus");
var CHECK_INTERVAL = 24 * 60 * 60 * 1e3;
async function checkExpiredSignupBonuses() {
  try {
    logger19.info("Checking for expired signup bonuses...");
    const expiredUsers = await storage.getExpiredSignupBonuses();
    if (expiredUsers.length === 0) {
      logger19.info("No expired signup bonuses found");
      return;
    }
    logger19.info(`Found ${expiredUsers.length} expired signup bonuses`);
    for (const user of expiredUsers) {
      try {
        const bonusAmount = parseFloat(user.signupBonusAmount);
        await storage.expireSignupBonus(user.id);
        await sendUserNotification(
          user.id,
          `\u23F0 \u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0431\u043E\u043D\u0443\u0441\u0430 \u0438\u0441\u0442\u0451\u043A. \u0421\u043F\u0438\u0441\u0430\u043D\u043E ${bonusAmount.toFixed(2)} USDT`,
          "general",
          {
            expiredBonusAmount: bonusAmount.toFixed(8)
          }
        );
        logger19.info(`Expired bonus for user ${user.id}: ${bonusAmount} USDT`);
      } catch (error) {
        logger19.error(`Error processing user ${user.id}`, error);
      }
    }
    logger19.info(`Successfully processed ${expiredUsers.length} expired bonuses`);
  } catch (error) {
    logger19.error("Error checking expired bonuses", error);
  }
}
var expirationInterval2 = null;
async function startSignupBonusExpirationService() {
  logger19.info("Service started");
  await checkExpiredSignupBonuses();
  if (expirationInterval2) {
    clearInterval(expirationInterval2);
  }
  expirationInterval2 = setInterval(async () => {
    await checkExpiredSignupBonuses();
  }, CHECK_INTERVAL);
}
function stopSignupBonusExpirationService() {
  if (expirationInterval2) {
    clearInterval(expirationInterval2);
    expirationInterval2 = null;
    logger19.info("Signup bonus expiration service stopped.");
  }
}

// server/index.ts
var logger20 = createLogger2("server");
var app = express2();
app.use(express2.json({
  limit: "50mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ limit: "50mb", extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, async () => {
    log(`serving on port ${port}`);
    try {
      log("Starting exchange rate service...");
      await startExchangeRateService();
      log("Exchange rate service initialized successfully");
    } catch (error) {
      logger20.error("Failed to initialize exchange rate service:", error);
    }
    try {
      log("Starting deposit expiration service...");
      await startDepositExpirationService();
      log("Deposit expiration service initialized successfully");
    } catch (error) {
      logger20.error("Failed to initialize deposit expiration service:", error);
    }
    try {
      log("Starting TRON blockchain scanner...");
      await startBlockchainScanner();
      log("Blockchain scanner initialized successfully");
    } catch (error) {
      logger20.error("Failed to initialize blockchain scanner:", error);
    }
    try {
      log("Starting signup bonus expiration service...");
      await startSignupBonusExpirationService();
      log("Signup bonus expiration service initialized successfully");
    } catch (error) {
      logger20.error("Failed to initialize signup bonus expiration service:", error);
    }
    if (process.env.BOT_TOKEN) {
      try {
        log("Initializing Telegram bot...");
        initializeBot(process.env.BOT_TOKEN);
        const webAppUrl = process.env.WEBAPP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : `http://localhost:${port}`);
        log(`WebApp URL: ${webAppUrl}`);
        await setupMenuButton(webAppUrl);
        if (process.env.REPLIT_DOMAINS) {
          const webhookUrl = `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/telegram/webhook`;
          await setupWebhook(webhookUrl);
          log(`Telegram webhook set to: ${webhookUrl}`);
        }
        log("Telegram bot initialized successfully");
      } catch (error) {
        logger20.error("Failed to initialize Telegram bot:", error);
      }
    } else {
      log("BOT_TOKEN not set, Telegram bot will not be initialized");
    }
    if (process.env.BOT_OPER_TOKEN) {
      try {
        log("Initializing Operator bot...");
        const operatorBot3 = initializeOperatorBot(process.env.BOT_OPER_TOKEN);
        setOperatorBot(operatorBot3);
        if (process.env.REPLIT_DOMAINS) {
          const operatorWebhookUrl = `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/telegram/operator-webhook`;
          await operatorBot3.setWebHook(operatorWebhookUrl);
          log(`Operator bot webhook set to: ${operatorWebhookUrl}`);
        }
        log("Operator bot initialized successfully");
      } catch (error) {
        logger20.error("Failed to initialize Operator bot:", error);
      }
    } else {
      log("BOT_OPER_TOKEN not set, Operator bot will not be initialized");
    }
  });
  const shutdown = async (signal) => {
    logger20.info(`${signal} received, starting graceful shutdown...`);
    try {
      stopExchangeRateService();
      stopDepositExpirationService();
      stopBlockchainScanner();
      stopSignupBonusExpirationService();
      logger20.info("All background services stopped");
    } catch (error) {
      logger20.error("Error stopping background services:", error);
    }
    try {
      server.close(() => {
        logger20.info("Server closed");
        process.exit(0);
      });
      setTimeout(() => {
        logger20.warn("Forced shutdown after timeout");
        process.exit(1);
      }, 1e4);
    } catch (error) {
      logger20.error("Error closing server:", error);
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
