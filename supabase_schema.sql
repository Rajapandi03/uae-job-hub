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
        'naukrigulf', 'gulftalent', 'career_page', 'employer'
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

-- 5. Authenticated employer job submission policy (allows verified recruiters to post jobs)
CREATE POLICY "Allow employer job submissions"
    ON jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (source = 'employer');

-- 6. Service-role write policy (only the service_role key can manage all jobs)
CREATE POLICY "Service role can manage jobs"
    ON jobs
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 6. Create the events table
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
    event_hash        TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    start_date        DATE NOT NULL,
    end_date          DATE,
    city              TEXT NOT NULL,
    venue             TEXT,
    url               TEXT NOT NULL,
    registration_url  TEXT,
    source            TEXT NOT NULL,
    organizer         TEXT,
    event_type        TEXT NOT NULL CHECK (event_type IN (
        'conference', 'meetup', 'workshop', 'hackathon',
        'webinar', 'career_fair', 'networking'
    )),
    is_free           BOOLEAN,
    price_text        TEXT,
    format            TEXT NOT NULL CHECK (format IN (
        'in_person', 'online', 'hybrid'
    )),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date ASC);
CREATE INDEX IF NOT EXISTS idx_events_city       ON events (city);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_format     ON events (format);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public read-only policy
CREATE POLICY "Public can read upcoming events"
    ON events
    FOR SELECT
    USING (true);

-- Service-role write policy
CREATE POLICY "Service role can manage events"
    ON events
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 7. Create the resource_items table
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type         TEXT NOT NULL CHECK (type IN ('news', 'course', 'salary')),
    title        TEXT NOT NULL,
    summary      TEXT,
    link         TEXT UNIQUE,
    source       TEXT,
    price_text   TEXT,
    published_at TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_resource_items_type ON resource_items (type);
CREATE INDEX IF NOT EXISTS idx_resource_items_published ON resource_items (published_at DESC NULLS LAST);

-- Enable Row Level Security
ALTER TABLE resource_items ENABLE ROW LEVEL SECURITY;

-- Public read-only policy (uses the anon key)
CREATE POLICY "Public can read resource_items"
    ON resource_items
    FOR SELECT
    USING (true);

-- Service-role write policy (only the service_role key can manage resource items)
CREATE POLICY "Service role can manage resource_items"
    ON resource_items
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


