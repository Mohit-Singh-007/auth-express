# auth-express
 
A production-grade authentication system built with Node.js, Express, TypeScript, PostgreSQL, and Redis. Built from scratch — no auth libraries, every piece handcrafted and understood.
 
---
 
## Features
 
- **Register & login** — bcrypt password hashing (cost factor 12)
- **Email verification** — crypto token, sha256 hashed in DB, 24hr expiry
- **JWT authentication** — short-lived access tokens (15min) + long-lived refresh tokens (7 days)
- **Refresh token rotation** — single use, reuse detection wipes all sessions
- **Account lockout** — 5 failed attempts triggers 15min lockout
- **Password reset** — time-limited token (15min), invalidates all sessions on reset
- **Two-factor authentication** — TOTP via Google Authenticator + 8 backup codes
- **Role-based access control** — `USER` and `ADMIN` roles, `requireRole` middleware
- **Redis session store** — refresh tokens stored in Redis for fast lookup
- **Rate limiting** — per-route limits, strict on auth endpoints
- **Input validation** — Zod schemas on every route
- **Swagger docs** — interactive API documentation at `/api/docs`
- **Docker** — Redis runs in an isolated Docker container with persistent volume
 
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Runtime | Node.js v20+ |
| Language | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (via Prisma ORM) |
| Cache / Sessions | Redis (ioredis) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| 2FA | otplib + qrcode |
| Validation | Zod |
| Email | Nodemailer (Mailtrap for dev) |
| Docs | Swagger UI (swagger-jsdoc) |
| Dev | tsx + nodemon |
 
---
 
## Project Structure
 
```
src/
├── config/
│   ├── env.ts              # Zod-validated environment variables
│   ├── prisma.ts           # Prisma client singleton
│   ├── redis.ts            # ioredis client
│   └── mailer.ts           # Nodemailer transporter
├── controllers/
│   └── auth.controller.ts
├── docs/
│   └── auth.docs.ts        # Swagger JSDoc annotations
├── generated/
│   └── prisma/             # Prisma generated client (gitignored)
├── middlewares/
│   ├── validate.ts         # Zod request validation
│   ├── verifyToken.ts      # JWT access token middleware
│   ├── verifyTempToken.ts  # 2FA temp token middleware
│   ├── requireRole.ts      # RBAC middleware
│   ├── rateLimiter.ts      # express-rate-limit configs
│   ├── sanitize.ts         # Input sanitization
│   └── error.middleware.ts # Global error handler
├── routes/
│   └── auth.routes.ts
├── schema/
│   └── authSchema.ts       # Zod schemas + inferred types
├── services/
│   └── auth.service.ts     # All business logic
├── utils/
│   ├── jwt.ts              # Sign + verify tokens
│   ├── cookie.ts           # Set/clear refresh token cookie
│   ├── asyncHandler.ts     # Async error wrapper
│   ├── ApiError.ts         # Custom error class
│   ├── sendEmail.ts        # Email sending utility
│   ├── emailTemplates.ts   # HTML email templates
│   ├── totp.ts             # TOTP secret + QR + verify
│   └── backupCodes.ts      # Generate + hash + verify backup codes
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
└── server.ts
```
 
---
 
## Getting Started
 
### Prerequisites
 
- Node.js 20+
- PostgreSQL running locally or on a cloud provider (Neon, Supabase)
- Docker (for Redis)
- Mailtrap account (free) for email testing
 
### 1. Clone and install
 
```bash
git clone https://github.com/yourusername/auth-express.git
cd auth-express
npm install
```
 
### 2. Set up environment variables
 
```bash
cp .env.example .env
```
 
Fill in `.env`:
 
```env
NODE_ENV=development
PORT=8080
 
DATABASE_URL="postgresql://user:password@localhost:5432/auth_db"
 
REDIS_URL="redis://:yourpassword@localhost:6380"
REDIS_PASSWORD=yourpassword
 
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
 
CLIENT_URL=http://localhost:3000
APP_NAME=AuthApp
 
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SMTP_FROM="Auth App <no-reply@authapp.com>"
```
 
### 3. Start Redis with Docker
 
