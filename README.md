# ⚙️ Dockly Backend

[![Railway Deployment](https://img.shields.io/badge/deployed_on-railway-blueviolet.svg?style=flat-square&logo=railway)](https://dockly-backend-production.up.railway.app)
[![Node.js](https://img.shields.io/badge/Node.js-22-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5-lightgrey.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7-blue.svg?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

The **Dockly Backend** is the core orchestrator of the Dockly platform. Built with **Express.js (v5)** and **TypeScript**, it handles multi-tenant authentication, metadata management, document upload pipelines (integrated with Supabase Storage), analytics compilation, and forwards query operations to the Python-based RAG microservice.

🌐 **Live Backend API:** [https://dockly-backend-production.up.railway.app](https://dockly-backend-production.up.railway.app)

---

## 🚀 Core Features

- **🔐 Secure Authentication & Session Handling**: JWT access and refresh token validation with HTTP-only cookies and revokable sessions tracked in PostgreSQL.
- **📄 Document Upload Pipeline**: Intercepts file uploads (using Multer), uploads buffers securely to Supabase Storage, and pushes processing requests to the Python RAG service.
- **💬 SSE Chat Orchestrator**: Captures queries, forwards them to the Python RAG vector query API, updates DB histories, and streams responses back to the client using Server-Sent Events (SSE).
- **📉 Analytics Summaries**: Aggregates daily usage metrics (questions, conversations, resolution status, and popular questions) for the admin dashboard.
- **💼 Auto-Recovery Startup Jobs**: Automatically scans on boot for files stuck in a `PROCESSING` state for more than 5 minutes and pushes them back into the processing queue.
- **🛡️ Request Validation**: Uses Zod schemas to validate payload structures and prevent malformed inputs.

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js (v22+)](https://nodejs.org/)
- **API Framework**: [Express.js (v5)](https://expressjs.com/)
- **Database ORM**: [Prisma ORM (v7)](https://www.prisma.io/)
- **Primary Database**: [PostgreSQL](https://www.postgresql.org/)
- **Storage Integrations**: [Supabase JS Client](https://supabase.com/) (Object Storage)
- **Token / Password Security**: [JSONWebTokens (JWT)](https://jwt.io/) & [Bcrypt Hashing](https://www.npmjs.com/package/bcrypt)
- **Task Runner**: [tsx](https://www.npmjs.com/package/tsx) (TypeScript Execute) & [Prisma CLI](https://www.npmjs.com/package/prisma)

---

## 📂 Project Structure

```text
backend/
├── prisma/                  # Database schema definitions and migrations
│   ├── migrations/          # SQL migration scripts
│   └── schema.prisma        # Prisma schema declaring models and relations
├── src/                     # Source code directory
│   ├── config/              # Global environment configurations
│   ├── controllers/         # Request handlers (auth, documents, analytics, chat)
│   ├── jobs/                # Background/startup cron tasks (startup_job.ts)
│   ├── middleware/          # JWT auth guards and CORS filters
│   ├── models/              # Prisma data wrappers / model layers
│   ├── routes/              # Express Router definitions
│   │   ├── authRouter.ts    # Authentication endpoints
│   │   ├── companyRouter.ts # Company settings and document management endpoints
│   │   └── publicRouter.ts  # Public chatbot interaction endpoints
│   ├── service/             # Utility services (auth, upload, RAG communicator)
│   ├── types/               # Custom Express request/response TS typings
│   └── utils/               # Helper modules and validation utilities
├── app.ts                   # Entry point for the Node Express server
├── dockerfile               # Multi-stage production container configuration
└── tsconfig.json            # TypeScript compiler options
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the root of the `backend` directory to manage local environments:

```env
# Application Settings
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<dbname>?schema=public"

# Authentication Secrets
JWT_Access_Token="your_access_token_secret"
JWT_Refresh_Token="your_refresh_token_secret"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Supabase Storage Integration
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_KEY="your-supabase-service-role-key"
SUPABASE_BUCKET_NAME="documents"

# Python RAG Microservice URL
RAG_SERVICE_URL="http://localhost:8000"
```

---

## 🚀 Getting Started

Follow these steps to set up and run the backend locally:

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Database Migrations
Apply current migrations to your local PostgreSQL database:
```bash
npx prisma migrate dev
```

### 4. Run the Development Server
```bash
npm run dev
```
The server will boot and listen on [http://localhost:5000](http://localhost:5000).

### 5. Inspect Database (Optional)
Prisma Studio provides a graphical UI to view and edit database records:
```bash
npx prisma studio
```

---

## ☁️ Deployment on Railway

The backend is configured to deploy directly to [Railway](https://railway.app) using the included `dockerfile`.

Railway automatically detects the Docker configuration:
1. It builds the container based on Node 22-slim.
2. Generates the Prisma Client.
3. During startup, the entrypoint executes:
   ```bash
   npx prisma migrate deploy && npm run start:prod
   ```
   *Note: `migrate deploy` ensures all pending production SQL migrations are successfully applied to your database before booting the server.*

Production URL: **[https://dockly-backend-production.up.railway.app](https://dockly-backend-production.up.railway.app)**
