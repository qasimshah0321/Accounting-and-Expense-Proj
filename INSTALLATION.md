# Deployment Guide — cPanel Hosting

This guide covers deploying the full-stack accounting application (Next.js 14 frontend + Express/TypeScript backend + PostgreSQL database) to a cPanel shared hosting environment.

---

## Stack Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 | Server-side rendered, requires Node.js |
| Backend | Express + TypeScript | REST API on port 3001 |
| Database | PostgreSQL | Hosted on Render.com (cloud) — no change needed |

---

## Prerequisites

- cPanel hosting with **"Setup Node.js App"** feature enabled
- Node.js 18.x or 20.x available on the server
- FTP client (e.g. FileZilla) or access to cPanel File Manager
- cPanel Terminal access (or SSH)
- `mod_proxy` and `mod_proxy_http` enabled (ask host if unsure)

---

## Part 1 — Prepare Your Code Locally

### 1A. Build the Backend

```bash
cd backend
npm install
npm run build
```

Verify that `backend/dist/index.js` exists after the build.

### 1B. Create `backend/.env` for Production

```env
PORT=3001
DB_HOST=dpg-d6g7huua2pns738nrneg-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=zeropoint
DB_USER=zeropoint_user
DB_PASSWORD=your_actual_db_password
DB_SSL=true
JWT_SECRET=your_strong_random_jwt_secret
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

> Replace `yourdomain.com` with your actual domain name.

### 1C. Build the Frontend

```bash
cd nextjs-accounting-app
npm install
npm run build
```

Verify that the `nextjs-accounting-app/.next/` folder is created.

### 1D. Create `nextjs-accounting-app/.env.production`

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
```

> If the backend runs on a subdomain (e.g. `api.yourdomain.com`), use that URL instead.

### 1E. Create `nextjs-accounting-app/server.js`

Create this file manually in the `nextjs-accounting-app/` folder:

```js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const app = next({ dev })
const handle = app.getRequestHandler()
const port = process.env.PORT || 3000

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, () => {
    console.log(`> Ready on port ${port}`)
  })
})
```

### 1F. Update `nextjs-accounting-app/package.json`

Make sure the `start` script points to the custom server:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "node server.js"
}
```

---

## Part 2 — Deploy the Backend

### 2A. Create a Node.js App in cPanel

1. Login to cPanel → click **Setup Node.js App**
2. Click **Create Application**
3. Fill in the fields:

   | Field | Value |
   |-------|-------|
   | Node.js version | 18.x or 20.x |
   | Application mode | Production |
   | Application root | `public_html/backend` |
   | Application URL | `yourdomain.com/api` |
   | Application startup file | `dist/index.js` |

4. Click **Create**

### 2B. Upload Backend Files

Using File Manager or FTP, upload the following to `public_html/backend/`:

```
public_html/backend/
├── dist/             ← compiled output (required)
├── package.json
├── package-lock.json
└── .env              ← production environment variables
```

> Do **not** upload `node_modules/` or `src/` — dependencies are installed on the server.

### 2C. Install Backend Dependencies

In cPanel → **Setup Node.js App** → click your backend app → click **Run NPM Install**.

Or via cPanel Terminal:

```bash
cd ~/public_html/backend
npm install --production
```

### 2D. Run Database Migrations

Via cPanel Terminal:

```bash
cd ~/public_html/backend
node dist/database/migrate.js
```

> This only needs to be run once. Skip if the database is already set up.

### 2E. Start the Backend

In **Setup Node.js App** → your backend app → click **Start** (or **Restart**).

**Verify:** Open `https://yourdomain.com/api/v1/auth/login` in a browser — you should receive a JSON response, not a 404.

---

## Part 3 — Deploy the Frontend

### 3A. Create a Node.js App in cPanel

1. In cPanel → **Setup Node.js App** → **Create Application**
2. Fill in:

   | Field | Value |
   |-------|-------|
   | Node.js version | 18.x or 20.x |
   | Application mode | Production |
   | Application root | `public_html` |
   | Application URL | `yourdomain.com` |
   | Application startup file | `server.js` |

3. Click **Create**

### 3B. Upload Frontend Files

Upload the following to `public_html/`:

