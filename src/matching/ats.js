/**
 * ============================================================
 * SMART ATS ENGINE — Real Job Description & Title-Based ATS
 * ============================================================
 *
 * Implements ChatGPT-grade ATS resume-to-job matching:
 * 1. Target Role & Title Alignment (30 pts)
 *    - Compares candidate's target title (from resume header) against JD title.
 *    - Distinguishes exact roles, related disciplines, and cross-specializations
 *      (e.g., an AI Engineer applying to Java Fullstack is correctly marked as
 *      a specialization divergence, NOT a Strong Match).
 * 2. Core Must-Have Skills Match (40 pts)
 *    - Combines explicit skills from the JD description/tags with the standard
 *      mandatory skill requirements implied by the job title.
 *    - Calculates real coverage: matched vs missing requirements.
 *    - Will NEVER report "0 missing requirements" for sparse job descriptions.
 * 3. Semantic Content Overlap (20 pts)
 *    - Measures real text overlap of job description keywords within resume text.
 * 4. Seniority & Experience Fit (10 pts)
 *    - Evaluates junior/mid/senior/lead alignment.
 *
 * Total Score: 0 - 100 pts.
 * Tiers: Strong (>= 75), Good (>= 55), Stretch (>= 35), Weak (< 35).
 * Strict gates prevent low-overlap candidates from achieving high tiers.
 * ============================================================
 */

import {
  extractSkills,
  extractJobSkills,
  detectJobDomain,
  detectCandidateDomain,
  DOMAINS,
  TECH_SKILLS,
  HR_SKILLS,
  FINANCE_SKILLS
} from './skills.js'

