"""
cleanup_duplicates.py - One-time script to clean up existing duplicate jobs
in the Supabase database. This recalculates hashes using the new title+company
formula and deactivates duplicates.

Usage:
    python cleanup_duplicates.py          # run cleanup
    python cleanup_duplicates.py --dry    # dry run, no DB changes
"""

import sys
import os
import hashlib
import re
from collections import defaultdict

# Load .env file if present (for local development)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

from common import get_supabase, logger

DRY_RUN = "--dry" in sys.argv


def new_hash(title, company):
    """New hash formula: title + company only (no location)."""
    raw = f"{title.strip().lower()}|{company.strip().lower()}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def main():
    sb = get_supabase()
    
    # Fetch ALL active jobs
    logger.info("Fetching all active jobs...")
    limit = 1000
    offset = 0
    all_jobs = []
    
    while True:
        res = (
            sb.table("jobs")
            .select("job_hash, title, company, location, posted_at, first_seen")
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
    
    logger.info(f"Found {len(all_jobs)} active jobs total.")
    
    # Group by new hash (title + company only)
    grouped = defaultdict(list)
    for job in all_jobs:
        h = new_hash(job["title"], job["company"])
        grouped[h].append(job)
    
    # Find groups with duplicates
    duplicates_to_deactivate = []
    for h, jobs in grouped.items():
        if len(jobs) > 1:
            # Sort: keep the one with most specific location, then newest posted_at
            def sort_key(j):
                loc = j.get("location", "")
                # Prefer specific location over generic "UAE"
                specificity = 0 if loc.lower().strip() == "uae" else 1
                pa = j.get("posted_at") or ""
                fs = j.get("first_seen") or ""
                return (specificity, pa, fs)
            
            jobs.sort(key=sort_key, reverse=True)
            # Keep first (most specific location + newest), deactivate rest
            keeper = jobs[0]
            dupes = jobs[1:]
            
            logger.info(
                f"  DUPE GROUP: '{keeper['title']}' @ '{keeper['company']}' "
                f"-> keeping [{keeper['location']}], deactivating {len(dupes)} copies: "
                f"{[d['location'] for d in dupes]}"
            )
            
            for d in dupes:
                duplicates_to_deactivate.append(d["job_hash"])
    
    logger.info(f"\nTotal duplicates to deactivate: {len(duplicates_to_deactivate)}")
    
    if DRY_RUN:
        logger.info("DRY RUN - no changes made.")
        return
    
    if not duplicates_to_deactivate:
        logger.info("No duplicates found. Database is clean!")
        return
    
    # Deactivate in chunks
    chunk_size = 100
    for i in range(0, len(duplicates_to_deactivate), chunk_size):
        chunk = duplicates_to_deactivate[i:i+chunk_size]
        sb.table("jobs").update({"active": False}).in_("job_hash", chunk).execute()
        logger.info(f"  Deactivated chunk {i//chunk_size + 1} ({len(chunk)} jobs)")
    
    logger.info(f"Successfully deactivated {len(duplicates_to_deactivate)} duplicate jobs!")
    
    # Now update remaining active jobs to use new hashes
    logger.info("\nUpdating job hashes to new format (title+company only)...")
    remaining = (
        sb.table("jobs")
        .select("job_hash, title, company")
        .eq("active", True)
        .execute()
    )
    
    updated = 0
    for job in (remaining.data or []):
        correct_hash = new_hash(job["title"], job["company"])
        if job["job_hash"] != correct_hash:
            try:
                sb.table("jobs").update({"job_hash": correct_hash}).eq("job_hash", job["job_hash"]).execute()
                updated += 1
            except Exception as e:
                logger.warning(f"  Could not update hash for '{job['title']}': {e}")
    
    logger.info(f"Updated {updated} job hashes to new format.")
    logger.info("Cleanup complete!")


if __name__ == "__main__":
    main()
