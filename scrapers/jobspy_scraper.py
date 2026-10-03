"""
jobspy_scraper.py - Scrapes LinkedIn, Indeed, Google Jobs, and Bayt for UAE jobs
using the python-jobspy library.

Usage:
    python jobspy_scraper.py          # scrape and upsert to Supabase
    python jobspy_scraper.py --dry    # scrape and print, no DB write
"""

import sys
import time
import random
from datetime import datetime, timezone

from jobspy import scrape_jobs
from common import normalize_job, upsert_jobs, logger, is_relevant_tech_job, is_strict_uae_job, clean_string

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SEARCH_TERMS = [
    # --- AI & Automation (Primary Focus) ---
    "AI engineer",
    "junior AI engineer",
    "AI intern",
    "AI developer",
    "AI architect",
    "AI researcher",
    "AI product manager",
    "generative AI",
    "GenAI engineer",
    "LLM engineer",
    "prompt engineer",
    "machine learning engineer",
    "junior machine learning engineer",
    "graduate machine learning",
    "deep learning engineer",
    "NLP engineer",
    "natural language processing",
    "computer vision engineer",
    "MLOps engineer",
    "AI automation engineer",
    "RPA developer",
    "robotics engineer",
    "data scientist",
    "junior data scientist",
    "data analyst",
    "data engineer",
    "AI solutions architect",
    "conversational AI",
    "AI consultant",
    # --- Other IT Jobs (Secondary) ---
    "python developer",
    "full stack developer",
    "software engineer",
    "cloud engineer",
    "DevOps engineer",
    "cybersecurity analyst",
    "backend developer",
    "frontend developer",
]

LOCATIONS = ["Dubai", "Abu Dhabi", "Sharjah", "UAE"]

# Sites supported by JobSpy for UAE
# linkedin, indeed, google, bayt (bayt is built into JobSpy)
SITES = ["indeed", "linkedin", "google", "bayt"]

HOURS_OLD = 24          # only jobs posted in the last 24 hours
RESULTS_PER_QUERY = 25  # per site per search term


# ---------------------------------------------------------------------------
# Scrape one search term + location combo
# ---------------------------------------------------------------------------
def scrape_combo(search_term: str, location: str) -> list[dict]:
    """Run JobSpy for one search_term/location pair. Returns normalized jobs."""
    jobs_out = []
    try:
        logger.info(f"  JobSpy: '{search_term}' in '{location}'")
        df = scrape_jobs(
            site_name=SITES,
            search_term=search_term,
            location=location,
            results_wanted=RESULTS_PER_QUERY,
            hours_old=HOURS_OLD,
            country_indeed="United Arab Emirates",
            fetch_description=False,   # avoid heavy rate limits
            verbose=0,
        )

        if df is None or df.empty:
            logger.info(f"    -> 0 results")
            return jobs_out

        logger.info(f"    -> {len(df)} results")

        for _, row in df.iterrows():
            title = str(row.get("title", "")).strip()
            company = str(row.get("company", "")).strip()
            if not title or not company or title == "nan" or company == "nan":
                continue

            # Build location string
            city = str(row.get("city", "")).strip()
            state = str(row.get("state", "")).strip()
            loc_parts = [p for p in [city, state] if p and p != "nan"]
            loc = ", ".join(loc_parts) if loc_parts else location

            # Determine source from site column
            site = str(row.get("site", "")).strip().lower()
            source_map = {
                "indeed": "indeed",
                "linkedin": "linkedin",
                "google": "google",
                "zip_recruiter": "indeed",   # fallback
                "bayt": "bayt",
            }
            source = source_map.get(site, "indeed")

            # URL
            job_url = str(row.get("job_url", "")).strip()
            if not job_url or job_url == "nan":
                continue

            # Apply URL: use job_url_direct if present (direct employer link)
            apply_url = str(row.get("job_url_direct", "")).strip()
            if not apply_url or apply_url == "nan":
                apply_url = job_url

            # Posted date
            # JobSpy often returns date-only values (e.g. "2026-10-02") without time.
            # This causes midnight UTC timestamps, making "X hours ago" wildly inaccurate.
            # Fix: if the date is today (date-only), use current timestamp for accuracy.
            posted_at = None
            date_posted = row.get("date_posted")
            if date_posted is not None and str(date_posted) != "nan" and str(date_posted) != "NaT":
                try:
                    if hasattr(date_posted, "isoformat"):
                        date_str = date_posted.isoformat()
                    else:
                        date_str = str(date_posted).strip()

                    # Detect date-only values (no 'T' means no time component)
                    # e.g. "2026-10-02" or "2026-10-02 00:00:00"
                    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    is_date_only = ('T' not in date_str) or date_str.endswith("T00:00:00") or date_str.endswith("00:00:00+00:00")

                    if is_date_only and date_str[:10] == today_str:
                        # Today's job but no time info — use current timestamp
                        posted_at = datetime.now(timezone.utc).isoformat()
                    elif is_date_only:
                        # Older date-only — set to noon UTC to reduce error
                        posted_at = date_str[:10] + "T12:00:00+00:00"
                    else:
                        posted_at = date_str
                except Exception:
                    posted_at = None

            # Description
            desc = str(row.get("description", "")).strip()
            if desc == "nan":
                desc = None

            if not is_relevant_tech_job(title, desc or ""):
                continue

            if not is_strict_uae_job(loc, job_url, apply_url):
                logger.info(f"    -> Rejecting non-UAE job: {title} @ {company} [{loc}] [{job_url}]")
                continue

            job = normalize_job(
                title=title,
                company=company,
                location=loc,
                url=job_url,
                source=source,
                description=desc,
                posted_at=posted_at,
                apply_url=apply_url,
            )
            jobs_out.append(job)

    except Exception as e:
        logger.error(f"  JobSpy error for '{search_term}' in '{location}': {e}")

    return jobs_out


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def run(dry_run: bool = False) -> dict:
    """Run all JobSpy scrapes. Returns {source: count} dict."""
    all_jobs = []
    seen_hashes = set()

    for term in SEARCH_TERMS:
        for loc in LOCATIONS:
            combo_jobs = scrape_combo(term, loc)
            for job in combo_jobs:
                if job["job_hash"] not in seen_hashes:
                    seen_hashes.add(job["job_hash"])
                    all_jobs.append(job)
            # Polite delay: 2-5 seconds between queries
            delay = random.uniform(2, 5)
            logger.info(f"  Sleeping {delay:.1f}s...")
            time.sleep(delay)

    # Count per source
    counts = {}
    for j in all_jobs:
        counts[j["source"]] = counts.get(j["source"], 0) + 1

    logger.info(f"JobSpy totals (deduplicated): {len(all_jobs)} jobs")
    for src, cnt in sorted(counts.items()):
        logger.info(f"  {src}: {cnt}")

    if dry_run:
        logger.info("DRY RUN - not writing to database.")
        for j in all_jobs[:5]:
            logger.info(f"  Sample: {j['title']} @ {j['company']} [{j['source']}]")
    else:
        upserted = upsert_jobs(all_jobs)
        logger.info(f"Upserted {upserted} jobs to Supabase.")

    return counts


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    run(dry_run=dry)
