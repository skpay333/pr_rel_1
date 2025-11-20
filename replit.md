# Romax Pay - Telegram Mini App for Crypto Payments

## Overview

Romax Pay is a production-ready Telegram Mini App designed for USDT (TRC20) to Russian Ruble (RUB) payment processing. It provides a complete, full-stack ecosystem for cryptocurrency payments within Telegram, featuring a React frontend, Express backend, and PostgreSQL database. The application aims to offer a seamless and secure experience for users, administrators, and operators, enabling efficient management of crypto deposits, payment requests, and user interactions. Key capabilities include automated blockchain scanning for USDT deposits, real-time exchange rate services, a comprehensive admin panel for management, and an operator panel for processing payment requests.

## User Preferences

### Documentation
- **Always update README.md** after each significant change or feature implementation
- Keep README.md Changelog section synchronized with replit.md Recent Changes
- Document all new features, fixes, and improvements immediately

## System Architecture

Romax Pay is a full-stack application built with a React frontend (Vite, Tailwind CSS, shadcn/ui) and an Express.js backend using TypeScript and Drizzle ORM for PostgreSQL.

### UI/UX Decisions
The frontend utilizes a Neo-Brutalist design aesthetic with Tailwind CSS and shadcn/ui components, providing a bold and modern interface. The Mini App is designed for a Russian-speaking audience with a fully localized interface.

### Technical Implementations
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui, React Query, Wouter.
- **Backend**: Express.js, TypeScript, Drizzle ORM, PostgreSQL, Helmet, CORS, rate limiting, session management.
- **Blockchain Integration**: TronWeb for TRON blockchain interaction and USDT TRC20 contract integration for automated deposit detection.
- **Real-time Services**: Exchange rate service (USD/RUB conversion), deposit expiration service, and a TRON blockchain scanner for automated USDT deposit tracking.
- **Notification System**: Dual notification mechanism with in-app and Telegram push notifications for all critical actions.
- **Security**: Implemented with Helmet, CORS, rate limiting, bcrypt for password hashing, and secure session management.

### Feature Specifications
- **Mini App**: User dashboard, top-up functionality, payment creation, transaction history, and settings.
- **Admin Panel**: Password-protected interface for user management, payment processing, deposit confirmations, and operator oversight.
- **Operator Panel**: Dedicated interface for operators to process payment requests, manage task queues, and update their online status.
- **Telegram Bots**: A user bot for authentication and notifications, and an operator bot for task assignments and real-time updates.
- **Payment Flow**: Users deposit USDT to a master wallet, deposits are detected by the blockchain scanner, confirmed by an admin, balances are updated, users create RUB payment requests, operators process them, and admin approves completion.
- **Unique Features**: 2-decimal USDT display, duplicate transaction protection, smart task distribution to online operators, and a Neo-Brutalist UI.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for schema management and queries. Optimized with indexes on userId, status, and createdAt columns for payment_requests, deposits, and notifications tables.
- **Session Management**: Secure session handling for both user and admin/operator panels.
- **Environment**: Configured for Replit VM deployment, leveraging Replit's integrated PostgreSQL and secret management.
- **Demo Mode**: Includes a demo mode for testing outside Telegram, automatically creating a demo user.

## Recent Changes (November 18, 2025)

### Version 1.0.5 - Performance Optimization & AI-Friendly Deployment Guide

#### Database Query Optimization
- **Eliminated N+1 Queries**: Replaced Promise.all loops with LEFT JOIN queries in admin/operator controllers
  - `getAllPaymentRequests()`: Reduced from N+1 queries to 1 query using JOIN with users and operators tables
  - `getAllDeposits()`: Reduced from 2 queries to 1 query using JOIN with users table
  - Expected massive performance improvement for admin panel with 100+ requests/deposits
  - Added `getAllPaymentRequestsWithJoins()` and `getAllDepositsWithJoins()` methods in storage.ts

