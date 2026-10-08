"""
clean_bad_jobs.py - Scrub Supabase database of non-job entries like dictionary definitions, Wikipedia articles, W3Schools tutorials, and Oracle downloads.
"""

import re
import os
from common import get_supabase, logger, NON_JOB_TITLE_BLOCKLIST, NON_TECH_BLOCKLIST, classify_job_role

BAD_COMPANIES = [
    'merriam-webster', 'w3schools', 'wikipedia', 'geeksforgeeks', 'mech lesson', 'scientific american'
]

BAD_TITLES = [
    'artificial intelligence', 'data', 'generative ai', 'java'
]

def clean_database():
    supabase = get_supabase()
    logger.info("Fetching jobs to audit...")
    
    # Fetch all jobs
    resp = supabase.table('jobs').select('job_hash, title, company, url, description').execute()
    jobs = resp.data or []
    
    deleted_count = 0
    for job in jobs:
        j_hash = job.get('job_hash')
        title = (job.get('title') or '').strip()
        title_lower = title.lower()
        company = (job.get('company') or '').strip().lower()
        url = (job.get('url') or '').strip().lower()
        description = job.get('description') or ''
        
        is_bad = False
        
        # Check title against blocklist & role classification
        if NON_JOB_TITLE_BLOCKLIST.search(title_lower) or NON_TECH_BLOCKLIST.search(title_lower):
            is_bad = True
        elif classify_job_role(title, description) == "Blocked":
            is_bad = True
            
        # Check company names
        for bad_comp in BAD_COMPANIES:
            if bad_comp in company:
                is_bad = True
                break
                
        # Check standalone titles
        if title_lower in BAD_TITLES:
            is_bad = True
            
        # Check url domains (e.g. merriam-webster.com, wikipedia.org, oracle.com/downloads)
        if any(bad in url for bad in ['merriam-webster.com', 'w3schools.com', 'wikipedia.org', 'geeksforgeeks.org', 'oracle.com/downloads', 'mechlesson.com']):
            is_bad = True
            
        if is_bad:
            logger.info(f"Deleting non-job record: [{title}] by [{company}]")
            supabase.table('jobs').delete().eq('job_hash', j_hash).execute()
            deleted_count += 1
            
    logger.info(f"Cleanup complete! Removed {deleted_count} non-job records from Supabase.")

if __name__ == '__main__':
    clean_database()