```bash
docker-compose up -d
```
 
### 4. Run database migrations
 
```bash
npx prisma migrate dev
npx prisma generate
```
 
### 5. Start the development server
 
```bash
npm run dev
```
 
Server runs at `http://localhost:8080`
Swagger docs at `http://localhost:8080/api/docs`
 
---
 
## API Endpoints
 
### Core auth
 
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/refresh` | Refresh access token (cookie) |
| POST | `/api/auth/logout` | Logout and revoke session |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
 
### Two-factor authentication
 
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/auth/2fa/generate` | Get QR code + secret | Access token |
| POST | `/api/auth/2fa/enable` | Enable 2FA with code | Access token |
| POST | `/api/auth/2fa/disable` | Disable 2FA with code | Access token |
| POST | `/api/auth/2fa/verify` | Complete 2FA login | Temp token |
 
---
 
## Authentication Flow
 
```
Register → verify email → login
  ↓
access token (body, 15min) + refresh token (httpOnly cookie, 7d)
  ↓
protected routes → Authorization: Bearer <accessToken>
  ↓
token expires → POST /auth/refresh → new access token
  ↓
logout → tokens revoked from Redis + DB
```
 
### 2FA login flow
 
```
POST /login (password correct, 2FA enabled)
  → { requiresTwoFactor: true, tempToken: "..." }
 
POST /2fa/verify
  Authorization: Bearer <tempToken>
  body: { code: "123456" }
  → real accessToken + refreshToken cookie
```
 
---
 
## Security Decisions
 
| Decision | Reason |
|---|---|
| bcrypt cost 12 | ~300ms per hash — brute force impractical |
| sha256 hash email tokens | Raw token in email, hash in DB — DB breach doesn't leak tokens |
| httpOnly refresh cookie | JS cannot read it — XSS safe |
| Generic "invalid credentials" | Never reveal if email exists or password is wrong |
| Refresh token rotation | Single use — reuse detection wipes all sessions (theft detection) |
| `$transaction` for multi-step writes | Atomic — no orphaned records or inconsistent state |
| Temp token for 2FA | Cryptographically binds the userId to the 2FA step |
| 15min password reset expiry | Short window reduces attack surface |
 
---
 
## Scripts
 
```bash
npm run dev          # start dev server with nodemon + tsx
npm run build        # compile TypeScript
npm run start        # run compiled output
 
npm run db:generate  # prisma generate
npm run db:push      # push schema to DB (dev)
npm run db:migrate   # run migrations
npm run db:studio    # open Prisma Studio
```
 
---
 
## Docker — Redis
 
```bash
docker-compose up -d     # start Redis
docker-compose down      # stop Redis
docker logs auth_redis   # view logs
```
 
Redis runs on port `6380` (host) → `6379` (container) to avoid conflicts with other Redis instances. Data is persisted via a named Docker volume (`auth_redis_data`).
 
---
 
## Environment Variables Reference
 
| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection URL with password | Yes |
| `REDIS_PASSWORD` | Redis password (used in docker-compose) | Yes |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 32 chars) | Yes |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 32 chars) | Yes |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (e.g. `15m`) | Yes |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`) | Yes |
| `CLIENT_URL` | Frontend URL for CORS + email links | Yes |
| `APP_NAME` | App name shown in 2FA QR codes and emails | Yes |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP server port | Yes |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password | Yes |
| `SMTP_FROM` | From address for emails | Yes |
 
---
 
## What I Learned Building This
 
- How JWT access + refresh token rotation actually works under the hood
- Why `httpOnly` cookies matter for XSS protection
- How bcrypt's intentional slowness defeats brute force
- The difference between `Promise.all` (parallel, not atomic) and `$transaction` (atomic)
- How TOTP works — time-based codes, shared secret, 30s windows
- Why generic error messages on login prevent user enumeration attacks
- How refresh token reuse detection works to identify stolen tokens
 
---
 
## Coming Next
 
- OAuth (Google / GitHub login)
- Session management — view and revoke active devices
- Email change flow
- Account deletion with data cleanup
 
---
 
## License
 
MIT
