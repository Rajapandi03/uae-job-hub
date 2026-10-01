"""
scrapling_scraper.py - Phase 2: Scrape Naukrigulf and GulfTalent using Scrapling.
Uses Fetcher for simple HTTP and StealthyFetcher if blocked.

Usage:
    python scrapling_scraper.py          # scrape and upsert
    python scrapling_scraper.py --dry    # scrape and print, no DB write
"""

import sys
import time
import random
import re
from datetime import datetime, timedelta, timezone

from common import normalize_job, upsert_jobs, logger

# ---------------------------------------------------------------------------
# Naukrigulf scraper
# ---------------------------------------------------------------------------
def scrape_naukrigulf() -> list[dict]:
    """Scrape Naukrigulf UAE IT jobs using Scrapling Fetcher."""
    jobs = []
    try:
        from scrapling import Fetcher

        search_terms = ["AI+engineer", "machine+learning", "data+scientist", "python+developer"]
        fetcher = Fetcher(auto_match=False)

        for term in search_terms:
            try:
                url = f"https://www.naukrigulf.com/jobs-in-uae?searchQuery={term}&sort=date"
                logger.info(f"  Naukrigulf: fetching '{term}'")
                page = fetcher.get(url, timeout=15)

                if not page or page.status != 200:
                    logger.warning(f"  Naukrigulf: status {getattr(page, 'status', 'None')} for '{term}'")
                    continue

                # Naukrigulf job cards are in article or div elements with job data
                cards = page.css(".srp-tuple") or page.css("article.tuple") or []
                logger.info(f"    -> {len(cards)} cards found")

                for card in cards:
                    try:
                        title_el = card.css_first(".desig, .designation, h2 a")
                        company_el = card.css_first(".comp-name, .company-name, .tuple-header a")
                        location_el = card.css_first(".loc, .location, .tuple-footer span")
                        link_el = card.css_first("a[href]")

                        title = title_el.text.strip() if title_el else None
                        company = company_el.text.strip() if company_el else None
                        loc = location_el.text.strip() if location_el else "UAE"
                        href = link_el.attrib.get("href", "") if link_el else ""

                        if not title or not company:
                            continue

                        if href and not href.startswith("http"):
                            href = f"https://www.naukrigulf.com{href}"

                        job = normalize_job(
                            title=title,
                            company=company,
                            location=loc,
                            url=href or url,
                            source="naukrigulf",
                        )
                        jobs.append(job)
                    except Exception as e:
                        logger.debug(f"    Card parse error: {e}")
                        continue

                time.sleep(random.uniform(2, 4))

            except Exception as e:
                logger.error(f"  Naukrigulf error for '{term}': {e}")
                continue

    except ImportError:
        logger.error("Scrapling not installed. Run: pip install scrapling")
    except Exception as e:
        logger.error(f"Naukrigulf scraper failed: {e}")

    return jobs


# ---------------------------------------------------------------------------
# GulfTalent scraper
# ---------------------------------------------------------------------------
def scrape_gulftalent() -> list[dict]:
    """Scrape GulfTalent UAE IT jobs using Scrapling."""
    jobs = []
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=False)
        search_terms = ["artificial-intelligence", "machine-learning", "data-science", "software-engineer"]

        for term in search_terms:
            try:
                url = f"https://www.gulftalent.com/uae/jobs/s/{term}"
                logger.info(f"  GulfTalent: fetching '{term}'")
                page = fetcher.get(url, timeout=15)

                if not page or page.status != 200:
                    logger.warning(f"  GulfTalent: status {getattr(page, 'status', 'None')} for '{term}'")
                    continue

                # GulfTalent uses div.job-listing or similar
                cards = page.css(".job-listing, .result-item, .job-card") or []
                logger.info(f"    -> {len(cards)} cards found")

                for card in cards:
                    try:
                        title_el = card.css_first("h2 a, .job-title a, a.title")
                        company_el = card.css_first(".company, .employer, .company-name")
                        location_el = card.css_first(".location, .loc")
                        link_el = card.css_first("a[href]")

                        title = title_el.text.strip() if title_el else None
                        company = company_el.text.strip() if company_el else None
                        loc = location_el.text.strip() if location_el else "UAE"
                        href = link_el.attrib.get("href", "") if link_el else ""

                        if not title or not company:
                            continue

                        if href and not href.startswith("http"):
                            href = f"https://www.gulftalent.com{href}"

                        job = normalize_job(
                            title=title,
                            company=company,
                            location=loc,
                            url=href or url,
                            source="gulftalent",
                        )
                        jobs.append(job)
                    except Exception as e:
                        logger.debug(f"    Card parse error: {e}")
                        continue

                time.sleep(random.uniform(2, 4))

            except Exception as e:
                logger.error(f"  GulfTalent error for '{term}': {e}")
                continue

    except ImportError:
        logger.error("Scrapling not installed. Run: pip install scrapling")
    except Exception as e:
        logger.error(f"GulfTalent scraper failed: {e}")

    return jobs


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def run(dry_run: bool = False) -> dict:
    """Run all Scrapling-based scrapers. Returns {source: count}."""
    all_jobs = []
    seen_hashes = set()

    # Naukrigulf
    logger.info("=== Naukrigulf ===")
    try:
        naukri_jobs = scrape_naukrigulf()
        for job in naukri_jobs:
            if job["job_hash"] not in seen_hashes:
                seen_hashes.add(job["job_hash"])
                all_jobs.append(job)
    except Exception as e:
        logger.error(f"Naukrigulf scraper crashed: {e}")

    # GulfTalent
    logger.info("=== GulfTalent ===")
    try:
        gulf_jobs = scrape_gulftalent()
        for job in gulf_jobs:
            if job["job_hash"] not in seen_hashes:
                seen_hashes.add(job["job_hash"])
                all_jobs.append(job)
    except Exception as e:
        logger.error(f"GulfTalent scraper crashed: {e}")

    # Count per source
    counts = {}
    for j in all_jobs:
        counts[j["source"]] = counts.get(j["source"], 0) + 1

    logger.info(f"Scrapling totals: {len(all_jobs)} jobs")
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
