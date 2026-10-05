"""
run_all.py - Master runner for all scrapers.
Each scraper runs in its own try/except so one failure never stops the others.

Usage:
    python run_all.py           # full run, writes to Supabase
    python run_all.py --dry     # dry run, no DB writes

Environment variables required:
    SUPABASE_URL, SUPABASE_SERVICE_KEY
    GEMINI_API_KEY (optional, for career pages)
"""

import sys
import os
import time
from datetime import datetime, timezone

# Load .env file if present (for local development)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

from common import logger, deactivate_stale_jobs, remove_duplicates

DRY_RUN = "--dry" in sys.argv


def main():
    start = time.time()
    logger.info("=" * 60)
    logger.info("UAE JobHub - Scraper Run")
    logger.info(f"Mode: {'DRY RUN' if DRY_RUN else 'PRODUCTION'}")
    logger.info("=" * 60)

    all_counts = {}

    # Phase 1: JobSpy (LinkedIn, Indeed, Google, Bayt)
    logger.info("\n>>> Phase 1: JobSpy (LinkedIn, Indeed, Google, Bayt)")
    try:
        from jobspy_scraper import run as run_jobspy
        counts = run_jobspy(dry_run=DRY_RUN)
        all_counts.update(counts)
    except Exception as e:
        logger.error(f"JobSpy phase failed: {e}")

    # Phase 2: Scrapling (Naukrigulf, GulfTalent)
    logger.info("\n>>> Phase 2: Scrapling (Naukrigulf, GulfTalent)")
    try:
        from scrapling_scraper import run as run_scrapling
        counts = run_scrapling(dry_run=DRY_RUN)
        all_counts.update(counts)
    except Exception as e:
        logger.error(f"Scrapling phase failed: {e}")

    # Phase 3: Career Pages (ScrapeGraphAI) - only if GEMINI_API_KEY is set
    logger.info("\n>>> Phase 3: Career Pages (ScrapeGraphAI)")
    try:
        from career_pages import run as run_careers
        counts = run_careers(dry_run=DRY_RUN)
        all_counts.update(counts)
    except Exception as e:
        logger.error(f"Career pages phase failed: {e}")

    # Deactivate stale jobs
    if not DRY_RUN:
        logger.info("\n>>> Deactivating stale jobs (>7 days)")
        try:
            deactivate_stale_jobs(days=7)
        except Exception as e:
            logger.error(f"Stale job cleanup failed: {e}")
            
        logger.info("\n>>> Removing duplicate jobs")
        try:
            remove_duplicates()
        except Exception as e:
            logger.error(f"Duplicate cleanup failed: {e}")

    # ---------------------------------------------------------------
    # Phase 4: Resources (News, Courses, Salary)
    # Runs AFTER all job scrapers. A failure here never stops jobs.
    # ---------------------------------------------------------------
    logger.info("\n>>> Phase 4: Career Resources")
    now_utc = datetime.now(timezone.utc)
    resource_counts = {}

    # 4a. News - runs every time
    try:
        from resources_scraper import run_news
        cnt = run_news(dry_run=DRY_RUN)
        resource_counts["news"] = cnt
    except Exception as e:
        logger.error(f"Resource news scraper failed: {e}")

    # 4b. Courses - only on Mondays (weekday 0)
    if now_utc.weekday() == 0:
        try:
            from resources_scraper import run_courses
            cnt = run_courses(dry_run=DRY_RUN)
            resource_counts["courses"] = cnt
        except Exception as e:
            logger.error(f"Resource courses scraper failed: {e}")
    else:
        logger.info("  Courses scraper skipped (only runs on Mondays).")

    # 4c. Salary - only on the 1st of the month
    if now_utc.day == 1:
        try:
            from resources_scraper import run_salary
            cnt = run_salary(dry_run=DRY_RUN)
            resource_counts["salary"] = cnt
        except Exception as e:
            logger.error(f"Resource salary scraper failed: {e}")
    else:
        logger.info("  Salary scraper skipped (only runs on the 1st).")


    # Summary
    elapsed = time.time() - start
    logger.info("\n" + "=" * 60)
    logger.info("SCRAPE COMPLETE")
    logger.info(f"Total time: {elapsed:.1f}s")
    total = sum(all_counts.values())
    logger.info(f"Total unique jobs: {total}")
    for src, cnt in sorted(all_counts.items()):
        logger.info(f"  {src}: {cnt}")
    if resource_counts:
        logger.info(f"Resources: {resource_counts}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
