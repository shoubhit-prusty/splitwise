# Splitwise Clone

A production-grade, full-stack expense splitting application with OCR receipt scanning and algorithmic debt simplification.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| State | React Context API + Axios |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM (v7) |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| OCR | Tesseract.js |

## Project Structure

```
splitwise/
├── frontend/    # React + Vite app (port 5173)
└── backend/     # Express API (port 5000)
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or a cloud DB URL)

### 1. Backend Setup

```bash
cd backend

# Copy and fill in your environment variables
cp .env .env.local
# Edit DATABASE_URL, JWT_SECRET in .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

### 3. Environment Variables (backend/.env)

```env
PORT=5000
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/splitwise?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
```

## Features

- 🔐 **Authentication** — Register/login with JWT tokens
- 👥 **Groups** — Create expense groups, add members by email/phone
- 📊 **Dashboard** — See total owed/owing across all groups
- 📷 **Receipt Scanner** — Upload receipt image → OCR extracts items → tag veg/non-veg → proportional tax split
- 🧮 **Debt Simplification** — Greedy algorithm minimizes total payment transactions
- 🍃 **Diet Filtering** — Veg-only members excluded from non-veg item calculations automatically
- 🎮 **Gamification & Trust Scores** — Earn points and badges like "Speed Demon" for paying debts quickly within 1 hour!
- 🔄 **Auto-Pay Subscriptions** — Split repeating bills (Netflix, Wi-Fi) with custom intervals (e.g., Every 3 Months)
- 🧾 **Settlement & Proofs** — Mark debts as paid by uploading screenshot proofs, or bypass with cash, with full UI approval flows