#### Graceful Shutdown Implementation
- **Added Graceful Shutdown Handlers**: Implemented proper cleanup for background services
  - Added `stopSignupBonusExpirationService()` function to match other services
  - Imported all stop functions in `server/index.ts`
  - SIGTERM and SIGINT handlers now properly stop all intervals:
    - Exchange rate service
    - Blockchain scanner
    - Deposit expiration service
    - Signup bonus expiration service
  - Server closes gracefully with 10-second timeout before forced shutdown
  - Prevents memory leaks and ensures clean process termination

#### Frontend Bundle Size Optimization
- **Dramatic Bundle Size Reduction**: Optimized initial load from 539 KB to ~122 KB gzipped (77% reduction)
  - Implemented lazy loading with React.lazy() for all heavy components:
    - AdminPanel, OperatorPanel (admin interfaces)
    - DashboardPage, TopUpPage, PayPage, HistoryPage, SettingsPage (user pages)
  - Added Suspense wrappers with LoadingSpinner fallback for smooth UX
  - Configured manual code splitting in `vite.config.ts`:
    - react-vendor (142 KB → 45.55 KB gzipped)
    - ui-core, ui-extended, ui-additional (Radix UI components)
    - react-query (27.6 KB → 8.44 KB gzipped)
    - Separate chunks for forms, router, icons, charts, utils
  - Main app bundle: 28.71 KB (8.85 KB gzipped)
  - Lazy-loaded chunks load on-demand (AdminPanel: 11.59 KB, TopUpPage: 10.54 KB, etc.)
  - Fixed TypeScript errors in App.tsx related to type assertions for referral data

#### AI-Friendly Deployment Guide
- **Comprehensive Deployment Documentation**: Added 300+ line "🤖 AI Agent Deployment Guide" section to README.md
  - Prerequisites Checklist: Telegram bots, database, TRON blockchain, admin access
  - Environment Secrets Required: Mandatory, auto-configured, and optional variables
  - Step-by-Step Deployment: 7 detailed steps from installation to service verification
  - Architecture Overview for AI Agents: Database schema, background services, Telegram bots, payment/referral flows
  - Common Issues & Solutions: 5 typical deployment problems with fixes
  - Quick Verification Script: 6-step verification commands
  - Rebuilding from Repository: Response template for AI agents receiving repository links
  - Production Checklist: 14 pre-launch verification items
  - Designed specifically for AI agents to deploy Romax Pay without extensive user intervention

### Version 1.0.4 - Admin Panel History Fix

#### Restored Payment History View
- **Fixed Missing History Tab**: Restored "История" (History) tab for payment requests in admin panel that was accidentally removed in v1.0.2
- **Two-Tab System**: Admin panel now has "Активные" (Active) and "История" (History) tabs for payment requests, matching deposits interface
- **Smart Filtering**: 
  - Active tab: Shows submitted, assigned, and processing requests with urgency filter
  - History tab: Shows completed requests (paid, rejected, cancelled) with status filter
  - Urgency filter only applies to active tab, preventing empty history results
- **Filter Isolation**: Fixed filter state leakage issue where urgency filter incorrectly affected history tab
- **API Layer Protection**: Added filter object cloning in `adminGetAllPayments()` to prevent mutation side effects
- **Accurate Counters**: Active tab counter shows correct count based on current view

### Version 1.0.3 - Critical Bug Fixes

#### Payment Request Error Handling
- **Fixed "Load failed" Error**: Resolved issue where successful payment request creation showed error alert due to notification refresh failure
- **Separated Try-Catch Blocks**: Split error handling in `client/src/App.tsx` so notification refresh failures don't block successful payment creation
- **Improved User Experience**: Payment requests now complete successfully even if notification refresh temporarily fails

#### Operator Bot Webhook Fix
- **Added Webhook Setup**: Implemented webhook registration for operator bot in `server/index.ts` (previously missing)
- **Full Integration**: Operator bot now properly receives callback queries from "Взять в работу" (Take to Work) button
- **Synchronized with User Bot**: Operator bot webhook setup mirrors user bot implementation pattern
- **Production Ready**: Webhook automatically configured for Replit environment using `REPLIT_DOMAINS`

### Version 1.0.2 - UI/UX Improvements

