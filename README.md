# UVA Thrift

UVA-only local marketplace app with:
- Node.js + TypeScript backend (Express)
- React + Vite frontend
- PostgreSQL database

---

# Steps to Spin Up Development Server

## 1) What you need installed

1. **Node.js 22.x**
2. **npm 11.x**
3. **PostgreSQL** server running locally (for development):

For Homebrew on Mac:
```bash
brew install postgresql@18
brew services start postgresql@18
```

To check versions:

```bash
node -v
npm -v
psql --version
```

---

## 2) Install project dependencies

From the project root:

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

---

## 3) Create local PostgreSQL database

Make sure the `createdb` binary is added to $PATH

```bash
createdb uva_thrift_dev
psql uva_thrift_dev < server/schema.sql
```

---

## 4) Create your Local `.env` file

Copy `.env.example` into `.env` in `server` and `client` directories:

```bash
cp .env.example .env
```

Copy the output of this command into the `SESSION_SECRET` variable in `server/.env`:

```bash
openssl rand -hex 64
```

---

## 5) SMTP setup (required for real email verification)

The app sends verification links by email. To make this **fully functional**, set real SMTP credentials.

You need:
- `POSTMARK_SERVER_TOKEN`
- `POSTMARK_FROM_EMAIL`

### Important note for local testing

For local testing, you can leave these values as-is and the backend server will log the verification link to the console instead of sending it in an email. For production, configure an SMTP client and fill in the environment variables above.

---

## 6) Start the app locally

```bash
npm run dev
```

This starts:
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

---

## 7) Test the full login flow (exact steps)

1. Open `http://localhost:5173`
2. Click **Register**
3. Register with an address ending in `@virginia.edu`
4. Check verification link:
   - If SMTP is configured: check inbox
   - If SMTP not configured: copy link from backend terminal
5. Open the verification link
6. Return to login page and sign in with same email/password
7. You should now see the basic **Profile** page

### Expected behavior:
- Non-`@virginia.edu` email is rejected
- Unverified users cannot log in
- Verified users can log in and access profile

---

## 8) Current auth API endpoints

- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `GET /api/auth/verify-email?token=...`
- `POST /api/auth/login`
- `GET /api/auth/me` (requires `Authorization: Bearer <jwt>`)
- `GET /api/health`