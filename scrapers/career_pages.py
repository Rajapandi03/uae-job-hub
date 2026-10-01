"""
career_pages.py - Phase 3: Scrape company career pages using ScrapeGraphAI.
Requires GEMINI_API_KEY env var for the free Gemini LLM tier.

Usage:
    python career_pages.py          # scrape and upsert
    python career_pages.py --dry    # dry run
"""

import sys
import time
import random

from common import normalize_job, upsert_jobs, logger

# Company career page configs - add more as needed
CAREER_PAGES = [
    {"company": "Emirates Group",    "url": "https://www.emiratesgroupcareers.com/search-and-apply/"},
    {"company": "Majid Al Futtaim", "url": "https://careers.majidalfuttaim.com/search/"},
    {"company": "etisalat (e&)",     "url": "https://careers.eand.com/search/"},
    {"company": "ENOC",              "url": "https://www.enoc.com/en/careers"},
    {"company": "Dubai Holding",     "url": "https://www.dubaiholding.com/en/careers/"},
]


def run(dry_run: bool = False) -> dict:
    """
    Phase 3 placeholder. ScrapeGraphAI requires:
      pip install scrapegraphai
      GEMINI_API_KEY env var

    This scraper uses ScrapeGraphAI's SmartScraperGraph to extract
    structured job listings from each career page URL.
    """
    logger.info("=== Career Pages (ScrapeGraphAI) ===")
    logger.info("Phase 3 - requires GEMINI_API_KEY. Skipping if not configured.")

    import os
    if not os.environ.get("GEMINI_API_KEY"):
        logger.warning("GEMINI_API_KEY not set. Skipping career page scraping.")
        return {}

    all_jobs = []
    seen_hashes = set()

    try:
        from scrapegraphai.graphs import SmartScraperGraph

        for config in CAREER_PAGES:
            try:
                logger.info(f"  Scraping: {config['company']} - {config['url']}")

                graph = SmartScraperGraph(
                    prompt=(
                        "Extract all job listings from this page. "
                        "For each job, return: title, location, url (link to the job). "
                        "Return as a list of objects with keys: title, location, url."
                    ),
                    source=config["url"],
                    config={
                        "llm": {
                            "model": "gemini/gemini-2.0-flash",
                            "api_key": os.environ["GEMINI_API_KEY"],
                        },
                    },
                )

                result = graph.run()

                if isinstance(result, dict) and "jobs" in result:
                    listings = result["jobs"]
                elif isinstance(result, list):
                    listings = result
                else:
                    listings = []

                logger.info(f"    -> {len(listings)} jobs extracted")

                for item in listings:
                    title = item.get("title", "").strip()
                    loc = item.get("location", "UAE").strip()
                    url = item.get("url", config["url"]).strip()

                    if not title:
                        continue

                    job = normalize_job(
                        title=title,
                        company=config["company"],
                        location=loc,
                        url=url,
                        source="career_page",
                    )
                    if job["job_hash"] not in seen_hashes:
                        seen_hashes.add(job["job_hash"])
                        all_jobs.append(job)

                time.sleep(random.uniform(3, 6))

            except Exception as e:
                logger.error(f"  Career page error for {config['company']}: {e}")
                continue

    except ImportError:
        logger.error("scrapegraphai not installed. Run: pip install scrapegraphai")
    except Exception as e:
        logger.error(f"Career pages scraper failed: {e}")

    counts = {}
    for j in all_jobs:
        counts[j["source"]] = counts.get(j["source"], 0) + 1

    logger.info(f"Career pages totals: {len(all_jobs)} jobs")

    if dry_run:
        logger.info("DRY RUN.")
    elif all_jobs:
        upserted = upsert_jobs(all_jobs)
        logger.info(f"Upserted {upserted} career page jobs to Supabase.")

    return counts


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    run(dry_run=dry)
