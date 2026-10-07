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
# Role Categorization & UAE Location Constants
# ---------------------------------------------------------------------------
AI_ROLES = [
    "AI Engineer", "Artificial Intelligence Engineer", "Machine Learning Engineer",
    "ML Engineer", "Deep Learning Engineer", "Generative AI Engineer", "GenAI Engineer",
    "LLM Engineer", "Agentic AI Engineer", "AI Agent Engineer", "Multi-Agent",
    "Applied AI Engineer", "AI Software Engineer", "AI Developer", "Full Stack AI",
    "NLP Engineer", "Computer Vision Engineer", "RAG Engineer", "Prompt Engineer",
    "Conversational AI", "MLOps Engineer", "LLMOps", "AI Platform Engineer",
    "AI Research Engineer", "Research Scientist", "Applied Scientist",
    "Forward Deployed AI Engineer", "AI Solutions", "AI Automation", "AI Consultant",
    "Data Scientist", "Data Engineer", "Data Analyst", "Analytics Engineer",
]

IT_TECH_ROLES = [
    "Software Engineer", "Software Developer", "Full Stack Developer",
    "Frontend Developer", "Backend Developer", "Python Developer", "Java Developer",
    ".NET Developer", "Node.js Developer", "React Developer", "PHP Developer",
    "Mobile Developer", "iOS Developer", "Android Developer", "Flutter Developer",
    "Web Developer", "API Developer",
    "Cloud Engineer", "Cloud Architect", "DevOps Engineer", "Site Reliability Engineer",
    "Platform Engineer", "Infrastructure Engineer",
    "Security Engineer", "Security Analyst", "SOC Analyst", "Penetration Tester",
    "Cyber Security",
    "Database Administrator", "Data Architect", "ETL Developer", "Big Data Engineer",
    "Solutions Architect", "Enterprise Architect", "Technical Architect",
    "Technical Product Manager", "IT Project Manager", "Scrum Master",
    "Business Analyst", "Systems Analyst",
    "QA Engineer", "Test Automation Engineer", "SDET",
    "Network Engineer", "Systems Administrator", "IT Support Engineer",
    "Blockchain Developer", "Robotics Software Engineer", "IoT Engineer",
]

LOCATIONS = [
    "United Arab Emirates",
    "UAE",
    "Dubai",
    "Abu Dhabi",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
    "Al Ain",
]

UAE_AREAS = [
    # Dubai
    "Dubai Internet City", "Dubai Media City", "Dubai Silicon Oasis",
    "Dubai Knowledge Park", "DIFC", "Business Bay", "Downtown Dubai",
    "JLT", "Jumeirah Lakes Towers", "Al Quoz", "Dubai South",
    "Dubai Marina", "Sheikh Zayed Road", "Deira", "Bur Dubai",
    "Dubai Production City", "Dubai Design District", "Jebel Ali", "JAFZA",
    # Abu Dhabi
    "ADGM", "Masdar City", "Khalifa City", "Al Reem Island",
    "Yas Island", "Saadiyat Island", "KIZAD", "Mussafah", "Al Maryah Island",
    # Other emirates
    "Sharjah Research Technology and Innovation Park", "SRTIP",
    "Sharjah Publishing City", "Hamriyah Free Zone", "SAIF Zone",
    "RAKEZ", "Ajman Free Zone", "Al Hamra",
]

UAE_ALIASES = [
    "United Arab Emirates", "UAE", "U.A.E", "Emirates",
    "Dubai, UAE", "Abu Dhabi, UAE", "Dubai - United Arab Emirates",
]

NON_UAE = [
    "Saudi Arabia", "Riyadh", "Jeddah", "Dammam", "Qatar", "Doha",
    "Kuwait", "Bahrain", "Manama", "Oman", "Muscat",
    "Egypt", "Cairo", "Pakistan", "India",
]

# ---------------------------------------------------------------------------
# Tech Relevance & Non-Tech Blocklist Filter
# ---------------------------------------------------------------------------
NON_TECH_BLOCKLIST = re.compile(
    r'\b('
    # Healthcare & Medical
    r'nurse|doctor|pharmacist|dentist|physiotherapist|lab technician|radiologist|'
    r'medical officer|clinical|veterinarian|optometrist|surgeon|'
    # Hospitality & Food Service
    r'barista|waiter|waitress|cook|chef|housekeeper|cleaner|'
    r'hotel manager|concierge|front desk agent|bell boy|room attendant|'
    r'food and beverage|sommelier|banquet|pastry chef|sous chef|'
    # Customer Support & Service (non-tech)
    r'customer support|customer service|customer care|customer experience manager|'
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
    # Fashion, Interior & Design (non-tech)
    r'tailor|beautician|hair stylist|fashion designer|stylist|interior designer|fit out|fitout|upholstery|'
    # Transport & Logistics (non-tech)
    r'driver|delivery rider|car washer|mechanic|'
    r'logistics coordinator|logistics manager|supply chain manager|'
    r'procurement officer|procurement manager|fleet manager|'
    r'shipping coordinator|customs officer|freight|'
    # Education (non-tech)
    r'teacher|tutor|nanny|lecturer|academic coordinator|'
    # Non-IT Engineering & Construction
    r'civil|structural|steel structure|structure engineer|mechanical engineer|mechanical technician|'
    r'electrical engineer|field engineer|maintenance engineer|'
    r'production engineer|manufacturing engineer|piping engineer|hvac engineer|'
    r'instrumentation engineer|geotechnical|survey|surveyor|surveying|quantity surveyor|land surveyor|heavy civil|highway|bridge engineer|road engineer|site engineer|'
    r'process engineer|plant engineer|welding engineer|marine engineer|'
    r'chemical engineer|petroleum engineer|safety engineer|environmental|planning engineer|'
    r'wet utilities|utilities design|utilities engineer|cad|autocad|cad technician|draftsman|draughtsman|drafting|bim|revit|'
    r'qa\/qc|qa qc|quality administrator|quality inspector|'
    r'drilling engineer|reservoir engineer|project engineer|hospitality construction|construction|'
    r'architectural consultancy|engineer internship|engineering intern|'
    # Operations (non-tech)
    r'operations manager|store manager|retail manager|retail assistant|'
    r'general manager|area manager|regional manager'
    r')\b',
    re.IGNORECASE
)

