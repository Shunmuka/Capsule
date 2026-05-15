# Capsule

Capsule is a social app backend centered around delayed gratification: users create capsules, invite friends, upload photos, and reveal those photos only after the capsule's reveal date.

## Backend

The backend lives in `capsule-backend` and is built with:

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL via Neon

## Local Setup

From the backend folder:

```bash
cd capsule-backend
npm install
```

Create `capsule-backend/.env` with your Neon connection strings:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DBNAME?sslmode=require"
```

Run migrations and generate Prisma Client:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the API:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```
