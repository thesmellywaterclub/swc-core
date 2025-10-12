## Backend Setup Guide

This backend lives under `swc-core` and exposes the API server from `swc-core/api`. Follow the steps below to bring up both the database container and the Node.js server.

### 1. Prerequisites
- Node.js 18+ and PNPM (v9 recommended)
- Docker Desktop or Docker Engine with Compose V2
- Optional: `direnv` or another tool to manage environment variables

### 2. Environment Configuration
1. API env vars:
   ```bash
   cd swc-core/api
   cp .env.example .env
   ```
   Update `DATABASE_URL`, `CORS_ORIGINS`, and `PORT` if your local setup differs.

2. Database env vars (only if you want to override defaults):
   ```bash
   cd ../docker
   cp .env.example .env
   ```

### 3. Start the Database
```bash
cd swc-core/docker
docker compose up -d postgres
```

Useful checks:
- Container status: `docker compose ps`
- Logs: `docker compose logs -f postgres`
- Stop the container: `docker compose down`

### 4. Install and Run the API
```bash
cd ../api
pnpm install
pnpm run dev
```

What you get:
- API dev server on `http://localhost:4000`
- Health endpoint at `GET /health`
- Homepage data at `GET /api/home`

For a production-style build:
```bash
pnpm run build
pnpm start
```

### 5. Database Migrations & Seeding (future-ready)
Once the Prisma schema and seed scripts are implemented, run:
```bash
pnpm dlx prisma migrate deploy
pnpm dlx prisma db seed
```
These commands will use the `DATABASE_URL` defined in `swc-core/api/.env`.

### 6. Troubleshooting
- Ensure Docker is running before starting the DB container.
- Port already in use? Adjust `POSTGRES_PORT` in `docker/.env` and `DATABASE_URL` in `api/.env`.
- Restart the stack after any env var changes.
