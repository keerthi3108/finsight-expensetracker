# Deploy FinSight AI (GitHub + Vercel + Render)

This app has two parts:

| Part | Host | Why |
|------|------|-----|
| **Frontend** (React) | **Vercel** | Fast, free, perfect for Vite/React |
| **Backend** (Express + uploads) | **Render** (free) | Vercel cannot run this Express API + file uploads reliably |
| **Database** | **MongoDB Atlas** (free) | Cloud MongoDB |

---

## Step 1 — MongoDB Atlas (database)

1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account.
2. Create a **free cluster** (M0).
3. **Database Access** → Add user with password (save the password).
4. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`) for deployment.
5. **Connect** → Drivers → copy connection string, e.g.  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/expense_tracker`
6. Replace `<password>` with your real password (URL-encode special characters).

---

## Step 2 — Push code to GitHub

Open PowerShell in the project folder:

```powershell
cd "C:\Users\SAI KEERTHI\Desktop\expenses"
```

Initialize git (if not already):

```powershell
git init
git add .
git status
```

**Important:** `.env` files must NOT appear in `git status`. If they do, do not commit them.

```powershell
git commit -m "Initial commit: FinSight AI expense tracker"
```

Create a new repo on GitHub (website: **New repository**, name e.g. `finsight-expense-tracker`, **no** README).

Then connect and push (replace `YOUR_USERNAME` and `YOUR_REPO`):

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Or with GitHub CLI:

```powershell
gh repo create finsight-expense-tracker --public --source=. --push
```

---

## Step 3 — Deploy backend on Render

1. Go to [https://render.com](https://render.com) and sign up (GitHub login).
2. **New +** → **Web Service** → connect your GitHub repo.
3. Settings:

   | Setting | Value |
   |---------|--------|
   | **Name** | `finsight-api` |
   | **Root Directory** | `backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | Free |

4. **Environment Variables** (add all):

   | Key | Value |
   |-----|--------|
   | `MONGODB_URI` | Your Atlas connection string |
   | `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
   | `GEMINI_MODEL` | `gemini-2.0-flash-lite` |
   | `JWT_SECRET` | Long random string (e.g. 32+ chars) |
   | `FRONTEND_URL` | Leave empty for now; add after Vercel deploy |

5. Click **Create Web Service** and wait until status is **Live**.
6. Copy your API URL, e.g. `https://finsight-api.onrender.com`

Test: open `https://YOUR-API.onrender.com/health` → should show `{"ok":true}`.

> Free Render services sleep after ~15 min idle. First request may take 30–60 seconds to wake up.

---

## Step 4 — Deploy frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up with GitHub.
2. **Add New…** → **Project** → import your GitHub repo.
3. Configure:

   | Setting | Value |
   |---------|--------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `frontend` (click Edit) |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. **Environment Variables**:

   | Key | Value |
   |-----|--------|
   | `VITE_API_URL` | `https://finsight-api.onrender.com` (your Render URL, **no** trailing slash) |

5. Click **Deploy**.
6. When done, copy your Vercel URL, e.g. `https://finsight-expense-tracker.vercel.app`

---

## Step 5 — Connect frontend ↔ backend (CORS)

1. Go back to **Render** → your web service → **Environment**.
2. Set `FRONTEND_URL` = your Vercel URL (e.g. `https://finsight-expense-tracker.vercel.app`).
3. Save → Render will redeploy automatically.

---

## Step 6 — Test production

1. Open your **Vercel URL**.
2. **Sign up** for a new account.
3. Upload a receipt and check the dashboard.
4. If API is slow on first load, wait ~1 minute (Render waking from sleep).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Failed to load expenses | Check `VITE_API_URL` on Vercel matches Render URL |
| CORS error in browser | Set `FRONTEND_URL` on Render exactly to Vercel URL (https, no trailing slash) |
| 401 / login issues | Sign up again on production (new database) |
| Gemini quota errors | Wait or upgrade API key; app still saves receipts for manual edit |
| Render 502 on first visit | Wait 60s — free tier is waking up |

---

## Updating after changes

```powershell
git add .
git commit -m "Describe your change"
git push
```

- **Vercel** redeploys frontend automatically on push.
- **Render** redeploys backend automatically on push.

---

## Security checklist

- Never commit `.env` files or API keys to GitHub.
- Use strong `JWT_SECRET` in production.
- Rotate Gemini API key if it was ever exposed.
