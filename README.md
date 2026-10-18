<div align="center">

<h1>🇦🇪 Hini — UAE AI &amp; Tech Job Hub</h1>

<p><strong>The UAE's #1 real-time AI &amp; tech job aggregator, built fully in the open.</strong></p>

<p>
  <a href="https://uae-jobs-hub.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-uae--jobs--hub.vercel.app-6366f1?style=for-the-badge&logo=vercel" alt="Live Demo"/></a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python" alt="Python 3.12"/>
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel" alt="Vercel"/>
  <img src="https://img.shields.io/badge/GitHub%20Actions-Auto%20Scraper-2088FF?style=for-the-badge&logo=githubactions" alt="GitHub Actions"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<p>
  Hini automatically collects, filters, and surfaces <strong>AI and tech jobs from LinkedIn, Indeed, Google Jobs, Bayt, Naukrigulf, GulfTalent</strong> — refreshed every 6 hours, zero manual effort.<br/>
  Upload your CV for instant ATS scoring. Chat with an AI recruiter. All free. All open source.
</p>

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🔄 How It Works — End to End](#-how-it-works--end-to-end)
- [📁 Project Structure](#-project-structure)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Getting Started (Local Development)](#-getting-started-local-development)
- [☁️ Deployment (Vercel + GitHub)](#️-deployment-vercel--github)
- [🔐 Environment Variables](#-environment-variables)
- [🧠 ATS Matching Engine](#-ats-matching-engine)
- [🤖 AI Career Chatbot](#-ai-career-chatbot)
- [🔒 Security Model](#-security-model)
- [🗄️ Database Schema](#️-database-schema)
- [📡 GitHub Actions Automation](#-github-actions-automation)
- [🤝 Contributing](#-contributing)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔎 **Live Job Feed** | 1,000+ real AI & tech jobs from 6 sources, refreshed every 6 hours |
| 📄 **Resume ATS Scoring** | Upload PDF/DOCX/TXT — every job is instantly ranked by match score |
| 🤖 **Hini AI Chatbot** | Groq-powered career assistant answers questions about your job search |
| 🗓️ **Tech Events** | UAE conferences, hackathons, meetups, and webinars |
| 📜 **Certifications** | Curated AI & cloud courses with direct links |
| 💰 **Salary Reports** | UAE tech salary benchmarks by role and emirate |
| 📰 **AI News** | Latest UAE tech industry news aggregated automatically |
| 🔔 **Job Alerts** | Save jobs to localStorage for quick access |
| 🎯 **Smart Filtering** | Filter by source, date, type (AI vs Tech), and keyword |
| 📱 **Responsive UI** | Works on desktop and mobile with smooth animations |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER BROWSER                              │
│   React 18 SPA (Vite) — Deployed on Vercel                     │
│   ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│   │  Job Feed    │  │  ATS Matcher  │  │  Hini AI Chat    │   │
│   │  + Filters   │  │  (Web Worker) │  │  → /api/chat     │   │
│   └──────────────┘  └───────────────┘  └──────────────────┘   │
└──────────────────────────┬──────────────────────┬──────────────┘
                           │ supabase-js           │ fetch /api/chat
                ┌──────────▼───────────┐  ┌───────▼──────────────┐
                │   Supabase (PG DB)   │  │  Vercel Serverless   │
                │   Row Level Security │  │  /api/chat.js        │
                │   - jobs             │  │  GROQ_API_KEY        │
                │   - events           │  │  (server-side only)  │
                │   - resource_items   │  └──────────────────────┘
                └──────────▲───────────┘
                           │ service_role key
          ┌────────────────┴──────────────────────┐
          │       GitHub Actions (Cron)            │
          │       Every 6 hours — Ubuntu runner    │
          │                                        │
          │  Python 3.12 Scraper Pipeline:         │
          │  ┌────────────┐  ┌──────────────────┐ │
          │  │  JobSpy    │  │  Scrapling       │ │
          │  │  LinkedIn  │  │  Naukrigulf      │ │
          │  │  Indeed    │  │  GulfTalent      │ │
          │  │  Google    │  └──────────────────┘ │
          │  │  Bayt      │  ┌──────────────────┐ │
          │  └────────────┘  │  Career Pages    │ │
          │                  │  ScrapeGraphAI   │ │
          │                  │  + Gemini LLM    │ │
          │                  └──────────────────┘ │
          └───────────────────────────────────────┘
```

---

## 🔄 How It Works — End to End

### Step 1 — Automated Scraping (Every 6 Hours)

GitHub Actions triggers `scrapers/run_all.py` on a cron schedule. The scraper runs in **4 phases**:

#### Phase 1 — JobSpy (LinkedIn, Indeed, Google Jobs, Bayt)
Uses the [`python-jobspy`](https://github.com/Bunsly/JobSpy) library to fetch structured job listings via each platform's internal guest API. No login required — it mimics browser TLS fingerprints.

#### Phase 2 — Scrapling (Naukrigulf, GulfTalent)
Uses the [`scrapling`](https://github.com/D4Vinci/Scrapling) library to parse job listings from Naukrigulf and GulfTalent. Scrapling auto-detects page structure changes — far more resilient than BeautifulSoup selectors.

#### Phase 3 — Career Pages (ScrapeGraphAI + Gemini LLM)
Scrapes company career pages directly using ScrapeGraphAI with Gemini Flash as the extraction LLM. Only runs if `GEMINI_API_KEY` is configured.

#### Phase 4 — Resources (News, Courses, Salary)
- **News & Events** — scraped on every run via RSS feeds + DuckDuckGo Search
- **Courses** — refreshed every Monday
- **Salary data** — refreshed on the 1st of each month

---

### Step 2 — Multi-Layer Filtering

Every scraped job passes through `common.py` before reaching the database:

```
Raw job title
      │
      ▼
NON_JOB_TITLE_BLOCKLIST  ─── rejects Wikipedia, W3Schools, tutorial pages
      │
      ▼
NON_TECH_BLOCKLIST ─────────── rejects 100+ non-IT roles (civil, medical, sales, etc.)
      │
      ▼
AI_ROLES / IT_TECH_ROLES ───── classifies as "AI", "Tech", or "Blocked"
      │
      ▼
UAE Location Validator ─────── rejects jobs outside UAE (Pakistan, India, Saudi, etc.)
      │
      ▼
Source Domain Validator ────── Naukrigulf links must include naukrigulf.com, etc.
      │
      ▼
✅ normalize_job() ─────────── cleans & hashes → ready for Supabase upsert
```

**Deduplication:** Each job gets an MD5 hash of `title|company` (normalized, alphanumeric only). Upserts use `ON CONFLICT (job_hash)` so no duplicate rows accumulate.

**Stale job cleanup:** After every run, jobs not seen for 7+ days are marked `active=false` and hidden from the feed.

---

### Step 3 — Database (Supabase + PostgreSQL)

The cleaned jobs are upserted into Supabase using the **service role key** (write-capable, server-only). Three tables power the full UI:

| Table | Contents | Updated |
|---|---|---|
| `jobs` | All active AI & tech job listings | Every 6 hours |
| `events` | UAE tech conferences, meetups, hackathons | Every 6 hours |
| `resource_items` | News articles, courses, salary data | Variable schedule |

All tables have **Row Level Security (RLS)** enabled:
- `anon` key → SELECT only (safe for the browser)
- `service_role` key → full INSERT/UPDATE/DELETE (only trusted scrapers)

---

### Step 4 — Frontend (React + Vite)

The React SPA fetches jobs from Supabase using the **anon key** (read-only). Jobs are displayed, filtered, and sorted entirely client-side for instant UI updates.

Key UI flows:
- **Job Feed** → fetches all `active=true` jobs, sorted by `first_seen DESC`
- **Resume Upload** → parsed client-side using `pdfjs-dist` (PDF) or `mammoth` (DOCX)
- **ATS Scoring** → skills extracted from resume, scored against every job in a Web Worker (off main thread, no UI freeze)
- **AI Chat** → sends messages to `/api/chat` (Vercel serverless) → Groq LLM

---

### Step 5 — Serverless AI Proxy (`/api/chat.js`)

The Groq API key **never reaches the browser**. Instead:

```
Browser → POST /api/chat  →  Vercel Serverless Function
                              (reads GROQ_API_KEY from env)
                                     │
                                     ▼
                              api.groq.com → llama-3.3-70b-versatile
                                     │
                              response → Browser
```

Users can also enter their own Groq key in the Settings panel — it's sent as an `x-groq-key` header and used as a fallback only if the server key is absent.

---

## 📁 Project Structure

```
itjob_uae/
│
├── 📁 api/
│   └── chat.js                   # 🔒 Vercel serverless Groq proxy (API key server-side)
│
├── 📁 scrapers/                  # Python scraping pipeline
│   ├── run_all.py                # 🎯 Master orchestrator (runs all 4 phases)
│   ├── common.py                 # Shared utilities: filter, hash, normalize, upsert
│   ├── jobspy_scraper.py         # Phase 1: LinkedIn, Indeed, Google Jobs, Bayt
│   ├── scrapling_scraper.py      # Phase 2: Naukrigulf, GulfTalent
│   ├── career_pages.py           # Phase 3: Company career page scraping (Gemini)
│   ├── resources_scraper.py      # Phase 4: News, events, courses, salary
│   ├── clean_bad_jobs.py         # Manual utility: remove specific bad jobs
│   ├── cleanup_duplicates.py     # Manual utility: deduplicate DB records
│   ├── purge_all_fake.py         # Manual utility: remove non-tech contamination
│   ├── salary_config.json        # UAE salary benchmark data by role
│   └── requirements.txt          # Python dependencies
│
├── 📁 src/                       # React frontend
│   ├── App.jsx                   # 🎯 Main app component (3000+ lines, all views)
│   ├── index.css                 # Complete design system (dark theme, animations)
│   ├── main.jsx                  # React DOM entry point
│   │
│   ├── 📁 components/
│   │   ├── jobs/                 # JobDetailDrawer (ATS match panel)
│   │   ├── resume/               # ResumeParser, ResumeStrip
│   │   ├── chat/                 # AI chatbot components
│   │   ├── insights/             # Salary & analytics views
│   │   ├── tracker/              # Job tracker (saved jobs)
│   │   └── admin/                # Admin utilities
│   │
│   ├── 📁 matching/              # ATS scoring engine
│   │   ├── ats.js                # Core ATS algorithm (skill extraction, scoring)
│   │   ├── skills.js             # 500+ skill definitions, domain detection
│   │   ├── scoring.js            # Final score calculator + ranking
│   │   ├── useJobMatcher.js      # React hook (throttled, debounced)
│   │   └── matcherWorker.js      # Web Worker wrapper (off main thread)
│   │
│   ├── 📁 lib/
│   │   ├── supabase.js           # Supabase client (anon key, read-only)
│   │   └── jdParser.js           # Job description parser (experience, seniority)
│   │
│   └── 📁 data/
│       └── jobs.js               # Static fallback data (events, news, certs, salary)
│
├── 📁 .github/workflows/
│   ├── scrape.yml                # ⏰ Cron: runs every 6 hours
│   └── keepalive.yml             # 🔄 Prevents GitHub disabling scheduled workflows
│
├── .env.example                  # Template — copy to .env and fill values
├── supabase_schema.sql           # Full DB schema (run once in Supabase SQL Editor)
├── vercel.json                   # Vercel routing (SPA + /api/* serverless)
├── vite.config.js                # Vite build config
└── package.json                  # Node.js dependencies
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework with hooks |
| **Vite 5** | Build tool + dev server |
| **Vanilla CSS** | Custom design system (no Tailwind/Bootstrap) |
| **Supabase JS v2** | Real-time database client |
| **pdfjs-dist** | Client-side PDF parsing |
| **mammoth** | Client-side DOCX parsing |
| **lucide-react** | Icon library |
| **Web Workers** | Off-thread ATS scoring |

### Backend / Scrapers
| Technology | Purpose |
|---|---|
| **Python 3.12** | Scraper runtime |
| **python-jobspy** | LinkedIn, Indeed, Google, Bayt APIs |
| **scrapling** | Naukrigulf, GulfTalent HTML parsing |
| **ScrapeGraphAI** | AI-powered career page extraction |
| **Google Gemini Flash** | LLM for career page job extraction |
| **feedparser** | RSS news feed parsing |
| **supabase-py** | Database upsert via service key |
| **python-dotenv** | Local secret loading |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Supabase** | PostgreSQL database + auth + Row Level Security |
| **Vercel** | Frontend hosting + serverless `/api/chat` |
| **GitHub Actions** | Automated scraping cron (every 6 hours) |
| **Groq** | Ultra-fast LLM inference (llama-3.3-70b-versatile) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- A **Supabase** project (free tier works)
- A **Groq** API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the Repository

```bash
git clone https://github.com/Rajapandi03/uae-job-hub.git
cd uae-job-hub
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# --- Frontend (Vite) ---
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# --- Backend / Scrapers ---
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
GEMINI_API_KEY=your_gemini_api_key_here    # optional

# --- Server-side only (NOT VITE_) ---
GROQ_API_KEY=your_groq_api_key_here
```

> ⚠️ **Never prefix `GROQ_API_KEY` with `VITE_`** — that would expose it in the browser bundle.

### 3. Initialize the Database

Run the schema in your **Supabase SQL Editor** (Dashboard → SQL Editor):

```bash
# Paste the contents of supabase_schema.sql into Supabase SQL Editor and run it
```

This creates the `jobs`, `events`, and `resource_items` tables with RLS policies.

### 4. Run the Frontend

```bash
npm install
npm run dev
```

App is now running at `http://localhost:5173`

### 5. Run the Scrapers (Optional — populates the DB)

```bash
cd scrapers
pip install -r requirements.txt

# Full run (writes to Supabase)
python run_all.py

# Dry run (no DB writes — just tests the scraping)
python run_all.py --dry
```

---

## ☁️ Deployment (Vercel + GitHub)

### Frontend + Serverless API

1. Fork this repository on GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your fork
3. Add Environment Variables in Vercel:

   | Variable | Where to get |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
   | `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
   | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |

4. Deploy — Vercel auto-builds on every push to `main`

### Automated Scraping

Add these secrets to your GitHub Repository Settings → Secrets and Variables → Actions:

| Secret | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (write access) |
| `GEMINI_API_KEY` | Optional — for career page scraping |

The scraper will then run automatically every 6 hours via GitHub Actions.

---

## 🔐 Environment Variables

| Variable | Required | Used By | Exposed to Browser? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Yes | Frontend | ✅ Yes (by design — anon read only) |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Frontend | ✅ Yes (by design — read only) |
| `SUPABASE_URL` | ✅ Yes | Scrapers | ❌ No (GitHub Actions only) |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Scrapers | ❌ No (GitHub Actions only) |
| `GROQ_API_KEY` | ✅ Yes | `/api/chat.js` | ❌ No (Vercel server-side only) |
| `GEMINI_API_KEY` | Optional | Career page scraper | ❌ No (GitHub Actions only) |

---

## 🧠 ATS Matching Engine

Hini's ATS engine runs **entirely client-side in a Web Worker** — it never sends your resume to any server.

### How Scoring Works

```
Resume File (PDF / DOCX / TXT)
         │
         ▼
    ResumeParser.js
    ├─ pdfjs-dist (PDF text extraction)
    ├─ mammoth (DOCX extraction)
    └─ skills.js → detect 500+ tech skills
         │
         ▼
    Domain Detection (skills.js)
    ├─ AI/ML Engineer
    ├─ Software Engineer
    ├─ Data Engineer
    ├─ DevOps / Cloud
    ├─ Cyber Security
    └─ Blocked (HR, Finance, non-tech)
         │
         ▼
    ATS Scoring (ats.js) — per job
    ├─ Title Match          (25%)  → exact/partial role match
    ├─ Required Skills      (40%)  → extracted from job description
    ├─ Domain Gate          (pass/fail) → mismatched domain = 0
    ├─ Seniority Match      (15%)  → junior/mid/senior/lead alignment
    ├─ Bonus Skills         (10%)  → nice-to-have matches
    └─ Location Boost       (10%)  → UAE location presence
         │
         ▼
    Score 0–100 with explanation
    ├─ 80–100 → "Excellent Match"
    ├─ 60–79  → "Good Match"
    ├─ 40–59  → "Partial Match"
    └─ <40    → shown but ranked last
```

---

## 🤖 AI Career Chatbot

Hini includes an integrated AI career assistant powered by **Groq + llama-3.3-70b-versatile**.

**Architecture:**
```
User types message
       │
       ▼
App.jsx → POST /api/chat (Vercel serverless)
              │  body: { messages, model, max_tokens }
              │  header: x-groq-key (if user entered own key)
              ▼
          api/chat.js
          ├─ Uses GROQ_API_KEY (server env) — primary
          └─ Falls back to x-groq-key header — secondary
              │
              ▼
          api.groq.com → llama-3.3-70b-versatile
              │
              ▼
          Response → user's chat window
```

**System prompt enforces:**
- Career questions only (refuses cooking, coding homework, etc.)
- Provides job recommendations from live DB matches
- Considers uploaded resume context

---

## 🔒 Security Model

| Risk | Mitigation |
|---|---|
| `.env` in git | `.gitignore` blocks it; verified with `git log` |
| Groq key in browser | Moved to `/api/chat.js` serverless — never in bundle |
| Supabase write access | Service key only in GitHub Secrets; anon key is read-only |
| SQL injection | Supabase RLS + parameterized queries via the SDK |
| Resume data privacy | Parsed entirely client-side; never uploaded to any server |
| Data theft via anon key | RLS ensures anon users can only SELECT active jobs |

---

## 🗄️ Database Schema

See [`supabase_schema.sql`](supabase_schema.sql) for the full schema.

### `jobs` table

| Column | Type | Description |
|---|---|---|
| `job_hash` | TEXT (PK) | MD5 of `title\|company` — deduplication key |
| `title` | TEXT | Job title (cleaned) |
| `company` | TEXT | Company name |
| `location` | TEXT | Normalized UAE location |
| `url` | TEXT | Source URL |
| `apply_url` | TEXT | Direct application URL |
| `source` | TEXT | `linkedin`, `indeed`, `google`, `bayt`, `naukrigulf`, `gulftalent` |
| `posted_at` | TIMESTAMPTZ | When the job was posted |
| `first_seen` | TIMESTAMPTZ | When Hini first scraped it |
| `description` | TEXT | Full job description (max 5000 chars) |
| `active` | BOOLEAN | `false` after 7 days — hidden from feed |

---

## 📡 GitHub Actions Automation

### `scrape.yml` — Main Scraper
```
Trigger: Every 6 hours (00:20, 06:20, 12:20, 18:20 UTC)
        + Manual dispatch from GitHub UI

Runtime: Ubuntu Latest, Python 3.12
Secrets: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY
Timeout: 60 minutes
Concurrency: 1 (cancels overlapping runs)
```

### `keepalive.yml` — Workflow Heartbeat
```
Trigger: 1st of every month

Purpose: Prevents GitHub from auto-disabling scheduled
         workflows after 60 days of repository inactivity.
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to help:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Test** your changes locally with `npm run dev` and `python run_all.py --dry`
4. **Commit**: `git commit -m "feat: your feature description"`
5. **Push** and open a **Pull Request**

### Ideas for Contributions
- 🌍 Add new job sources (Dubizzle Jobs, LinkedIn UAE RSS, etc.)
- 🧪 Add unit tests for the ATS scoring engine
- 📱 Improve mobile responsiveness
- 🌐 Add Arabic language support
- 📊 Build a dashboard showing historical job trends

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for UAE tech job seekers**

If this project helped you land a job, please ⭐ star the repo!

[🌐 Live App](https://uae-jobs-hub.vercel.app) · [🐛 Report Bug](https://github.com/Rajapandi03/uae-job-hub/issues) · [💡 Request Feature](https://github.com/Rajapandi03/uae-job-hub/issues)

</div>
