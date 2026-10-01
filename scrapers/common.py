"""
common.py - Shared utilities for all scrapers.
Provides: normalized job format, hashing, deduplication, Supabase upsert.
"""

import hashlib
import os
import logging
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("uae_jobs")

# ---------------------------------------------------------------------------
# Supabase client (uses service key for writes)
# ---------------------------------------------------------------------------
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set as environment variables."
        )
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Job hash: deterministic primary key from title|company|location
# ---------------------------------------------------------------------------
def make_job_hash(title: str, company: str, location: str) -> str:
    raw = f"{title.strip().lower()}|{company.strip().lower()}|{location.strip().lower()}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Normalized job dict (every scraper must return a list of these)
# ---------------------------------------------------------------------------
def normalize_job(
    title: str,
    company: str,
    location: str,
    url: str,
    source: str,
    description: str = None,
    posted_at: str = None,      # ISO-8601 string or None
    apply_url: str = None,
) -> dict:
    """Return a dict matching the Supabase `jobs` table schema."""
    loc = location.strip() if location else "UAE"
    desc = (description[:3000] if description else None)
    return {
        "job_hash":    make_job_hash(title, company, loc),
        "title":       title.strip(),
        "company":     company.strip(),
        "location":    loc,
        "url":         url.strip(),
        "apply_url":   (apply_url.strip() if apply_url else url.strip()),
        "source":      source.lower(),
        "posted_at":   posted_at,
        "description": desc,
        "active":      True,
    }


# ---------------------------------------------------------------------------
# Upsert jobs into Supabase (insert or update on conflict)
# ---------------------------------------------------------------------------
def upsert_jobs(jobs: list[dict]) -> int:
    """Upsert a list of normalized job dicts. Returns count of upserted rows."""
    if not jobs:
        return 0
    sb = get_supabase()
    # Upsert: on conflict with job_hash, update everything EXCEPT first_seen
    # Supabase Python client supports upsert via on_conflict
    result = (
        sb.table("jobs")
        .upsert(
            jobs,
            on_conflict="job_hash",
            # first_seen has a DB default and we never send it, so it stays
        )
        .execute()
    )
    return len(result.data) if result.data else 0


# ---------------------------------------------------------------------------
# Mark stale jobs as inactive (older than 7 days)
# ---------------------------------------------------------------------------
def deactivate_stale_jobs(days: int = 7):
    sb = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = (
        sb.table("jobs")
        .update({"active": False})
        .lt("first_seen", cutoff)
        .eq("active", True)
        .execute()
    )
    count = len(result.data) if result.data else 0
    if count:
        logger.info(f"Deactivated {count} stale jobs (older than {days} days).")
    return count
