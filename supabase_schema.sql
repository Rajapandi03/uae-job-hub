-- ============================================================
-- UAE JobHub - Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create the jobs table
CREATE TABLE IF NOT EXISTS jobs (
    job_hash     TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    company      TEXT NOT NULL,
    location     TEXT NOT NULL,
    url          TEXT NOT NULL,
    apply_url    TEXT,
    source       TEXT NOT NULL CHECK (source IN (
        'linkedin', 'indeed', 'google', 'bayt',
        'naukrigulf', 'gulftalent', 'career_page'
    )),
    posted_at    TIMESTAMPTZ,
    first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
    description  TEXT,
    active       BOOLEAN NOT NULL DEFAULT true
);

-- 2. Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_active       ON jobs (active);
CREATE INDEX IF NOT EXISTS idx_jobs_source       ON jobs (source);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at    ON jobs (posted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen   ON jobs (first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_location     ON jobs (location);

-- 3. Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 4. Public read-only policy (uses the anon key)
CREATE POLICY "Public can read active jobs"
    ON jobs
    FOR SELECT
    USING (true);

-- 5. Service-role write policy (only the service_role key can insert/update/delete)
CREATE POLICY "Service role can manage jobs"
    ON jobs
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
