"""
resources_scraper.py - Auto-update Career Resources (News, Courses, Salary)
Runs three distinct scraping routines, each isolated in its own try/except block.

Usage:
    python resources_scraper.py           # execute all scrapers and update Supabase
    python resources_scraper.py --dry     # dry run mode (no database writes)
"""

import sys
import os
import json
import re
from datetime import datetime, timedelta, timezone
from time import mktime

# Load .env file if present (for local testing)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

from common import logger, get_supabase


# ---------------------------------------------------------------------------
# 1. News Scraper (Google News RSS for UAE AI/Jobs)
# ---------------------------------------------------------------------------
def run_news(dry_run: bool = False) -> int:
    """Fetch UAE AI/Tech news via Google News RSS, upsert items, and purge rows >30 days old."""
    logger.info("=== Starting News Scraper (Google News RSS) ===")
    count = 0
    try:
        import feedparser

        rss_url = "https://news.google.com/rss/search?q=UAE+AI+jobs+technology&hl=en-AE&gl=AE&ceid=AE:en"
        logger.info(f"Fetching RSS feed: {rss_url}")
        feed = feedparser.parse(rss_url)

        items = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for entry in feed.entries:
            try:
                title = getattr(entry, "title", "").strip()
                link = getattr(entry, "link", "").strip()
                if not title or not link:
                    continue

                source_name = "Google News"
                if hasattr(entry, "source") and hasattr(entry.source, "title"):
                    source_name = entry.source.title.strip()

                # Parse published date if available
                published_at = now_iso
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    dt = datetime.fromtimestamp(mktime(entry.published_parsed), timezone.utc)
                    published_at = dt.isoformat()

                item = {
                    "type": "news",
                    "title": title,
                    "summary": None,  # Do not copy article body
                    "link": link,
                    "source": source_name,
                    "price_text": None,
                    "published_at": published_at,
                    "updated_at": now_iso,
                }
                items.append(item)
            except Exception as e:
                logger.debug(f"Error parsing news entry: {e}")
                continue

        logger.info(f"Parsed {len(items)} news headlines.")

        if dry_run:
            logger.info(f"[DRY RUN] Would upsert {len(items)} news items.")
            count = len(items)
        else:
            if items:
                sb = get_supabase()
                res = sb.table("resource_items").upsert(items, on_conflict="link").execute()
                count = len(res.data) if res.data else 0
                logger.info(f"Upserted {count} news items to Supabase.")

                # Cleanup news items older than 30 days
                cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
                del_res = (
                    sb.table("resource_items")
                    .delete()
                    .eq("type", "news")
                    .lt("published_at", cutoff)
                    .execute()
                )
                deleted_count = len(del_res.data) if del_res.data else 0
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} news items older than 30 days.")

    except Exception as e:
        logger.error(f"run_news failed: {e}")

    return count