```
public_html/
├── .next/            ← Next.js build output (required)
├── public/           ← static assets (images, fonts, etc.)
├── server.js         ← custom Node.js server (created in Step 1E)
├── package.json
├── package-lock.json
└── .env.production   ← frontend environment variables
```

> Do **not** upload `node_modules/` or `src/`.

### 3C. Install Frontend Dependencies

In cPanel → **Setup Node.js App** → frontend app → click **Run NPM Install**.

Or via Terminal:

```bash
cd ~/public_html
npm install --production
```

### 3D. Start the Frontend

In **Setup Node.js App** → frontend app → click **Start**.

**Verify:** Open `https://yourdomain.com` — the login page should appear.

---

## Part 4 — Configure URL Routing

Both apps run on different ports. The `.htaccess` file proxies requests to the correct app.

### 4A. Create/Edit `public_html/.htaccess`

```apache
RewriteEngine On

# Route /api/* requests to the backend Node.js app
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# Route all other requests to the Next.js frontend
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

> The ports `3001` and `3000` must match what cPanel assigned your Node.js apps.
> Check the port numbers in **Setup Node.js App** — each app shows its assigned port.

### 4B. Enable mod_proxy (if not already enabled)

If the proxy rules do not work, contact your hosting support and request:

- `mod_proxy` enabled
- `mod_proxy_http` enabled

These are required for the `.htaccess` reverse proxy to function.

---

## Part 5 — SSL / HTTPS Setup

1. In cPanel → **SSL/TLS** → enable **AutoSSL** (free Let's Encrypt certificate)
2. Ensure the backend `.env` has `CORS_ORIGIN=https://yourdomain.com` (with `https://`)
3. Ensure the frontend `.env.production` has `NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1`

---

## Part 6 — Verify the Deployment

| Check | Expected Result |
|-------|----------------|
| `https://yourdomain.com/api/v1/auth/login` | Returns JSON response |
| `https://yourdomain.com` | Login page loads |
| Login with credentials | Dashboard loads with data |
| Create an Invoice / Sales Order | Document saved and listed correctly |
| Auto-generated document numbers | SO-001, DN-001, INV-001, etc. appear |

---

## File Structure on Server (Final)

```
public_html/
├── .htaccess                  ← proxy routing rules
├── .next/                     ← Next.js compiled output
├── public/                    ← static assets
├── server.js                  ← Next.js custom server entry
├── package.json
├── node_modules/              ← installed by npm install
├── .env.production            ← frontend environment variables
│
└── backend/
    ├── dist/                  ← Express compiled output
    ├── .env                   ← backend environment variables
    ├── package.json
    └── node_modules/          ← installed by npm install
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend app won't start | Confirm `dist/index.js` exists; check `.env` has the correct `DB_PASSWORD` |
| 502 Bad Gateway | Node.js app crashed — check error logs in cPanel |
| API calls return 404 | `.htaccess` proxy not routing correctly; confirm `mod_proxy` is enabled |
| CORS errors in browser | Set `CORS_ORIGIN` in backend `.env` to match the exact frontend `https://` URL |
| Database connection fails | Confirm `DB_SSL=true` and Render.com allows connections from your server IP |
| Frontend loads but data is empty | Confirm `NEXT_PUBLIC_API_URL` points to the production backend, not `localhost` |
| Document numbers not incrementing | Confirm migrations ran successfully (`node dist/database/migrate.js`) |

---

## Redeployment (After Code Updates)

When you update the code:

1. Rebuild locally (`npm run build` in backend and frontend)
2. Upload the new `dist/` (backend) or `.next/` (frontend) folder
3. In cPanel → **Setup Node.js App** → click **Restart** on both apps

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Port the backend listens on (default: 3001) |
| `DB_HOST` | PostgreSQL host (Render.com) |
| `DB_PORT` | PostgreSQL port (default: 5432) |
| `DB_NAME` | Database name |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_SSL` | Must be `true` for Render.com |
| `JWT_SECRET` | Secret key for signing JWT tokens (use a long random string) |
| `NODE_ENV` | Set to `production` |
| `CORS_ORIGIN` | Exact frontend URL (e.g. `https://yourdomain.com`) |

### Frontend (`nextjs-accounting-app/.env.production`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Full URL to the backend API (e.g. `https://yourdomain.com/api/v1`) |