#### Admin Panel Improvements
- **Removed Completed Requests Counter**: Eliminated "Завершенные" (Completed) requests tab and counter from admin panel payments section
- **Simplified Payment View**: Admin panel now shows only active payment requests with accurate counter showing submitted, assigned, and processing statuses
- **Streamlined State Management**: Removed unnecessary paymentTab and paymentStatusFilter state variables
- **Optimized Data Loading**: Simplified loadPayments() function to always fetch active requests only, reducing complexity and improving performance
- **Removed Approve Button**: Eliminated "Одобрить" (Approve) button from payment requests table for cleaner interface

#### Operator Panel Improvements
- **Image Preview Feature**: Added inline image preview for payment request attachments instead of showing only file names
- **Fullscreen Viewer**: Implemented fullscreen image viewer with zoom capability for detailed inspection
- **Download Functionality**: Added download buttons for attached images and files directly from the operator panel
- **Enhanced UX**: Improved attachment display with visual thumbnails, clear action buttons (Open/Download), and file type indicators
- **"Взять в работу" Workflow**: Implemented atomic request assignment system to prevent duplicate processing
  - Operators must explicitly take requests before accessing attachments or processing
  - New status: 'assigned' (purple badge) for requests taken by operators
  - Status flow: submitted → assigned → processing → paid/rejected
  - Atomic database operation prevents race conditions when multiple operators try to take the same request
  - Synchronized between operator panel web interface and Telegram bot
  - Operators can only process requests they have personally taken

#### Status Badge Standardization
- **Consistent Color Scheme**: Standardized status badge colors across all components (AdminPanel, OperatorPanel, PaymentDetailsDialog, HistoryPage, RequestDetailPage, DepositDetailsDialog)
- **Color Mapping**:
  - Blue (submitted): New payment requests awaiting operator assignment
  - Purple (assigned): Requests taken by operators but not yet in processing
  - Yellow (processing): Requests currently being processed
  - Green (paid/confirmed): Successfully completed requests/deposits
  - Red (rejected): Rejected requests/deposits
  - Gray (cancelled/expired): Cancelled or expired items
- **Improved Visibility**: Enhanced contrast and readability for all status indicators throughout the application

### Previous Updates (November 17, 2025 - Version 1.0.1)

#### Performance Optimization
- **Database Indexes**: Added B-tree indexes on frequently queried columns (userId, status, createdAt) in payment_requests, deposits, and notifications tables to improve query performance
- **Parallel API Loading**: Optimized App.tsx to use Promise.all for parallel API requests during app initialization, reducing load time from ~542ms to ~415ms (~23% faster)
- **Enhanced Loading Screen**: Implemented animated loading screen with Zap icon, spinner animation, and status text for better user experience during app initialization
- **UI Improvements**: Updated Settings page to display Telegram avatar photos; enhanced History page payment status indicators with improved color contrast and visibility

#### Centralized Logging System
- **Logger Implementation**: Created centralized logging system (server/utils/logger.ts) with structured output, Moscow timezone timestamps, and debug level control
- **Complete Migration**: Replaced 149+ console.log/error/warn statements across 20+ backend files with proper logger usage
- **Service Coverage**: All services, controllers, webhooks, and utilities now use structured logging with service-specific identifiers
- **Debug Mode**: Debug logs only appear in development environment; production logs are concise and error-focused
- **Security Note**: Documented known vulnerabilities in node-telegram-bot-api transitive dependencies (form-data, tough-cookie) - not critical for current production use case

#### Payment Request Validation
- **Mandatory Attachments**: Payment request creation (step 3) now requires at least one attachment (photo/file/link) before proceeding to the next step
- **Validation Guard**: Added client-side validation that prevents empty payment requests from being submitted
- **User Feedback**: Toast notification appears when user attempts to skip attachment step without adding any files or links
- **Visual Indicator**: Red asterisk (*) and explanatory text added to step 3 heading to clearly indicate the field is mandatory

## External Dependencies

- **Telegram WebApp SDK**: For integrating with the Telegram Mini App environment.
- **TronWeb**: JavaScript library for interacting with the TRON blockchain.
- **USDT TRC20 Contract**: Direct integration for monitoring and processing USDT transactions on the TRON network.
- **TronGrid API**: Optional for enhanced blockchain scanning rate limits.