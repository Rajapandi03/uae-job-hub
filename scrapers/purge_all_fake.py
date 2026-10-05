import re
from common import get_supabase, logger

def purge_all_fake():
    sb = get_supabase()
    res = sb.table('jobs').select('job_hash, title, company, source, url').execute()
    jobs = res.data or []
    logger.info(f"Total jobs in DB: {len(jobs)}")

    fake_hashes = []
    
    # Generic non-job title keywords
    NON_JOB_KEYWORDS = [
        'definition', 'meaning', 'tutorial', 'download', 'wikipedia', 'w3schools', 
        'geeksforgeeks', 'dictionary', 'what is', 'how it works', 'documentation', 
        'guides', 'merriam-webster', 'cheat sheet', 'course', 'learn', 'faq', 
        'overview', 'basics', 'introduction to', 'lesson', 'types and how',
        'home', 'generator', 'prompt', 'oracle', 'ibm', 'microsoft', 'scientific american'
    ]

    for j in jobs:
        j_hash = j.get('job_hash')
        title = (j.get('title') or '').strip()
        title_lower = title.lower()
        source = (j.get('source') or '').strip().lower()
        url = (j.get('url') or '').strip().lower()
        comp = (j.get('company') or '').strip().lower()

        is_fake = False

        # RULE 1: Source Domain Enforcement
        if source == 'naukrigulf' and 'naukrigulf.com' not in url:
            is_fake = True
            logger.info(f"FAKE NAUKRIGULF JOB: [{title}] -> URL: {url}")
        elif source == 'gulftalent' and 'gulftalent.com' not in url:
            is_fake = True
            logger.info(f"FAKE GULFTALENT JOB: [{title}] -> URL: {url}")

        # RULE 2: Non-job keyword check on title
        if any(kw in title_lower for kw in ['data.gov', 'java software | oracle', 'free ai prompt generator', 'definition & meaning', 'downloads | oracle', 'java tutorial', 'generative ai tutorial']):
            is_fake = True

        # RULE 3: Company is a web brand, not a hiring employer
        if comp in ['merriam-webster', 'w3schools', 'wikipedia', 'geeksforgeeks', 'mech lesson', 'scientific american', 'data.gov', 'ibm', 'oracle']:
            if not any(emp_word in title_lower for emp_word in ['engineer', 'developer', 'manager', 'architect', 'analyst', 'specialist', 'lead', 'consultant', 'officer']):
                is_fake = True

        if is_fake:
            fake_hashes.append(j_hash)

    logger.info(f"Found {len(fake_hashes)} fake jobs to delete.")

    # Delete in batches of 50
    for i in range(0, len(fake_hashes), 50):
        batch = fake_hashes[i:i+50]
        sb.table('jobs').delete().in_('job_hash', batch).execute()
        logger.info(f"Deleted batch of {len(batch)} fake jobs.")

    logger.info(f"SUCCESS: Purged all {len(fake_hashes)} fake jobs from Supabase!")

if __name__ == '__main__':
    purge_all_fake()
