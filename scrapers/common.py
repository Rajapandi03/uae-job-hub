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


# ---------------------------------------------------------------------------
# Remove duplicate jobs based on title and company
# ---------------------------------------------------------------------------
def remove_duplicates():
    """
    Finds currently active jobs and marks duplicates as inactive.
    Duplicates are identified by having the same sanitized title and company.
    """
    sb = get_supabase()
    
    limit = 1000
    offset = 0
    all_jobs = []
    
    logger.info("Fetching active jobs to check for duplicates...")
    while True:
        res = (
            sb.table("jobs")
            .select("job_hash, title, company, posted_at, first_seen")
            .eq("active", True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        data = res.data
        if not data:
            break
        all_jobs.extend(data)
        if len(data) < limit:
            break
        offset += limit
        
    if not all_jobs:
        logger.info("No active jobs to deduplicate.")
        return 0
        
    import re
    from collections import defaultdict
    
    def sanitize(text):
        if not text:
            return ""
        # Remove non-alphanumeric and standardize lowercase
        return re.sub(r'[^a-z0-9]', '', str(text).lower())
        
    grouped = defaultdict(list)
    for job in all_jobs:
        comp = sanitize(job.get("company"))
        title = sanitize(job.get("title"))
        if not comp or not title:
            continue
        key = f"{comp}|{title}"
        grouped[key].append(job)
        
    duplicates_to_deactivate = []
    
    for key, jobs in grouped.items():
        if len(jobs) > 1:
            # Sort by posted_at (if available), then first_seen, keeping most recent
            def get_sort_key(j):
                pa = j.get("posted_at") or ""
                fs = j.get("first_seen") or ""
                return (pa, fs)
                
            jobs.sort(key=get_sort_key, reverse=True)
            # Keep the first (newest), deactivate the rest
            duplicates = [j["job_hash"] for j in jobs[1:]]
            duplicates_to_deactivate.extend(duplicates)
            
    if not duplicates_to_deactivate:
        logger.info("No duplicate jobs found.")
        return 0
        
    logger.info(f"Found {len(duplicates_to_deactivate)} duplicate jobs. Deactivating...")
    
    chunk_size = 100
    for i in range(0, len(duplicates_to_deactivate), chunk_size):
        chunk = duplicates_to_deactivate[i:i+chunk_size]
        try:
            sb.table("jobs").update({"active": False}).in_("job_hash", chunk).execute()
        except Exception as e:
            logger.error(f"Error deactivating duplicates chunk: {e}")
            
    logger.info("Duplicate jobs successfully deactivated.")
    return len(duplicates_to_deactivate)
