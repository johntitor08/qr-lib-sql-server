# Bibliotheca

A personal library management web app with QR code support, built with vanilla JS on the frontend and Node.js + SQL Server on the backend.

## Features

- Add, edit, and delete books with cover images and metadata
- QR code generation per book for quick lookup
- Reading tracker and progress notes
- Highlights / quotes linked to books
- Loan tracking (who borrowed what and when)
- Shelf organisation
- Admin approval flow for multi-user access
- Demo mode (data stored in browser, no backend required)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS, HTML, CSS (single-file SPA) |
| Backend | Node.js, Express |
| Database | Microsoft SQL Server (via `mssql`) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Dev tooling | nodemon, dotenv |

## Prerequisites

- Node.js 18+
- A running SQL Server instance (local or remote)
- `gh` CLI (optional, for PR workflows)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/johntitor08/qr-lib-sql-server.git
cd qr-lib-sql-server
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `DB_SERVER` | SQL Server hostname | `localhost` |
| `DB_PORT` | SQL Server port | `1433` |
| `DB_DATABASE` | Database name | `bibliotheca` |
| `DB_USER` | SQL login username | `sa` |
| `DB_PASSWORD` | SQL login password | `yourStrong(!)Password` |
| `DB_ENCRYPT` | Enable TLS encryption | `false` |
| `DB_TRUST_CERT` | Trust self-signed cert | `true` |
| `JWT_SECRET` | Secret for signing JWTs | *(long random string)* |
| `ADMIN_EMAIL` | Email address of the admin account | `admin@example.com` |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | `http://localhost:5500` |
| `PORT` | Port the API listens on | `3000` |
| `NODE_ENV` | `development` or `production` | `development` |

### 3. Create the database schema

Run `db/schema.sql` against your target database (the one named in `DB_DATABASE`) to create the required tables (`users`, `books`, `highlights`, `loans`, `shelves`). The script is idempotent — safe to re-run.

```bash
sqlcmd -S localhost -d bibliotheca -U sa -P 'yourStrong(!)Password' -i db/schema.sql
```

### 4. Configure the frontend

Open `index.html` and update the config block near the top of the inline `<script>`:

```js
const API_BASE   = 'http://localhost:3000/api/v1'; // must match PORT above
const ADMIN_EMAIL = 'admin@example.com';           // must match .env ADMIN_EMAIL
```

### 5. Start the server

```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

Open `index.html` in a browser (e.g. via VS Code Live Server on port 5500) and register with the admin email address to create the first account.

## API routes

All routes are prefixed with `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/register` | — | Register a new account |
| POST | `/users/login` | — | Log in, receive JWT |
| GET | `/users/me` | JWT | Current user info |
| GET | `/users/all` | Admin | List all non-admin users |
| PATCH | `/users/:id/approve` | Admin | Approve a user |
| PATCH | `/users/:id/revoke` | Admin | Revoke a user's access |
| DELETE | `/users/:id` | Admin | Delete a user |
| GET | `/books` | JWT + approved | List books (paginated) |
| POST | `/books` | JWT + approved | Add a book |
| GET | `/books/:id` | JWT + approved | Get a single book |
| PUT | `/books/:id` | JWT + approved | Update a book |
| DELETE | `/books/:id` | JWT + approved | Delete a book |
| GET | `/highlights` | JWT + approved | List highlights |
| POST | `/highlights` | JWT + approved | Add a highlight |
| DELETE | `/highlights/:id` | JWT + approved | Delete a highlight |
| GET | `/loans` | JWT + approved | List loans |
| POST | `/loans` | JWT + approved | Create a loan |
| PATCH | `/loans/:id/return` | JWT + approved | Mark a loan as returned |
| DELETE | `/loans/:id` | JWT + approved | Delete a loan |
| GET | `/shelves` | JWT + approved | List shelves |
| POST | `/shelves` | JWT + approved | Create a shelf |
| PUT | `/shelves/:id` | JWT + approved | Update a shelf |
| DELETE | `/shelves/:id` | JWT + approved | Delete a shelf |
| GET | `/api/health` | — | Health check (DB ping) |

## Project structure

```
├── api.js               # Frontend API client + auth UI logic
├── index.html           # Single-page frontend application
├── server.js            # Express app entry point
├── db.js                # SQL Server connection pool
├── middleware/
│   └── auth.js          # requireAuth / requireApproved / requireAdmin
└── routes/
    ├── books.js
    ├── highlights.js
    ├── loans.js
    ├── shelves.js
    └── users.js
```

## Development notes

- **Demo mode** — clicking "Demo modda devam et" on the login screen loads sample data from `localStorage`. No backend is required.
- **Admin account** — the first registration with the email matching `ADMIN_EMAIL` is automatically approved and receives the `admin` role. All other registrations need manual admin approval.
- **Rate limiting** — the API applies a limit of 300 requests per 15 minutes per IP.
- **CORS** — set `CORS_ORIGINS` to the exact origin(s) your frontend is served from. In development `http://localhost:5500` (Live Server default) works out of the box.

<<<<<<< HEAD
## License

MIT
=======
>>>>>>> 4f4b3ec3a4fc43eefb50372f5cdfc72453ec5bc2
