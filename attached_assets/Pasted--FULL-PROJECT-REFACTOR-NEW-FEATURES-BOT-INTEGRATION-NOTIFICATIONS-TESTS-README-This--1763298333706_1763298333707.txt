# 🔥 FULL PROJECT REFACTOR + NEW FEATURES + BOT INTEGRATION + NOTIFICATIONS + TESTS + README  
This is the **full technical specification** for the Romax Pay project.  
Your task is to execute **100% of the tasks automatically** unless you explicitly need something from me.  
Before you begin, **first respond with**:

👉 **"Готов приступить. Нужны ли какие-либо данные, которые отсутствуют?"**  
If nothing is needed, proceed with full implementation automatically.

After that, switch to `plan` → then execute in `build` mode.

---

# 📌 GLOBAL GOALS
Perform a **complete refactor and expansion** of the Romax Pay Mini App + backend + operator bot integration including:

- Full UI overhaul  
- Desktop Telegram Web adaptation  
- Notifications system (user + operator)  
- New operator bot logic  
- Online/Offline statuses  
- 2-decimal formatting everywhere  
- Complete test suite  
- Massive README  
- UX polishing  
- Auto-fixes  
- Ensure entire project works end-to-end

---

# 🧩 PART 1 — UI FIXES & ADAPTATION

## 1.1 Header
- Fetch Telegram user avatar  
- Display avatar circle left  
- Display full name next to it  
- Show “БЕТА” badge right  
- Add welcome text block:

> **Рады видеть вас в Romax Pay!**  
> **Платите криптой за покупки в рублях свободно.**

Centered, 20–22px title, 14–15px subtitle.

## 1.2 Main balance card
- Replace **ALL** “Available USDT” → “USDT”  
- Show USDT with exactly **2 decimals** (format: 99.97)  
- Remove second “USDT” under the number  
- Keep “Заморожено: XX.XX USDT”

## 1.3 Exchange rate card
- Center `=` sign visually  
- Use dark teal background  
- Large clear font

## 1.4 RUB equivalent card
- “Эквивалент в ₽” title  
- Big grouped number: 24 172  
- Remove “Пересчёт по текущему курсу”

## 1.5 Buttons row
Two big buttons:

- **Пополнить** (outlined, mint)
- **Оплатить** (filled dark-teal)

Spacing 16px.

## 1.6 Bottom navigation
- Must **NEVER overlap content**  
- Add safe-area bottom padding  
- Keep identical design  

## 1.7 Desktop WebApp adaptation
On screens > 900px:

- Put whole app inside centered container:  
  ```css
  max-width: 430px;
  margin: 0 auto;
Add bottom safe padding

No overlapping

No stretched buttons

🧩 PART 2 — USER NOTIFICATION SYSTEM
Implement full notifications for all user events.

2.1 Events that must trigger notifications to USER:
Successful deposit confirmation

Payment request fully paid

Payment request declined

Any status change of user’s active request

2.2 Rules:
If the Mini App is open → show:

in-app notification AND

Telegram push message

If Mini App is closed → only Telegram push

Use user’s chat_id from Telegram login

Create a reusable notification module

🧩 PART 3 — OPERATOR BOT (BOT_OPER_TOKEN)
I added a secret: BOT_OPER_TOKEN.
This is the token of the operator bot.

Implement:

3.1 Operator login
Operators created from admin panel must be able to:

Log into the operator bot

Login uses operator login + password

The bot verifies credentials using the same database as admin panel

3.2 Online / Offline status
Operators must have:

“Online” toggle

“Offline” toggle

This must exist:

In the operator web panel

In the operator Telegram bot

Synchronization rules:

If operator switches Online in bot → web panel updates

If switches Online in panel → bot updates

Multiple operators may be Online simultaneously

3.3 New task distribution system
When a user creates a new request:

All operators currently Online receive notification

The task displays two inline buttons:

“Взять в работу”

“Отклонить” (optional)

When operator taps “Взять в работу”:

Task is assigned to him

Other online operators stop seeing it

They receive a message “Заявка передана другому оператору”

🧩 PART 4 — ADD "WRITE TO SUPPORT" FUNCTION
In the Mini App's "Support" button:

→ open Telegram chat with @ex_romax
Use universal deep-link:
https://t.me/ex_romax

🧩 PART 5 — 2-DECIMAL FORMATTING
Absolutely everywhere USDT is shown:

Dashboard

Deposit confirmations

Payment requests

History

Active operations

Operator view

Admin view

Bot messages

Miniapp screens

Backend responses

Stored data (rounded before display, not before math)

Format:

Copy code
XX.XX
99.97
85.31
0.00
Use a unified formatting function.

🧩 PART 6 — DEPOSIT FLOW & DUPLICATE PROTECTION (from earlier prompt)
Keep previous logic:

User inputs amount

Min = 30 USDT

Max = 20 000 USDT

Check duplicates:

If active request of same amount exists → generate decimal variation (e.g., 99.9999 → now 99.99 allowed)

Request < 3–4 seconds

10-minute countdown

Request persists even after app reload until:

Confirmed

Expired

Address to receive TRC20:
👉 THVyqrSDMBvpibitvTt4xJFWxVgY61acLu

🧩 PART 7 — TESTING & QA
Create extensive automated tests:

Frontend UI tests:
Avatar rendering

Name fallback

Desktop adaptive layout

Button overlap prevention

Safe-area handling

History page tests

Support button deep-link test

Two-decimal appearance test

Backend tests:
Duplicate request protection

Status change events

Notification triggers

Operator assignment

Online/Offline sync

Operator bot login

Operator task takeover logic

Integration tests:
User deposit flow

Payment flow

Operator acceptance

Notifications correctness

Failover behaviour

Place tests in /tests or /client/tests and /server/tests.

🧩 PART 8 — MASSIVE README
Create a huge README containing:

Overview
Architecture
Full payment flow
Database scheme
Miniapp logic
Admin panel logic
Operator bot logic
Notification system design
Deployment guide
Secrets list
Tests guide
AI contribution guidelines
(so other AIs understand the full project)

README is essential for future development.

🧩 PART 9 — FINAL VALIDATION
After implementing everything:

Full end-to-end test

UI polish pass

Desktop + mobile simulation

Telegram Web test

Avatar test

Decimal test

Notification test

Operator assignment test

Ensure no overlapping

Fix any remaining UI/logic issues

🧩 PART 10 — IF ANYTHING IS MISSING
Before starting, ask me:

👉 "Готов приступить. Нужны ли какие-либо данные, которые отсутствуют?"

If nothing needed → begin full build.