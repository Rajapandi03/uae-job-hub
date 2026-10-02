"""
scrapling_scraper.py - Phase 2: Scrape Naukrigulf and GulfTalent using Scrapling and HTTP fallback.
Uses Fetcher with realistic browser headers to bypass basic bot protection.

Usage:
    python scrapling_scraper.py          # scrape and upsert
    python scrapling_scraper.py --dry    # scrape and print, no DB write
"""

import sys
import time
import random
import re
import requests
from datetime import datetime, timezone

from common import normalize_job, upsert_jobs, logger, is_relevant_tech_job, clean_string, clean_location

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# ---------------------------------------------------------------------------
# Naukrigulf scraper
# ---------------------------------------------------------------------------
def scrape_naukrigulf() -> list[dict]:
    """Scrape Naukrigulf UAE IT & AI jobs."""
    jobs = []
    search_terms = [
        "AI+engineer",
        "junior+AI+engineer",
        "AI+intern",
        "machine+learning",
        "data+scientist",
        "junior+data+scientist",
        "python+developer",
    ]

    try:
        from scrapling import Fetcher
        fetcher = Fetcher(auto_match=False)
    except Exception:
        fetcher = None

    for term in search_terms:
        try:
            url = f"https://www.naukrigulf.com/jobs-in-uae?searchQuery={term}&sort=date"
            logger.info(f"  Naukrigulf: fetching '{term}'")

            html_content = ""
            if fetcher:
                try:
                    page = fetcher.get(url, timeout=15, headers=DEFAULT_HEADERS)
                    if page and page.status == 200:
                        html_content = page.html
                except Exception as e:
                    logger.debug(f"    Scrapling fetcher error: {e}")

            if not html_content:
                resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
                if resp.status_code == 200:
                    html_content = resp.text

            if not html_content:
                continue

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, "html.parser")
            cards = soup.select(".srp-tuple, article.tuple, .tuple, .job-tuple")
            logger.info(f"    -> {len(cards)} cards found")

            for card in cards:
                try:
                    title_el = card.select_one(".desig, .designation, h2 a, .tuple-title a")
                    company_el = card.select_one(".comp-name, .company-name, .tuple-header a, .info-org")
                    location_el = card.select_one(".loc, .location, .tuple-footer span, .info-loc")
                    link_el = card.select_one("a[href]")

                    title = title_el.get_text(strip=True) if title_el else None
                    company = company_el.get_text(strip=True) if company_el else None
                    loc = location_el.get_text(strip=True) if location_el else "UAE"
                    href = link_el.get("href", "") if link_el else ""

                    if not title or not company:
                        continue

                    if not is_relevant_tech_job(title):
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

    return jobs


# ---------------------------------------------------------------------------
# GulfTalent scraper
# ---------------------------------------------------------------------------
def scrape_gulftalent() -> list[dict]:
    """Scrape GulfTalent UAE IT & AI jobs."""
    jobs = []
    search_terms = [
        "artificial-intelligence",
        "junior-ai-engineer",
        "ai-intern",
        "machine-learning",
        "data-science",
        "junior-data-scientist",
        "software-engineer",
    ]

    try:
        from scrapling import Fetcher
        fetcher = Fetcher(auto_match=False)
    except Exception:
        fetcher = None

    for term in search_terms:
        try:
            url = f"https://www.gulftalent.com/uae/jobs/s/{term}"
            logger.info(f"  GulfTalent: fetching '{term}'")

            html_content = ""
            if fetcher:
                try:
                    page = fetcher.get(url, timeout=15, headers=DEFAULT_HEADERS)
                    if page and page.status == 200:
                        html_content = page.html
                except Exception as e:
                    logger.debug(f"    Scrapling fetcher error: {e}")

            if not html_content:
                resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
                if resp.status_code == 200:
                    html_content = resp.text

            if not html_content:
                continue

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, "html.parser")
            cards = soup.select(".job-listing, .result-item, .job-card, tr.job-row")
            logger.info(f"    -> {len(cards)} cards found")

            for card in cards:
                try:
                    title_el = card.select_one("h2 a, .job-title a, a.title, td a")
                    company_el = card.select_one(".company, .employer, .company-name")
                    location_el = card.select_one(".location, .loc")
                    link_el = card.select_one("a[href]")

                    title = title_el.get_text(strip=True) if title_el else None
                    company = company_el.get_text(strip=True) if company_el else None
                    loc = location_el.get_text(strip=True) if location_el else "UAE"
                    href = link_el.get("href", "") if link_el else ""

                    if not title or not company:
                        continue

                    if not is_relevant_tech_job(title):
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
