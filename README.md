# 🧠 DataIQ — AI-Powered Dataset Intelligence Platform

> Upload any dataset. Get instant AI insights, auto-generated visualizations, natural language queries, ML recommendations, and exportable reports.

---

## ✨ Features

| Category | Features |
|---|---|
| **Upload** | CSV, Excel (.xlsx/.xls), JSON, Parquet — up to 100 MB |
| **Data Profiling** | Row/column counts, dtype inference, memory usage, quality score |
| **Missing Values** | Per-column missing %, heatmap, pattern analysis |
| **Duplicates** | Exact duplicate detection with counts |
| **Statistics** | Mean, std, min/max, quartiles, skewness, kurtosis |
| **Outliers** | IQR-based outlier detection per numeric column |
| **Correlation** | Pearson correlation matrix with high-corr pair detection |
| **Visualizations** | 10+ auto-generated Plotly charts (histogram, bar, scatter, box, heatmap, timeseries…) |
| **AI Insights** | 8–12 categorized AI insights via Gemini or OpenAI |
| **NL Querying** | Ask questions in plain English about your data |
| **SQL Query** | DuckDB-powered SQL queries directly on your dataset |
| **ML Suggestions** | Task type detection + model recommendations |
| **Reports** | PDF/HTML export of full analysis |
| **Auth** | JWT-based auth with refresh tokens, user profiles |
| **Admin** | Django admin dashboard |
| **Async** | Celery + Redis for background processing of large files |

---

## 🏗 Architecture

```
dataiq/
├── backend/                  # Django + DRF
│   ├── dataiq_project/       # Settings, URLs, Celery
│   ├── apps/
│   │   ├── users/            # Auth, JWT, profiles
│   │   ├── datasets/         # Upload, models, file handling
│   │   ├── analysis/         # Profiling engine, visualizations, tasks
│   │   ├── insights/         # AI engine (Gemini/OpenAI), insight models
│   │   └── reports/          # PDF/HTML report generation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # Next.js 14 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── (dashboard)/  # Protected pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── datasets/ # List + Detail with tabs
│   │   │   │   ├── upload/
│   │   │   │   ├── insights/
│   │   │   │   ├── reports/
│   │   │   │   └── settings/
│   │   │   └── auth/         # Login, Register
│   │   ├── components/       # Sidebar, Charts, UI
│   │   ├── lib/              # Axios API client
│   │   └── store/            # Zustand auth store
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── setup.sh
```

---

## 🚀 Quick Start

### Option A — Docker (Recommended)

```bash
git clone <repo>
cd dataiq
cp .env.example .env
# Edit .env → add GEMINI_API_KEY or OPENAI_API_KEY

docker compose up --build
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000/api  
- Admin: http://localhost:8000/admin

### Option B — Local Development

**Prerequisites:** Python 3.10+, Node.js 18+, PostgreSQL 14+, Redis 6+

```bash
chmod +x setup.sh
./setup.sh
```

Then start 4 terminals:

```bash
# Terminal 1 – Redis
redis-server

# Terminal 2 – Django
cd backend && source venv/bin/activate
python manage.py runserver

# Terminal 3 – Celery Worker
cd backend && source venv/bin/activate
celery -A dataiq_project worker -l info

# Terminal 4 – Next.js
cd frontend && npm run dev
```

---

## ⚙️ Configuration

Edit `.env` in the project root:

```env
# Required for AI features (get one or both)
GEMINI_API_KEY=AIza...          # https://makersuite.google.com/app/apikey
OPENAI_API_KEY=sk-...           # https://platform.openai.com/api-keys
AI_PROVIDER=gemini              # 'gemini' or 'openai'

# Database
POSTGRES_DB=dataiq_db
POSTGRES_USER=dataiq_user
POSTGRES_PASSWORD=dataiq_password
POSTGRES_HOST=localhost

# Redis
REDIS_URL=redis://localhost:6379/0

# Django
SECRET_KEY=your-secret-key
DEBUG=True
```

---

## 📡 REST API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login → access + refresh tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| GET/PATCH | `/api/auth/profile/` | Get/update user profile |
| GET | `/api/auth/dashboard-stats/` | Dashboard statistics |
| GET/POST | `/api/datasets/` | List datasets / Upload new |
| GET/PATCH/DELETE | `/api/datasets/{id}/` | Dataset detail |
| GET | `/api/datasets/{id}/status/` | Processing status |
| POST | `/api/datasets/{id}/reprocess/` | Re-trigger analysis |
| GET | `/api/datasets/{id}/columns/` | Column profiles |
| POST | `/api/datasets/{id}/query/` | DuckDB SQL query |
| GET | `/api/analysis/{id}/profile/` | Full data profile |
| GET | `/api/analysis/{id}/visualizations/` | All charts |
| POST | `/api/analysis/{id}/nl-query/` | Natural language query |
| GET | `/api/insights/{id}/` | AI insights list |
| POST | `/api/insights/{id}/regenerate/` | Re-run AI insights |
| POST | `/api/reports/{id}/generate/` | Generate PDF report |
| GET | `/api/reports/{id}/download/` | Download report |

All endpoints require `Authorization: Bearer <access_token>` header.

---

## 🧠 Processing Pipeline

When a dataset is uploaded, this pipeline runs asynchronously via Celery:

```
Upload → parse file (pandas)
      → DataProfiler.profile()
          → overview stats
          → per-column analysis (numeric/categorical/datetime)
          → missing value analysis
          → duplicate detection
          → correlation matrix
          → quality score
      → save DataProfile + DatasetColumn records
      → save DataPreview (first 100 rows)
      → VisualizationGenerator.generate_all()
          → histograms for numeric cols
          → bar charts for categorical cols
          → scatter plots for numeric pairs
          → box plots (numeric × categorical)
          → correlation heatmap
          → missing values chart
          → time series (if datetime cols present)
      → AIInsightEngine.generate_insights()
          → build context string
          → call Gemini/OpenAI API
          → parse 8-12 structured insights
          → fallback to rule-based insights if API fails
      → mark dataset as 'ready'
```

---

## 🛠 Tech Stack

**Backend**
- Django 4.2 + Django REST Framework
- PostgreSQL 15
- Celery 5 + Redis 7
- pandas, NumPy, DuckDB, polars, pyarrow
- Plotly (chart config generation)
- Gemini API / OpenAI API

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (custom dark theme)
- Zustand (state management)
- TanStack Query (server state)
- Plotly.js (interactive charts)
- react-dropzone, framer-motion

---

## 🚢 Deployment

### Render / Railway

1. Deploy PostgreSQL and Redis services
2. Deploy Django backend as a Web Service:
   - Build: `pip install -r requirements.txt`
   - Start: `gunicorn dataiq_project.wsgi:application`
3. Deploy Celery as a Background Worker:
   - Start: `celery -A dataiq_project worker -l info`
4. Deploy Next.js frontend as a Static/Node service

### Environment Variables for Production

```env
DEBUG=False
SECRET_KEY=<strong-random-key>
ALLOWED_HOSTS=yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
POSTGRES_HOST=<your-db-host>
REDIS_URL=rediss://<your-redis-url>
GEMINI_API_KEY=<your-key>
```

---

## 📄 License

MIT — free to use, modify, and deploy.