// ── ROLE ARCHETYPES & CANONICAL REQUIREMENTS ─────────────────────────────────
export const ROLE_ARCHETYPES = {
  java_developer: {
    id: 'java_developer',
    label: 'Java Developer / Fullstack',
    titleRegex: /\b(java developer|java engineer|java fullstack|fullstack java|spring boot developer|spring developer|j2ee)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['Java', 'Spring Boot', 'Microservices', 'SQL', 'REST API', 'Git'],
    relatedRoles: ['fullstack_developer', 'backend_developer']
  },
  python_developer: {
    id: 'python_developer',
    label: 'Python Developer / Backend',
    titleRegex: /\b(python developer|python engineer|django developer|fastapi developer|backend python)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'REST API', 'Docker', 'Git'],
    relatedRoles: ['backend_developer', 'fullstack_developer', 'ai_engineer', 'data_engineer']
  },
  frontend_developer: {
    id: 'frontend_developer',
    label: 'Frontend Developer',
    titleRegex: /\b(frontend|front-end|react developer|react engineer|angular developer|vue developer|web developer|ui developer|ui\/ux developer)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['JavaScript', 'TypeScript', 'React', 'HTML/CSS', 'REST API', 'Git'],
    relatedRoles: ['fullstack_developer']
  },
  fullstack_developer: {
    id: 'fullstack_developer',
    label: 'Full Stack Software Engineer',
    titleRegex: /\b(full stack|fullstack|full-stack|software developer|software engineer|web developer|programmer|application developer)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'REST API', 'Git'],
    relatedRoles: ['frontend_developer', 'backend_developer', 'java_developer', 'python_developer', 'php_developer']
  },
  backend_developer: {
    id: 'backend_developer',
    label: 'Backend Developer',
    titleRegex: /\b(backend|back-end|api engineer|server engineer|backend engineer)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['Node.js', 'Python', 'Java', 'SQL', 'REST API', 'Microservices', 'Docker', 'Git'],
    relatedRoles: ['fullstack_developer', 'python_developer', 'java_developer']
  },
  ai_engineer: {
    id: 'ai_engineer',
    label: 'AI & Machine Learning Engineer',
    titleRegex: /\b(ai engineer|artificial intelligence|machine learning|ml engineer|deep learning|nlp engineer|llm engineer|prompt engineer|genai|generative ai)\b/i,
    domain: DOMAINS.AI,
    coreSkills: ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'LLM', 'NLP', 'Docker'],
    relatedRoles: ['data_scientist', 'python_developer']
  },
  data_scientist: {
    id: 'data_scientist',
    label: 'Data Scientist',
    titleRegex: /\b(data scientist|data science|quant researcher|applied scientist|machine learning researcher)\b/i,
    domain: DOMAINS.DATA,
    coreSkills: ['Python', 'Machine Learning', 'SQL', 'Pandas', 'NumPy', 'Data Analytics', 'Statistics'],
    relatedRoles: ['ai_engineer', 'data_analyst', 'data_engineer']
  },
  data_engineer: {
    id: 'data_engineer',
    label: 'Data Engineer',
    titleRegex: /\b(data engineer|big data engineer|etl developer|database engineer)\b/i,
    domain: DOMAINS.DATA,
    coreSkills: ['Python', 'SQL', 'ETL', 'Apache Spark', 'Data Warehouse', 'Snowflake', 'AWS'],
    relatedRoles: ['data_scientist', 'backend_developer']
  },
  data_analyst: {
    id: 'data_analyst',
    label: 'Data Analyst / BI Specialist',
    titleRegex: /\b(data analyst|bi developer|business intelligence|power bi developer|tableau developer)\b/i,
    domain: DOMAINS.DATA,
    coreSkills: ['SQL', 'Power BI', 'Tableau', 'Excel', 'Data Analytics', 'Python'],
    relatedRoles: ['data_scientist']
  },
  devops_cloud: {
    id: 'devops_cloud',
    label: 'DevOps & Cloud Engineer',
    titleRegex: /\b(devops|cloud engineer|sre|site reliability|infrastructure engineer|platform engineer|kubernetes engineer|aws engineer|azure engineer)\b/i,
    domain: DOMAINS.CLOUD_DEVOPS,
    coreSkills: ['Kubernetes', 'Docker', 'AWS', 'Azure', 'CI/CD', 'Terraform', 'Linux', 'Git'],
    relatedRoles: ['backend_developer', 'security_engineer']
  },
  security_engineer: {
    id: 'security_engineer',
    label: 'Cybersecurity & Infosec',
    titleRegex: /\b(cybersecurity|security engineer|infosec|soc analyst|penetration tester|iam|sailpoint)\b/i,
    domain: DOMAINS.SECURITY,
    coreSkills: ['Cybersecurity', 'Network Security', 'SIEM', 'SOC', 'Penetration Testing', 'Identity & Access Management'],
    relatedRoles: ['devops_cloud']
  },
  qa_engineer: {
    id: 'qa_engineer',
    label: 'QA & Test Automation Engineer',
    titleRegex: /\b(qa engineer|qa analyst|quality assurance|sdet|test automation|software tester|automation tester)\b/i,
    domain: DOMAINS.QA,
    coreSkills: ['Test Automation', 'Selenium', 'API Testing', 'Python', 'Java', 'Git', 'Agile'],
    relatedRoles: ['fullstack_developer', 'backend_developer']
  },
  mobile_developer: {
    id: 'mobile_developer',
    label: 'Mobile Application Developer',
    titleRegex: /\b(mobile developer|ios developer|android developer|flutter developer|react native developer)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'REST API', 'Git'],
    relatedRoles: ['frontend_developer']
  },
  php_developer: {
    id: 'php_developer',
    label: 'PHP / Laravel Developer',
    titleRegex: /\b(php developer|laravel developer|wordpress developer|symfony developer)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['PHP', 'Laravel', 'MySQL', 'JavaScript', 'REST API', 'Git'],
    relatedRoles: ['fullstack_developer', 'backend_developer']
  },
  dotnet_developer: {
    id: 'dotnet_developer',
    label: '.NET / C# Developer',
    titleRegex: /\b(\.net developer|dotnet developer|c# developer|asp\.net developer)\b/i,
    domain: DOMAINS.SOFTWARE,
    coreSkills: ['C#', '.NET', 'ASP.NET', 'SQL Server', 'REST API', 'Azure', 'Git'],
    relatedRoles: ['fullstack_developer', 'backend_developer']
  },
  hr_recruitment: {
    id: 'hr_recruitment',
    label: 'HR & Talent Acquisition Specialist',
    titleRegex: /\b(recruiter|recruitment|talent acquisition|talent partner|human resources|hr manager|hr specialist|hr coordinator|people partner)\b/i,
    domain: DOMAINS.HR,
    coreSkills: ['Recruitment', 'CV & Resume Screening', 'Interview Coordination', 'Talent Sourcing', 'Onboarding', 'MOHRE & Labor Law', 'Visa & PRO Administration', 'HR Documentation'],
    relatedRoles: []
  },
  finance_accounting: {
    id: 'finance_accounting',
    label: 'Finance & Accounting Specialist',
    titleRegex: /\b(accountant|accounting|auditor|financial analyst|finance manager|credit controller|bookkeeper|accounts payable|accounts receivable)\b/i,
    domain: DOMAINS.FINANCE,
    coreSkills: ['Accounting', 'Financial Reporting', 'Auditing', 'VAT & Tax Compliance', 'General Ledger', 'Financial Analysis', 'Bookkeeping'],
    relatedRoles: []
  }
}

