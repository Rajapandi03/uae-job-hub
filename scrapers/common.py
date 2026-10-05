"""
common.py - Shared utilities for all scrapers.
Provides: normalized job format, hashing, deduplication, Supabase upsert, tech relevance filter.
"""

import hashlib
import os
import re
import logging
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("uae_jobs")

# ---------------------------------------------------------------------------
# Supabase client (uses service key for writes)
# ---------------------------------------------------------------------------
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set as environment variables."
        )
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Sanitization & Cleaning Utilities
# ---------------------------------------------------------------------------
def clean_string(val: str) -> str:
    """Clean string values and remove 'None', 'nan', 'null', 'undefined' artifacts."""
    if not val:
        return ""
    s = str(val).strip()
    if s.lower() in ("none", "nan", "null", "undefined"):
        return ""
    return s


def clean_location(loc_raw: str) -> str:
    """Clean location strings and fix redundant duplicates like 'Dubai, United Arab Emirates, United Arab Emirates'."""
    loc = clean_string(loc_raw)
    if not loc:
        return "UAE"

    # Replace long country names with UAE
    loc = re.sub(r'United Arab Emirates', 'UAE', loc, flags=re.IGNORECASE)
    
    # Split by comma and deduplicate tokens case-insensitively while maintaining order
    tokens = [t.strip() for t in loc.split(',') if t.strip()]
    seen = set()
    cleaned_tokens = []
    for t in tokens:
        t_lower = t.lower()
        if t_lower not in seen:
            seen.add(t_lower)
            cleaned_tokens.append(t)
            
    res = ", ".join(cleaned_tokens)
    return res if res else "UAE"


# ---------------------------------------------------------------------------
# Tech Relevance & Non-Tech Blocklist Filter
# ---------------------------------------------------------------------------
# Explicit non-tech roles to discard
NON_TECH_BLOCKLIST = re.compile(
    r'\b('
    # Healthcare & Medical
    r'nurse|doctor|pharmacist|dentist|physiotherapist|lab technician|radiologist|'
    r'medical officer|clinical|veterinarian|optometrist|surgeon|'
    # Hospitality & Food Service
    r'barista|waiter|waitress|cook|chef|housekeeper|cleaner|'
    r'hotel manager|concierge|front desk agent|bell boy|room attendant|'
    r'food and beverage|sommelier|banquet|pastry chef|sous chef|'
    # Construction & Trades
    r'mason|plumber|electrician|hvac|carpenter|welding|welder|painter|tiler|'
    # Real Estate
    r'real estate|property consultant|leasing agent|property manager|'
    # Sales & Marketing (non-tech)
    r'sales agent|sales executive|sales representative|sales manager|'
    r'business development manager|business development executive|'
    r'marketing manager|marketing executive|brand manager|'
    r'content writer|copywriter|social media manager|public relations|'
    r'digital marketing|media buyer|media planner|advertising manager|'
    r'telesales|telemarketer|merchandiser|visual merchandiser|'
    # Finance & Accounting (non-tech)
    r'accountant|auditor|financial analyst|bookkeeper|'
    r'tax consultant|compliance officer|treasury|investment analyst|'
    r'credit analyst|loan officer|insurance agent|underwriter|'
    # HR & Admin
    r'hr manager|hr executive|recruiter|receptionist|cashier|'
    r'office manager|personal assistant|executive assistant|office boy|'
    r'admin assistant|administrative assistant|secretary|company secretary|'
    # Legal
    r'legal counsel|paralegal|legal assistant|lawyer|advocate|'
    # Security & Facilities
    r'security guard|storekeeper|warehouse manager|warehouse supervisor|'
    r'facilities manager|janitor|steward|'
    # Fashion & Beauty
    r'tailor|beautician|hair stylist|fashion designer|stylist|'
    # Transport & Logistics (non-tech)
    r'driver|delivery rider|car washer|mechanic|'
    r'logistics coordinator|logistics manager|supply chain manager|'
    r'procurement officer|procurement manager|fleet manager|'
    r'shipping coordinator|customs officer|freight|'
    # Education (non-tech)
    r'teacher|tutor|nanny|lecturer|academic coordinator|'
    # Non-IT Engineering
    r'mechanical engineer|mechanical technician|civil engineer|'
    r'structural engineer|electrical engineer|field engineer|maintenance engineer|'
    r'production engineer|manufacturing engineer|piping engineer|hvac engineer|'
    r'instrumentation engineer|geotechnical|quantity surveyor|site engineer|'
    r'process engineer|plant engineer|welding engineer|marine engineer|'
    r'chemical engineer|petroleum engineer|safety engineer|quality inspector|'
    r'drilling engineer|reservoir engineer|'
    # Operations (non-tech)
    r'operations manager|store manager|retail manager|retail assistant|'
    r'general manager|area manager|regional manager'
    r')\b',
    re.IGNORECASE
)