# Tech, Software, Data & AI allowlist pattern fallback
TECH_ALLOWLIST = re.compile(
    r'\b(ai|ml|data|python|software|full stack|fullstack|frontend|backend|cloud|devops|'
    r'cyber|security|engineer|developer|architect|machine learning|deep learning|nlp|'
    r'computer vision|genai|generative ai|llm|artificial intelligence|data science|'
    r'data scientist|data analyst|data engineer|web|react|node|vue|angular|java|c\+\+|\.net|'
    r'golang|rust|embedded|qa|tester|automation|scrum|tech|technical|fresher|graduate|'
    r'intern|internship|junior|code|coding|programmer|system|database|network|infrastructure|it)\b',
    re.IGNORECASE
)

NON_JOB_TITLE_BLOCKLIST = re.compile(
    r'\b(definition|meaning|tutorial|download|downloads|wikipedia|w3schools|geeksforgeeks|'
    r'dictionary|what is|how it works|documentation|guides|merriam-webster|cheat sheet|'
    r'course|learn|faq|overview|basics|introduction to|lesson|types and how)\b',
    re.IGNORECASE
)

AI_KEYWORDS_REGEX = re.compile(
    r'\b(ai|artificial intelligence|machine learning|deep learning|genai|generative ai|llm|nlp|computer vision|prompt|rag|mlops|llmops|data scientist|data engineer|data analyst|analytics engineer)\b',
    re.IGNORECASE
)

IT_TECH_KEYWORDS_REGEX = re.compile(
    r'\b(software|developer|full stack|fullstack|frontend|backend|web developer|react|node|python|java|\.net|golang|c\+\+|mobile|ios|android|flutter|devops|cloud|cybersecurity|security engineer|soc analyst|solutions architect|scrum master|qa engineer|sdet|test automation|network engineer|system administrator|it support|database administrator|data architect|etl|bi developer|systems analyst|blockchain|robotics|iot)\b',
    re.IGNORECASE
)

def classify_job_role(title: str, description: str = "") -> str:
    """
    Classify job title into 'AI', 'Tech', or 'Blocked'.
    Matches strictly against AI_ROLES and IT_TECH_ROLES.
    Also falls back to TECH_ALLOWLIST for generic tech roles not explicitly named.
    """
    t = clean_string(title)
    if not t:
        return "Blocked"
    if NON_JOB_TITLE_BLOCKLIST.search(t) or NON_TECH_BLOCKLIST.search(t):
        return "Blocked"

    # AI Role Check
    if any(re.search(r'\b' + re.escape(role) + r'\b', t, re.IGNORECASE) for role in AI_ROLES) or AI_KEYWORDS_REGEX.search(t):
        return "AI"

    # IT / Tech Role Check
    if any(re.search(r'\b' + re.escape(role) + r'\b', t, re.IGNORECASE) for role in IT_TECH_ROLES) or IT_TECH_KEYWORDS_REGEX.search(t):
        return "Tech"

    # Description fallback check
    if description:
        d = description[:500]
        if AI_KEYWORDS_REGEX.search(d):
            return "AI"
        if IT_TECH_KEYWORDS_REGEX.search(d):
            return "Tech"

    # General tech fallback checks (TECH_ALLOWLIST) - verify possible tech job
    if TECH_ALLOWLIST.search(t):
        return "Tech"
        
    if description and TECH_ALLOWLIST.search(description[:500]):
        return "Tech"

    return "Blocked"


NON_UAE_URL_PATTERNS = re.compile(
    r'/(pakistan|india|bangladesh|philippines|egypt|jordan|saudi|qatar|oman|kuwait|bahrain)/',
    re.IGNORECASE
)

def is_valid_uae_location(location: str, url: str = "") -> bool:
    """
    Strict UAE Location Validation.
    Rejects job if location matches NON_UAE list and does not explicitly match a UAE location/alias/area.
    """
    loc = (location or "").lower()
    u = (url or "").lower()

    if NON_UAE_URL_PATTERNS.search(u):
        return False

    # Check if location contains any NON_UAE term
    has_non_uae = any(re.search(r'\b' + re.escape(item.lower()) + r'\b', loc) for item in NON_UAE)

    if has_non_uae:
        # Verify if it ALSO explicitly matches any UAE area, alias, or emirate
        uae_matches = any(re.search(r'\b' + re.escape(uae_item.lower()) + r'\b', loc) for uae_item in (LOCATIONS + UAE_ALIASES + UAE_AREAS))
        if not uae_matches:
            return False

    return True


def is_relevant_tech_job(title: str, description: str = "") -> bool:
    """
    Gatekeeper: Returns True ONLY if job title classifies as 'AI' or 'Tech'.
    Anything matching neither gets blocked.
    """
    role_type = classify_job_role(title, description)
    return role_type in ("AI", "Tech")


def is_strict_uae_job(location: str, url: str = "", apply_url: str = "") -> bool:
    """Check strict UAE location validity across location and URLs."""
    return is_valid_uae_location(location, url) and is_valid_uae_location(location, apply_url)


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
    desc = clean_string(description)[:5000] if description else None
    
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