// ── STOP WORDS ──────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'that', 'this', 'these', 'those',
  'it', 'its', 'we', 'you', 'he', 'she', 'they', 'our', 'your', 'their',
  'as', 'if', 'so', 'up', 'out', 'about', 'into', 'through', 'during',
  'including', 'across', 'within', 'such', 'while', 'any', 'all', 'both',
  'each', 'other', 'than', 'then', 'not', 'no', 'more', 'most', 'also',
  'how', 'what', 'who', 'when', 'where', 'which', 'us', 'etc', 'per',
  'please', 'responsibilities', 'requirements', 'looking', 'strong',
  'experience', 'work', 'team', 'skills', 'ability', 'good', 'excellent',
  'preferred', 'required', 'minimum', 'years', 'role', 'position',
  'company', 'working', 'new', 'based', 'related', 'following', 'candidate',
  'join', 'dubai', 'uae', 'emirates', 'abu dhabi', 'apply', 'job'
])

/**
 * Identify role archetype from text (title or resume header).
 * @param {string} text
 * @param {Array} skills
 * @returns {Object|null} archetype definition
 */
export function detectRoleArchetype(text = '', skills = []) {
  if (!text && skills.length === 0) return null

  const cleaned = (text || '').toLowerCase()
  // First 300 chars usually contains the candidate's headline or JD title
  const headline = cleaned.slice(0, 300)

  // 1. Headline-specific priority matching (most accurate for resume headers & JD titles)
  const priorityOrder = [
    ROLE_ARCHETYPES.java_developer,
    ROLE_ARCHETYPES.ai_engineer,
    ROLE_ARCHETYPES.data_scientist,
    ROLE_ARCHETYPES.data_engineer,
    ROLE_ARCHETYPES.data_analyst,
    ROLE_ARCHETYPES.devops_cloud,
    ROLE_ARCHETYPES.security_engineer,
    ROLE_ARCHETYPES.qa_engineer,
    ROLE_ARCHETYPES.mobile_developer,
    ROLE_ARCHETYPES.php_developer,
    ROLE_ARCHETYPES.dotnet_developer,
    ROLE_ARCHETYPES.hr_recruitment,
    ROLE_ARCHETYPES.finance_accounting,
    ROLE_ARCHETYPES.python_developer,
    ROLE_ARCHETYPES.frontend_developer,
    ROLE_ARCHETYPES.fullstack_developer,
    ROLE_ARCHETYPES.backend_developer
  ]

  // Check headline first
  for (const arch of priorityOrder) {
    if (arch.titleRegex.test(headline)) {
      return arch
    }
  }

  // 2. Full text regex check (if headline didn't match directly)
  for (const arch of priorityOrder) {
    if (arch.titleRegex.test(cleaned)) {
      return arch
    }
  }

  // 3. High-affinity skill clusters if title is generic
  const skillsLower = (skills || []).map(s => s.toLowerCase())
  if (skillsLower.includes('spring boot') || (skillsLower.includes('java') && skillsLower.includes('microservices'))) {
    return ROLE_ARCHETYPES.java_developer
  }
  if (skillsLower.includes('pytorch') || skillsLower.includes('tensorflow') || skillsLower.includes('llm') || skillsLower.includes('machine learning')) {
    return ROLE_ARCHETYPES.ai_engineer
  }
  if (skillsLower.includes('react') && (skillsLower.includes('javascript') || skillsLower.includes('typescript'))) {
    return ROLE_ARCHETYPES.frontend_developer
  }
  if (skillsLower.includes('kubernetes') || skillsLower.includes('terraform') || skillsLower.includes('ci/cd')) {
    return ROLE_ARCHETYPES.devops_cloud
  }
  if (skillsLower.includes('recruitment') || skillsLower.includes('talent acquisition') || skillsLower.includes('mohre & labor law')) {
    return ROLE_ARCHETYPES.hr_recruitment
  }
  if (skillsLower.includes('accounting') || skillsLower.includes('auditing') || skillsLower.includes('vat & tax compliance')) {
    return ROLE_ARCHETYPES.finance_accounting
  }

  // Default fallback for general software developers
  if (/\b(developer|engineer|programmer|coding)\b/i.test(cleaned)) {
    return ROLE_ARCHETYPES.fullstack_developer
  }

  return null
}