# ---------------------------------------------------------------------------
# 2. Courses Scraper (Official Cloud & AI Certification pages via Scrapling)
# ---------------------------------------------------------------------------
def run_courses(dry_run: bool = False) -> int:
    """Fetch AI certification info from Google Cloud, AWS, Microsoft, and DeepLearning.AI."""
    logger.info("=== Starting Courses Scraper (Scrapling) ===")
    count = 0
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=False)
        items = []
        now_iso = datetime.now(timezone.utc).isoformat()

        targets = [
            {
                "source": "Google Cloud",
                "url": "https://cloud.google.com/learn/certification/machine-learning-engineer",
                "default_title": "Google Cloud Certified Professional Machine Learning Engineer",
                "summary": "Design, build, and productionize ML models using Google Cloud technologies.",
                "price": "$200 USD",
            },
            {
                "source": "AWS",
                "url": "https://aws.amazon.com/certification/certified-machine-learning-specialty/",
                "default_title": "AWS Certified Machine Learning - Specialty",
                "summary": "Validates expertise in building, training, tuning, and deploying ML models on AWS.",
                "price": "$300 USD",
            },
            {
                "source": "Microsoft Azure",
                "url": "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/",
                "default_title": "Microsoft Certified: Azure AI Engineer Associate",
                "summary": "Build, manage, and deploy AI solutions leveraging Azure AI services.",
                "price": "$165 USD",
            },
            {
                "source": "DeepLearning.AI",
                "url": "https://www.deeplearning.ai/courses/deep-learning-specialization/",
                "default_title": "DeepLearning.AI Deep Learning Specialization",
                "summary": "Master Neural Networks, CNNs, Sequence Models, and Transformers by Andrew Ng.",
                "price": None,  # Price unknown / audit free, never guess
            },
        ]

        for target in targets:
            try:
                logger.info(f"Fetching course page for {target['source']}...")
                page = fetcher.get(target["url"], timeout=15)
                title = target["default_title"]
                price_text = target["price"]

                if page and page.status == 200:
                    # Attempt to extract h1 title if present
                    h1 = page.css_first("h1")
                    if h1 and h1.text.strip():
                        extracted_title = h1.text.strip()
                        # Sanity check title length
                        if 10 < len(extracted_title) < 120:
                            title = extracted_title

                    # Extract price if explicitly visible in text, else keep target price (null if unknown)
                    body_text = page.text if hasattr(page, "text") else ""
                    match = re.search(r"(\$\d{2,4}\s*(?:USD)?)", body_text)
                    if match and not price_text:
                        price_text = match.group(1)

                item = {
                    "type": "course",
                    "title": title,
                    "summary": target["summary"],
                    "link": target["url"],
                    "source": target["source"],
                    "price_text": price_text,
                    "published_at": now_iso,
                    "updated_at": now_iso,
                }
                items.append(item)

            except Exception as e:
                logger.warning(f"Failed to scrape course from {target['source']}: {e}")
                # Fallback to predefined verified target metadata
                items.append({
                    "type": "course",
                    "title": target["default_title"],
                    "summary": target["summary"],
                    "link": target["url"],
                    "source": target["source"],
                    "price_text": target["price"],
                    "published_at": now_iso,
                    "updated_at": now_iso,
                })

        logger.info(f"Prepared {len(items)} course resources.")

        if dry_run:
            logger.info(f"[DRY RUN] Would upsert {len(items)} course items.")
            count = len(items)
        else:
            if items:
                sb = get_supabase()
                res = sb.table("resource_items").upsert(items, on_conflict="link").execute()
                count = len(res.data) if res.data else 0
                logger.info(f"Upserted {count} course items to Supabase.")

    except Exception as e:
        logger.error(f"run_courses failed: {e}")

    return count


# ---------------------------------------------------------------------------
# 3. Salary Scraper (Reads salary_config.json and updates resource_items)
# ---------------------------------------------------------------------------
def run_salary(dry_run: bool = False) -> int:
    """Read salary_config.json and update the salary benchmark rows in resource_items."""
    logger.info("=== Starting Salary Report Updater ===")
    count = 0
    try:
        config_path = os.path.join(os.path.dirname(__file__), "salary_config.json")
        if not os.path.exists(config_path):
            logger.error(f"Salary config file not found at {config_path}")
            return 0

        with open(config_path, "r", encoding="utf-8") as f:
            salary_data = json.load(f)

        now_iso = datetime.now(timezone.utc).isoformat()
        items = []

        for entry in salary_data:
            title = entry.get("title", "").strip()
            min_aed = entry.get("min_aed", 0)
            max_aed = entry.get("max_aed", 0)
            source = entry.get("source", "UAE Market Survey 2026")
            summary = entry.get("summary", "")

            if not title:
                continue

            price_text = f"{min_aed:,} - {max_aed:,} AED / month"
            # Unique deterministic link key for upserting
            link_key = f"salary-{title.lower().replace(' ', '-').replace('/', '-')}"

            item = {
                "type": "salary",
                "title": title,
                "summary": summary,
                "link": link_key,
                "source": source,
                "price_text": price_text,
                "published_at": now_iso,
                "updated_at": now_iso,
            }
            items.append(item)

        logger.info(f"Loaded {len(items)} salary benchmarks from config.")

        if dry_run:
            logger.info(f"[DRY RUN] Would upsert {len(items)} salary benchmark items.")
            count = len(items)
        else:
            if items:
                sb = get_supabase()
                res = sb.table("resource_items").upsert(items, on_conflict="link").execute()
                count = len(res.data) if res.data else 0
                logger.info(f"Upserted {count} salary benchmark items to Supabase.")

    except Exception as e:
        logger.error(f"run_salary failed: {e}")

    return count


# ---------------------------------------------------------------------------
# Main Execution / Local Testing
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    dry = "--dry" in sys.argv
    logger.info(f"Running resources scraper (DRY RUN = {dry})...")
    news_cnt = run_news(dry_run=dry)
    course_cnt = run_courses(dry_run=dry)
    salary_cnt = run_salary(dry_run=dry)
    logger.info(f"Resource scraping finished. News: {news_cnt}, Courses: {course_cnt}, Salary: {salary_cnt}")
