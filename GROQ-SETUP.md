# Groq setup for bill scanning

Groq reads receipt images with **Llama 4 Scout** vision. Use it when Gemini quota (429) is exhausted.

## 1. Get API key

1. Open [console.groq.com/keys](https://console.groq.com/keys)
2. Sign in → **Create API Key**
3. Copy the key (starts with `gsk_`)

## 2. Add to `backend/.env`

```env
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
RECEIPT_PRIMARY=groq
```

`RECEIPT_PRIMARY=groq` tries **Groq first**, then Gemini, then local OCR.

## 3. Restart backend

```powershell
cd backend
npm run dev
```

You should see:

```text
Receipt scanning: Groq enabled (primary=groq)
```

## 4. Test

```powershell
cd backend
node scripts/test-groq.js
```

Or upload a bill in the app — toast should say **Groq AI: …**

## 5. Vercel (production)

In Vercel → **Settings** → **Environment Variables**, add:

| Key | Value |
|-----|--------|
| `GROQ_API_KEY` | your `gsk_...` key |
| `GROQ_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` |
| `RECEIPT_PRIMARY` | `groq` |

Redeploy after saving.

## Scan order

| `RECEIPT_PRIMARY` | Order |
|-------------------|--------|
| `groq` (recommended) | Groq → Gemini → OCR |
| `gemini` (default) | Gemini → Groq → OCR |