/**
 * Evaluate Role & Title Alignment (0 - 30 pts).
 * Measures how closely the candidate's target title matches the job title.
 */
function evaluateRoleAlignment(candArchetype, jobArchetype, candidateDomain, jobDomain, jobTitle = '', resumeHeader = '') {
  // If domains completely diverge (e.g. HR vs Software, or Finance vs DevOps)
  if (candidateDomain && jobDomain && candidateDomain !== jobDomain) {
    const isHrOrFin = candidateDomain === DOMAINS.HR || candidateDomain === DOMAINS.FINANCE ||
                      jobDomain === DOMAINS.HR || jobDomain === DOMAINS.FINANCE
    if (isHrOrFin) {
      return {
        score: 0,
        type: 'mismatch',
        reason: `Cross-domain mismatch: Candidate is in ${candidateDomain}, but job is in ${jobDomain}. (0/30 pts)`
      }
    }
  }

  // If no archetype detected, give neutral baseline
  if (!candArchetype || !jobArchetype) {
    return {
      score: 15,
      type: 'neutral',
      reason: 'General role alignment: Standard tech industry compatibility. (+15/30 pts)'
    }
  }

  // 1. EXACT ARCHETYPE MATCH (e.g. Java Dev to Java Dev, AI to AI)
  if (candArchetype.id === jobArchetype.id) {
    return {
      score: 30,
      type: 'exact',
      reason: `Direct Title Alignment: Candidate target role (${candArchetype.label}) matches job title (${jobArchetype.label}). (+30/30 pts)`
    }
  }

  // 2. CLOSELY RELATED ROLE (e.g. Fullstack to Frontend, Data Scientist to AI)
  if (jobArchetype.relatedRoles.includes(candArchetype.id) || candArchetype.relatedRoles.includes(jobArchetype.id)) {
    return {
      score: 22,
      type: 'related',
      reason: `Adjacent Role Alignment: ${candArchetype.label} is closely related to ${jobArchetype.label}. (+22/30 pts)`
    }
  }

  // 3. CROSS-SPECIALIZATION DIVERGENCE (Both Tech, but completely different stacks, e.g. AI applying to Java Fullstack)
  if (candArchetype.domain === DOMAINS.SOFTWARE || candArchetype.domain === DOMAINS.AI ||
      candArchetype.domain === DOMAINS.DATA || candArchetype.domain === DOMAINS.CLOUD_DEVOPS) {
    return {
      score: 10,
      type: 'divergent',
      reason: `Specialization Divergence: Candidate profile is ${candArchetype.label}, but job requires a dedicated ${jobArchetype.label}. (+10/30 pts)`
    }
  }

  return {
    score: 8,
    type: 'low',
    reason: `Low role alignment: ${candArchetype.label} vs ${jobArchetype.label}. (+8/30 pts)`
  }
}

/**
 * Resolve ALL required skills for a job (Explicit + Title-inferred).
 * Guarantees that sparse job descriptions still have complete, accurate requirements.
 */
export function resolveJobRequirements(job, jobArchetype) {
  const explicit = extractJobSkills(job)
  const archetypeSkills = jobArchetype?.coreSkills || []

  // Combine and deduplicate
  const combined = Array.from(new Set([...explicit, ...archetypeSkills]))

  // Return at least the core skills if none were extracted
  if (combined.length === 0) {
    return archetypeSkills.length > 0 ? archetypeSkills : ['Software Development', 'Git', 'Problem Solving']
  }

  return combined
}

