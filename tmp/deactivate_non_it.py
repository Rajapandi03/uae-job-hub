import os
import re
from scrapers.common import get_supabase, NON_TECH_BLOCKLIST

sb = get_supabase()

# Query active jobs
res = sb.table('jobs').select('id, title').eq('active', True).limit(1000).execute()
jobs = res.data or []

non_it_ids = []
for j in jobs:
    title = j.get('title', '')
    if NON_TECH_BLOCKLIST.search(title):
        non_it_ids.append(j['id'])

print(f"Active jobs scanned: {len(jobs)}")
print(f"Non-IT jobs found to deactivate: {len(non_it_ids)}")

count = 0
for job_id in non_it_ids:
    try:
        sb.table('jobs').update({'active': False}).eq('id', job_id).execute()
        count += 1
    except Exception as e:
        print(f"Error deactivating {job_id}: {e}")

print(f"Successfully deactivated {count} non-IT jobs in Supabase.")
