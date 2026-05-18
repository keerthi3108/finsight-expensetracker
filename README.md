# AI Expense Tracker

Full-stack receipt expense tracker: **React (Vite)** frontend, **Node.js + Express** API, **MongoDB**, and **Google Gemini** for receipt OCR and spending insights.

## Features

- Upload receipt images (JPG/PNG, max 2MB) → Gemini extracts amount, merchant, category, date
- CRUD for expenses (create via upload, read, update, delete)
- AI **Insights Panel**: total spending, patterns, category insights, saving tips, reminders
- Responsive dashboard: upload (left), expense list (center), insights (right)

## Project structure

```
project/
├── backend/
│   ├── models/Expense.js
│   ├── routes/expenses.js
│   ├── routes/summary.js
│   ├── middleware/upload.js
│   ├── utils/gemini.js
│   ├── uploads/
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/Dashboard.jsx
    │   └── api/client.js
    └── package.json
```

## Prerequisites

1. **Node.js** 18+ ([nodejs.org](https://nodejs.org))
2. **MongoDB** running locally or a MongoDB Atlas connection string
3. **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)

## Step-by-step setup

### 1. MongoDB

**Local (recommended for development):**

- Install MongoDB Community Server, then start the service.
- Default URI: `mongodb://127.0.0.1:27017/expense_tracker`

**Atlas:** create a cluster, allow your IP, copy the connection string into `.env`.

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/expense_tracker
GEMINI_API_KEY=your_actual_api_key
```

Start the API:

```bash
npm run dev
```

Server: `http://localhost:5000`  
Health check: `GET http://localhost:5000/health`

### 3. Frontend

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

Optional: create `frontend/.env` if the API is not on port 5000:

```env
VITE_API_URL=http://localhost:5000
```

## API routes

| Method | Route | Description |
|--------|--------|-------------|
| POST | `/expenses/upload` | Multipart field `receipt` → Gemini → save expense |
| GET | `/expenses` | List expenses (`?category=Food` optional) |
| PUT | `/expenses/:id` | Update amount, merchant, category, date |
| DELETE | `/expenses/:id` | Delete expense + image file |
| GET | `/summary` | Gemini-generated insights JSON |

## Expense schema (MongoDB)

| Field | Type | Notes |
|-------|------|--------|
| image | String | Path like `/uploads/filename.jpg` |
| amount | Number | Total from receipt |
| merchant | String | Store name |
| category | String | Food, Transport, Shopping, etc. |
| date | Date | Purchase date |
| createdAt | Date | Auto (Mongoose timestamps) |

## Run commands (quick reference)

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Production build (frontend only):

```bash
cd frontend && npm run build && npm run preview
```

## Troubleshooting

- **MongoDB connection failed** — ensure MongoDB is running and `MONGODB_URI` is correct.
- **Gemini errors** — verify `GEMINI_API_KEY` in `backend/.env`; check quota at Google AI Studio.
- **CORS** — frontend must use `http://localhost:5173` (configured in `server.js`).
- **Upload rejected** — only JPG/PNG, max 2MB; form field name must be `receipt`.

## Tech stack

- Backend: express, mongoose, cors, multer, dotenv, @google/generative-ai
- Frontend: react, axios, vite
- No auth, Redux, or TypeScript (beginner-friendly)