# Tech, Software, Data & AI allowlist pattern
TECH_ALLOWLIST = re.compile(
    r'\b(ai|ml|data|python|software|full stack|fullstack|frontend|backend|cloud|devops|'
    r'cyber|security|engineer|developer|architect|machine learning|deep learning|nlp|'
    r'computer vision|genai|generative ai|llm|artificial intelligence|data science|'
    r'data scientist|data analyst|data engineer|web|react|node|vue|angular|java|c\+\+|\.net|'
    r'golang|rust|embedded|qa|tester|automation|scrum|tech|technical|fresher|graduate|'
    r'intern|internship|junior|code|coding|programmer|system|database|network|infrastructure|it)\b',
    re.IGNORECASE
)

def is_relevant_tech_job(title: str, description: str = "") -> bool:
    """
    Check if a job title (and optional description) is a relevant tech/AI job.
    Enforces word boundary matching (\b) to avoid false positive substring matches.
    """
    t = clean_string(title)
    if not t:
        return False
        
    # Rejection check: if title explicitly matches non-tech blocklist, discard
    if NON_TECH_BLOCKLIST.search(t):
        return False
        
    # Acceptance check: title must match tech allowlist
    if TECH_ALLOWLIST.search(t):
        return True
        
    # If description is provided, check if description mentions AI/tech
    if description and TECH_ALLOWLIST.search(description[:500]):
        return True

    return False


NON_UAE_COUNTRIES = re.compile(
    r'\b(pakistan|india|bangladesh|philippines|egypt|jordan|lebanon|saudi|qatar|oman|kuwait|'
    r'bahrain|sri lanka|nepal|nigeria|kenya|ukraine|poland|canada|usa|united states|uk|united kingdom|'
    r'hyderabad|bengaluru|mumbai|delhi|karachi|lahore|islamabad|chennai|pune|gurgaon|noida)\b',
    re.IGNORECASE
)

NON_UAE_URL_PATTERNS = re.compile(
    r'/(pakistan|india|bangladesh|philippines|egypt|jordan|saudi|qatar|oman|kuwait|bahrain)/',
    re.IGNORECASE
)

def is_strict_uae_job(location: str, url: str = "", apply_url: str = "") -> bool:
    """Return False if the job location or URL indicates a non-UAE country (India, Pakistan, etc.)."""
    loc = (location or "").lower()
    u = (url or "").lower()
    app_u = (apply_url or "").lower()

    if NON_UAE_URL_PATTERNS.search(u) or NON_UAE_URL_PATTERNS.search(app_u):
        return False

    if NON_UAE_COUNTRIES.search(loc):
        return False

    return True


# ---------------------------------------------------------------------------
# Job hash: deterministic primary key from title|company
# ---------------------------------------------------------------------------
def make_job_hash(title: str, company: str, location: str = "") -> str:
    """
    Deterministic hash from sanitized title + company.
    Special characters and extra spaces are stripped to ensure cross-source deduplication.
    """
    t_clean = re.sub(r'[^a-z0-9]', '', clean_string(title).lower())
    c_clean = re.sub(r'[^a-z0-9]', '', clean_string(company).lower())
    raw = f"{t_clean}|{c_clean}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Normalized job dict (every scraper must return a list of these)
