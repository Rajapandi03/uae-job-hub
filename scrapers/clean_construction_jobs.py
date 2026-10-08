import os
import time
from common import get_supabase, logger, is_relevant_tech_job

def purge_construction_and_non_tech():
    supabase = get_supabase()
    logger.info("Fetching jobs from Supabase to audit against new explicit blocklist...")
    
    limit = 1000
    offset = 0
    all_jobs = []
    
    while True:
        resp = supabase.table('jobs').select('job_hash, title, company, description').range(offset, offset + limit - 1).execute()
        jobs = resp.data or []
        if not jobs:
            break
        all_jobs.extend(jobs)
        if len(jobs) < limit:
            break
        offset += limit
        
    logger.info(f"Fetched {len(all_jobs)} jobs. Auditing...")
    
    deleted_count = 0
    for job in all_jobs:
        title = job.get('title', '')
        company = job.get('company', '')
        description = job.get('description', '')
        j_hash = job.get('job_hash')
        
        # We re-run the updated is_relevant_tech_job logic which now uses the stricter regexes
        if not is_relevant_tech_job(title, description):
            logger.info(f"Deleting non-tech/construction job: [{title}] by [{company}]")
            try:
                supabase.table('jobs').delete().eq('job_hash', j_hash).execute()
                deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to delete {title}: {e}")
                
    logger.info(f"Cleanup complete! Removed {deleted_count} non-tech jobs from Supabase.")

if __name__ == '__main__':
    purge_construction_and_non_tech()
