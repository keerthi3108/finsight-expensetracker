# Deploy frontend + backend on Vercel (all-in-one)

One Vercel project serves:
- **React app** (static)
- **Express API** (serverless via `api/index.js`)

You still need **MongoDB Atlas** (free).

---

## Step 1 — Push to GitHub

```powershell
cd "C:\Users\SAI KEERTHI\Desktop\expenses"
git add .
git commit -m "Add Vercel full-stack deployment"
git push
```

---

## Step 2 — Import on Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo
3. **Root Directory:** leave as `.` (repo root)
4. Vercel reads `vercel.json` automatically

---

## Step 3 — Environment variables

In Vercel → **Settings** → **Environment Variables**, add:

| Key | Value |
|-----|--------|
| `MONGODB_URI` | `mongodb+srv://USER:PASS@cluster0.xxx.mongodb.net/expense_tracker?retryWrites=true&w=majority` |
| `GEMINI_API_KEY` | Your Gemini key |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `GROQ_API_KEY` | Your Groq key (`gsk_...`) from [console.groq.com/keys](https://console.groq.com/keys) |
| `GROQ_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` |
| `RECEIPT_PRIMARY` | `groq` (use Groq first for bill scanning) |
| `JWT_SECRET` | Long random string (32+ chars) |

**Do not set** `VITE_API_URL` on Vercel — the frontend uses the same domain for API calls.

Optional after first deploy:
| `FRONTEND_URL` | `https://your-app.vercel.app` |

---

## Step 4 — Deploy

Click **Deploy**. Wait for build to finish.

Test API: `https://YOUR-APP.vercel.app/health` → `{"ok":true,"platform":"vercel"}`

Open app: `https://YOUR-APP.vercel.app` → Sign up → Upload receipt

---

## Limits (good to know)

| Topic | Vercel free tier |
|--------|------------------|
| API timeout | 10s (Hobby) / 60s (Pro) |
| Receipt images | Stored in MongoDB as compressed data (no `/uploads` folder) |
| Cold start | First request after idle may be slow |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Database connection failed` | Check `MONGODB_URI` starts with `mongodb+srv://` |
| 404 on `/expenses` | Redeploy; check `vercel.json` rewrites exist |
| CORS errors | Set `FRONTEND_URL` to your exact Vercel URL |
| Upload timeout / bad scan | Add `GROQ_API_KEY` + `RECEIPT_PRIMARY=groq` — see `GROQ-SETUP.md` |

---

## Local development (unchanged)

```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Local uses `http://localhost:5000` for API automatically.
