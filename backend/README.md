# Mini ERP Invoicing System - Backend

Backend API untuk sistem invoicing ERP sederhana. Dibangun dengan **NestJS** + **Prisma** + **PostgreSQL**.

---

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| ORM | Prisma 7 |
| Database | PostgreSQL 17 |
| Auth | JWT (passport-jwt) + bcryptjs |
| Validation | class-validator + class-transformer |

---

## Prerequisites

Pastikan sudah terinstall di mesin Anda:

- [Node.js](https://nodejs.org/) v20 atau lebih baru
- [Docker](https://www.docker.com/) (untuk menjalankan PostgreSQL)
- [npm](https://www.npmjs.com/) v10 atau lebih baru

Cek versi:

```bash
node -v    # minimal v20
npm -v     # minimal v10
docker -v  # untuk PostgreSQL
```

---

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/username/ujian-erp-mini.git
cd ujian-erp-mini/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

File `.env` sudah disediakan. Pastikan sesuai dengan kondisi Anda:

```env
DATABASE_URL="postgresql://app_user:app123@localhost:5432/mini_erp?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1d"
PORT=3000
```

> ⚠️ **Penting:** Ganti `JWT_SECRET` dengan secret yang kuat di production!

### 4. Jalankan Database (PostgreSQL via Docker)

Jika belum ada container PostgreSQL yang berjalan:

```bash
docker run -d \
  --name mini-erp-db \
  -e POSTGRES_USER=app_user \
  -e POSTGRES_PASSWORD=app123 \
  -e POSTGRES_DB=mini_erp \
  -p 5432:5432 \
  postgres:17-alpine
```

Atau gunakan docker-compose di root project:

```bash
cd ..
docker compose up -d postgres
```

Cek status container:

```bash
docker ps
```

Pastikan container `mini-erp-db` atau `postgres-db` berjalan di port `5432`.

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Jalankan Migrasi Database

```bash
npx prisma migrate dev --name init
```

Perintah ini akan:
- Membuat tabel `users`, `customers`, `invoices`, `invoice_items`
- Generate migration file di `prisma/migrations/`

### 7. Jalankan Seed Data (Opsional)

```bash
npx prisma db seed
```

### 8. Jalankan Server

**Development mode** (dengan hot-reload):

```bash
npm run start:dev
```

**Production mode:**

```bash
npm run build
npm run start:prod
```

Server akan berjalan di `http://localhost:3000/api/v1`

---

## API Endpoints

### Auth

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/api/v1/auth/login` | Login dan dapatkan JWT token | ❌ |
| GET | `/api/v1/auth/me` | Ambil profile user yang sedang login | ✅ |

### Customers (Coming Soon)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/api/v1/customers` | List semua customers (paginated) | ✅ |
| GET | `/api/v1/customers/:id` | Detail customer | ✅ |
| POST | `/api/v1/customers` | Buat customer baru | ✅ |
| PATCH | `/api/v1/customers/:id` | Update customer | ✅ |
| DELETE | `/api/v1/customers/:id` | Soft delete customer | ✅ |

### Invoices (Coming Soon)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/api/v1/invoices` | List semua invoices (paginated) | ✅ |
| GET | `/api/v1/invoices/:id` | Detail invoice + items | ✅ |
| POST | `/api/v1/invoices` | Buat invoice baru | ✅ |
| PATCH | `/api/v1/invoices/:id` | Update invoice header | ✅ |
| PATCH | `/api/v1/invoices/:id/status` | Update status invoice | ✅ |
| DELETE | `/api/v1/invoices/:id` | Soft delete invoice | ✅ |
| POST | `/api/v1/invoices/:invoiceId/items` | Tambah item ke invoice | ✅ |
| PATCH | `/api/v1/invoices/:invoiceId/items/:itemId` | Update item | ✅ |
| DELETE | `/api/v1/invoices/:invoiceId/items/:itemId` | Hapus item | ✅ |

### Dashboard (Coming Soon)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/api/v1/dashboard` | Summary dashboard (revenue, counts) | ✅ |

---

## Struktur Project

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration files
│   ├── generated/prisma/       # Generated Prisma client
│   └── prisma.config.ts        # Prisma v7 config
├── src/
│   ├── main.ts                 # Bootstrap & global config
│   ├── app.module.ts           # Root module
│   ├── auth/                   # Auth module (login, JWT)
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/login.dto.ts
│   │   └── strategies/jwt.strategy.ts
│   ├── common/                 # Shared utilities
│   │   ├── decorators/         # @CurrentUser
│   │   ├── dto/                # PaginationDto, buildPagination
│   │   ├── filters/            # HttpExceptionFilter
│   │   ├── guards/             # JwtAuthGuard
│   │   └── interceptors/       # TransformInterceptor
│   └── prisma/                 # Prisma service & module
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env
```

---

## Test API dengan Postman

Import collection dari `doc/postman/`:

1. Buka Postman
2. Klik **Import** → pilih file `mini-erp-auth.postman_collection.json`
3. Login terlebih dahulu untuk mendapatkan token
4. Token akan otomatis tersimpan di variable `accessToken`

---

## Troubleshooting

### Database connection refused

```bash
# Cek container PostgreSQL berjalan
docker ps

# Jika belum jalan, start container
docker start mini-erp-db
# atau
docker start postgres-db
```

### Port 5432 sudah digunakan

```bash
# Cek proses yang menggunakan port 5432
sudo lsof -i :5432

# Atau gunakan port lain (update .env)
docker run -d --name mini-erp-db -e POSTGRES_USER=app_user -e POSTGRES_PASSWORD=app123 -e POSTGRES_DB=mini_erp -p 5433:5432 postgres:17-alpine
```

### Prisma generate error

```bash
# Hapus generated folder lalu generate ulang
rm -rf prisma/generated
npx prisma generate
```

### Build error

```bash
# Bersihkan dist lalu build ulang
rm -rf dist
npx nest build
```

---

## Development

### Format & Lint

```bash
# Coming soon
```

### Run Tests

```bash
# Coming soon
```

---

## License

ISC