# ---------------------------------------------------------------------------
def normalize_job(
    title: str,
    company: str,
    location: str,
    url: str,
    source: str,
    description: str = None,
    posted_at: str = None,      # ISO-8601 string or None
    apply_url: str = None,
) -> dict:
    """Return a dict matching the Supabase `jobs` table schema."""
    t = clean_string(title)
    c = clean_string(company)
    loc = clean_location(location)
    u = clean_string(url)
    app_u = clean_string(apply_url) if apply_url else u
    desc = clean_string(description)[:3000] if description else None
    
    return {
        "job_hash":    make_job_hash(t, c, loc),
        "title":       t,
        "company":     c,
        "location":    loc,
        "url":         u,
        "apply_url":   app_u if app_u else u,
        "source":      clean_string(source).lower(),
        "posted_at":   posted_at,
        "description": desc if desc else None,
        "active":      True,
    }


# ---------------------------------------------------------------------------
# Upsert jobs into Supabase (insert or update on conflict)
# ---------------------------------------------------------------------------
def upsert_jobs(jobs: list[dict]) -> int:
    """Upsert a list of normalized job dicts. Returns count of upserted rows."""
    if not jobs:
        return 0
        
    # Filter out non-relevant jobs before DB insertion
    relevant_jobs = [j for j in jobs if is_relevant_tech_job(j["title"], j.get("description") or "")]
    if not relevant_jobs:
        logger.info("No relevant tech jobs to upsert after relevance filtering.")
        return 0

    sb = get_supabase()
    result = (
        sb.table("jobs")
        .upsert(
            relevant_jobs,
            on_conflict="job_hash",
        )
        .execute()
    )
    return len(result.data) if result.data else 0


# ---------------------------------------------------------------------------
# Mark stale jobs as inactive (older than 7 days)
# ---------------------------------------------------------------------------
def deactivate_stale_jobs(days: int = 7):
    sb = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Deactivate jobs whose first_seen is older than 7 days
    result = (
        sb.table("jobs")
        .update({"active": False})
        .lt("first_seen", cutoff)
        .eq("active", True)
        .execute()
    )
    count = len(result.data) if result.data else 0
    if count:
        logger.info(f"Deactivated {count} stale jobs (older than {days} days).")
    return count


# ---------------------------------------------------------------------------
# Remove duplicate jobs based on sanitized title and company
# ---------------------------------------------------------------------------
def remove_duplicates():
    """
    Finds currently active jobs and marks duplicates as inactive.
    Duplicates are identified by having the same sanitized title and company.
    """
    sb = get_supabase()
    
    limit = 1000
    offset = 0
    all_jobs = []
    
    logger.info("Fetching active jobs to check for duplicates...")
    while True:
        res = (
            sb.table("jobs")
            .select("job_hash, title, company, posted_at, first_seen")
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
        
    if not all_jobs:
        logger.info("No active jobs to deduplicate.")
        return 0
        
    from collections import defaultdict
    
    def sanitize(text):
        if not text:
            return ""
        return re.sub(r'[^a-z0-9]', '', clean_string(text).lower())
        
    grouped = defaultdict(list)
    for job in all_jobs:
        comp = sanitize(job.get("company"))
        title = sanitize(job.get("title"))
        if not comp or not title:
            continue
        key = f"{comp}|{title}"
        grouped[key].append(job)
        
    duplicates_to_deactivate = []
    
    for key, jobs in grouped.items():
        if len(jobs) > 1:
            # Sort by posted_at (if available), then first_seen, keeping most recent
            def get_sort_key(j):
                pa = j.get("posted_at") or ""
                fs = j.get("first_seen") or ""
                return (pa, fs)
                
            jobs.sort(key=get_sort_key, reverse=True)
            # Keep the first (newest), deactivate the rest
            duplicates = [j["job_hash"] for j in jobs[1:]]
            duplicates_to_deactivate.extend(duplicates)
            
    if not duplicates_to_deactivate:
        logger.info("No duplicate jobs found.")
        return 0
        
    logger.info(f"Found {len(duplicates_to_deactivate)} duplicate jobs. Deactivating...")
    
    chunk_size = 100
    for i in range(0, len(duplicates_to_deactivate), chunk_size):
        chunk = duplicates_to_deactivate[i:i+chunk_size]
        try:
            sb.table("jobs").update({"active": False}).in_("job_hash", chunk).execute()
        except Exception as e:
            logger.error(f"Error deactivating duplicates chunk: {e}")
            
    logger.info("Duplicate jobs successfully deactivated.")
    return len(duplicates_to_deactivate)