/**
 * Evaluate Hard Skills Match (0 - 40 pts).
 * Compares candidate skills AND resume text against required job skills.
 */
function evaluateSkillsMatch(candidateSkills = [], resumeText = '', requiredSkills = []) {
  if (requiredSkills.length === 0) {
    return { score: 20, matched: [], missing: [], coverage: 0.5 }
  }

  const candidateSkillsLower = new Set(candidateSkills.map(s => s.toLowerCase()))
  const resumeTextLower = (resumeText || '').toLowerCase()

  const matched = []
  const missing = []

  for (const req of requiredSkills) {
    const reqLower = req.toLowerCase()

    // Match either in extracted candidate skills OR directly in resume text
    const inExtracted = candidateSkillsLower.has(reqLower)
    const inText = resumeTextLower.includes(reqLower)

    if (inExtracted || inText) {
      matched.push(req)
    } else {
      missing.push(req)
    }
  }

  const coverage = matched.length / Math.max(requiredSkills.length, 1)
  const score = Math.round(coverage * 40)

  return {
    score: Math.min(score, 40),
    matched,
    missing,
    coverage
  }
}

/**
 * Extract meaningful keyword tokens from raw text for semantic overlap.
 */
export function extractKeyPhrases(text) {
  if (!text || typeof text !== 'string') return new Map()

  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\.\-\+\#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const tokens = cleaned.split(' ').filter(t => t.length >= 2 && !STOP_WORDS.has(t))
  const phrases = new Map()

  for (const t of tokens) {
    if (t.length >= 3) {
      phrases.set(t, (phrases.get(t) || 0) + 1)
    }
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    if (!STOP_WORDS.has(tokens[i]) && !STOP_WORDS.has(tokens[i + 1])) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`
      phrases.set(bigram, (phrases.get(bigram) || 0) + 1)
    }
  }

  return phrases
}

/**
 * Calculate semantic keyword overlap (0 - 20 pts).
 */
function calcSemanticOverlap(resumeText, jdText) {
  if (!resumeText || !jdText) return { matched: [], total: 0, score: 0 }

  const jdPhrases = extractKeyPhrases(jdText)
  const resumeLower = resumeText.toLowerCase()

  const matched = []
  for (const [phrase] of jdPhrases) {
    if (phrase.length < 3) continue
    if (resumeLower.includes(phrase)) {
      matched.push(phrase)
    }
  }

  const total = jdPhrases.size
  if (total === 0) return { matched: [], total: 0, score: 0 }

  const ratio = Math.min(matched.length / Math.max(total * 0.35, 1), 1)
  const score = Math.round(ratio * 20)

  return { matched, total, score: Math.min(score, 20) }
}

/**
 * Evaluate seniority alignment (0 - 10 pts).
 */
function calcSeniorityFit(candidateSkills, jobTitle, resumeText) {
  const titleLower = (jobTitle || '').toLowerCase()
  const resumeLower = (resumeText || '').toLowerCase()

  const seniorKeywords = ['senior', 'sr.', 'sr ', 'lead', 'principal', 'manager', 'head', 'architect', 'director']
  const juniorKeywords = ['junior', 'jr.', 'jr ', 'graduate', 'trainee', 'intern', 'entry', 'associate']

  const isSeniorJob = seniorKeywords.some(kw => titleLower.includes(kw))
  const isJuniorJob = juniorKeywords.some(kw => titleLower.includes(kw))

  const isSeniorCandidate = /\b([5-9]|1[0-9]|20)\+?\s+years?\b/i.test(resumeLower) ||
    /\bsenior\b|\blead\b|\bprincipal\b|\barchitect\b|\bmanager\b/i.test(resumeLower.slice(0, 600)) ||
    (candidateSkills || []).length >= 8

  const isJuniorCandidate = /\b[1-3]\+?\s+years?\b/i.test(resumeLower) ||
    /\bjunior\b|\bgraduate\b|\bfresher\b/i.test(resumeLower.slice(0, 600)) ||
    (candidateSkills || []).length <= 4

  if ((isSeniorJob && isSeniorCandidate) || (isJuniorJob && isJuniorCandidate)) return 10
  if (!isSeniorJob && !isJuniorJob) return 8 // Standard mid-level job
  return 6 // Slight mismatch
}

/**
 * ============================================================
 * MAIN: smartScoreJob
 * Real ChatGPT-like ATS scoring based on Job Description & Title.
 *
 * @param {Object} resumeData - { text, skills, detectedDomain, fileName }
 * @param {Object} job        - Job object with title, description, tags, company
 * @returns {Object|null}
 * ============================================================
 */
export function smartScoreJob(resumeData, job) {
  if (!job || !resumeData) return null

  const resumeText = resumeData.text || resumeData.rawText || ''
  const candidateSkills = resumeData.skills || []
  const fileName = resumeData.fileName || ''

  if (!resumeText && candidateSkills.length === 0) return null

  // Header snippet for role detection
  const resumeHeader = resumeText.slice(0, 1500)

  // 1. Detect candidate & job domains
  const candidateDomain = resumeData.detectedDomain || detectCandidateDomain(candidateSkills, resumeText, fileName)
  const jobDomain = detectJobDomain(job.title || '')

  // 2. Detect archetypes (e.g. java_developer, ai_engineer, hr_recruitment)
  const candidateArchetype = detectRoleArchetype(resumeHeader, candidateSkills)
  const jobArchetype = detectRoleArchetype(`${job.title || ''} ${job.description || ''}`, [])

  // 3. Strict Domain Mismatch Check
  const domainMismatch = _checkDomainMismatch(candidateDomain, jobDomain)
  if (domainMismatch.mismatch) {
    return {
      score: 0,
      tier: 'Weak',
      matched: [],
      missing: jobArchetype ? jobArchetype.coreSkills : [],
      reasons: [domainMismatch.reason],
      domainMismatch: true,
      candidateDomain,
      jobDomain,
      archetypeMatch: { score: 0, type: 'mismatch' }
    }
  }

  // 4. Resolve full required skills (Explicit JD text + Archetype mandatory requirements)
  const requiredSkills = resolveJobRequirements(job, jobArchetype)

  // ── FACTOR 1: Target Role & Title Alignment (30 pts) ───────────────────────
  const roleEvaluation = evaluateRoleAlignment(
    candidateArchetype,
    jobArchetype,
    candidateDomain,
    jobDomain,
    job.title,
    resumeHeader
  )

  // ── FACTOR 2: Core Must-Have Skills Match (40 pts) ─────────────────────────
  const skillsEvaluation = evaluateSkillsMatch(candidateSkills, resumeText, requiredSkills)

  // ── FACTOR 3: Semantic Content & JD Overlap (20 pts) ───────────────────────
  const jdFullText = [job.title || '', job.description || '', (job.tags || []).join(' '), job.company || ''].join(' ')
  const semanticOverlap = calcSemanticOverlap(resumeText, jdFullText)

  // ── FACTOR 4: Seniority & Experience Fit (10 pts) ──────────────────────────
  const seniorityScore = calcSeniorityFit(candidateSkills, job.title, resumeText)

  // Raw Score
  const rawScore = roleEvaluation.score + skillsEvaluation.score + semanticOverlap.score + seniorityScore

  // ── STRICT GATING (ChatGPT Quality Enforcement) ────────────────────────────
  // A candidate CANNOT be "Strong" or "Good" if they have low skill coverage
  // or a major role divergence!
  let finalScore = rawScore

  if (skillsEvaluation.matched.length === 0) {
    // Zero skills matched
    finalScore = Math.min(finalScore, 18)
  } else if (skillsEvaluation.matched.length === 1 && skillsEvaluation.missing.length >= 3) {
    // Only 1 skill matched out of many required
    finalScore = Math.min(finalScore, 34)
  } else if (roleEvaluation.type === 'divergent' && skillsEvaluation.coverage < 0.5) {
    // Specialization divergence + low skill coverage (e.g. AI Engineer applying to Java Fullstack)
    finalScore = Math.min(finalScore, 44)
  } else if (skillsEvaluation.coverage < 0.4) {
    // Poor hard-skill coverage (< 40%)
    finalScore = Math.min(finalScore, 50)
  } else if (skillsEvaluation.coverage < 0.55 && finalScore > 68) {
    // Moderate coverage cannot exceed 68
    finalScore = 68
  }

  finalScore = Math.min(98, Math.max(0, finalScore))

  // ── TIER DETERMINATION ─────────────────────────────────────────────────────
  let tier = 'Weak'
  if (finalScore >= 75 && skillsEvaluation.coverage >= 0.55 && roleEvaluation.score >= 20 && skillsEvaluation.matched.length >= 3) {
    tier = 'Strong'
  } else if (finalScore >= 55 && skillsEvaluation.coverage >= 0.35 && skillsEvaluation.matched.length >= 2) {
    tier = 'Good'
  } else if (finalScore >= 35) {
    tier = 'Stretch'
  }

  // ── CHATGPT-GRADE HUMAN REASONS ────────────────────────────────────────────
  const reasons = [
    `${roleEvaluation.reason}`,
    `Must-Have Skills: Matched ${skillsEvaluation.matched.length} of ${requiredSkills.length} core requirements (${Math.round(skillsEvaluation.coverage * 100)}% coverage, +${skillsEvaluation.score}/40 pts)`,
    `Semantic Overlap: ${semanticOverlap.matched.length} JD keywords found in resume (+${semanticOverlap.score}/20 pts)`,
    `Seniority Fit: Role seniority level aligned (+${seniorityScore}/10 pts)`,
  ]

  return {
    score: finalScore,
    tier,
    matched: skillsEvaluation.matched,
    missing: skillsEvaluation.missing,
    reasons,
    domainMismatch: false,
    candidateDomain,
    jobDomain,
    candidateArchetype: candidateArchetype?.label || 'General',
    jobArchetype: jobArchetype?.label || 'General',
    roleEvaluation,
    skillsEvaluation,
    semanticOverlap,
    seniorityScore
  }
}

/**
 * Check domain compatibility between candidate and job.
 * @internal
 */
function _checkDomainMismatch(candidateDomain, jobDomain) {
  if (!candidateDomain || candidateDomain === DOMAINS.OTHER) {
    return { mismatch: false }
  }
  if (candidateDomain === jobDomain) {
    return { mismatch: false }
  }

  if (candidateDomain === DOMAINS.HR && jobDomain !== DOMAINS.HR) {
    return {
      mismatch: true,
      reason: 'Domain mismatch: Your profile is HR & Recruitment. This is a Technical/Engineering role. (ATS Score = 0)'
    }
  }

  if (candidateDomain === DOMAINS.FINANCE && jobDomain !== DOMAINS.FINANCE) {
    return {
      mismatch: true,
      reason: 'Domain mismatch: Your profile is Finance & Accounting. This is a Technical/Engineering role. (ATS Score = 0)'
    }
  }

  if ((jobDomain === DOMAINS.HR || jobDomain === DOMAINS.FINANCE) && candidateDomain !== jobDomain) {
    return {
      mismatch: true,
      reason: `Domain mismatch: This is an ${jobDomain === DOMAINS.HR ? 'HR' : 'Finance'} role. Your profile is Technical/Engineering. (ATS Score = 0)`
    }
  }

  return { mismatch: false }
}

/**
 * Returns breakdown for UI drawer.
 */
export function getMatchBreakdown(resumeData, job) {
  const result = smartScoreJob(resumeData, job)
  if (!result) return { matched: [], missing: [], score: 0, tier: 'Weak' }
  return result
}

/**
 * Find top matching jobs for a candidate (Strict: Score >= 55, no mismatch).
 */
export function findSmartBestMatches(resumeData, jobs, limit = 5) {
  if (!resumeData || !jobs || !Array.isArray(jobs) || jobs.length === 0) return []

  const matches = []

  for (const job of jobs) {
    if (!job || !job.id) continue
    const result = smartScoreJob(resumeData, job)
    if (result && !result.domainMismatch && result.score >= 55) {
      matches.push({
        ...job,
        atsScore: result.score,
        tier: result.tier,
        matchedSkills: result.matched,
        missingSkills: result.missing,
        reasons: result.reasons,
      })
    }
  }

  matches.sort((a, b) => b.atsScore - a.atsScore)
  return matches.slice(0, limit)
}
