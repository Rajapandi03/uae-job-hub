// ============================================================
//  jdParser.js — Structured Job Description Extractor
//  Parses raw description text into structured JD sections.
//  Technologies extracted from text; skills come from ATS engine.
// ============================================================

// ── TECHNOLOGY DICTIONARIES ──────────────────────────────────
const TECH_MAP = {
  languages: [
    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'golang',
    'rust', 'scala', 'kotlin', 'swift', 'r', 'matlab', 'php', 'ruby', 'perl',
    'bash', 'shell', 'sql', 'plsql', 'vba', 'dart', 'elixir', 'julia',
  ],
  frameworks: [
    'react', 'react.js', 'reactjs', 'vue', 'vue.js', 'vuejs', 'angular',
    'next.js', 'nextjs', 'node.js', 'nodejs', 'express', 'django', 'flask',
    'fastapi', 'spring', 'spring boot', '.net', 'asp.net', 'laravel', 'rails',
    'ruby on rails', 'nuxt', 'svelte', 'remix', 'nest.js', 'nestjs',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'hugging face',
    'langchain', 'llamaindex', 'pandas', 'numpy', 'spark', 'hadoop',
    'airflow', 'dbt', 'dask', 'ray', 'celery', 'kafka', 'flink',
  ],
  aiMl: [
    'machine learning', 'deep learning', 'nlp', 'natural language processing',
    'computer vision', 'generative ai', 'large language model', 'llm',
    'gpt', 'bert', 'transformer', 'rag', 'fine-tuning', 'reinforcement learning',
    'mlops', 'data science', 'neural network', 'recommendation system',
    'time series', 'anomaly detection', 'feature engineering',
    'convolutional neural network', 'cnn', 'recurrent neural network', 'rnn',
    'lstm', 'gan', 'diffusion model', 'stable diffusion', 'prompt engineering',
    'vector database', 'embeddings', 'semantic search', 'openai', 'anthropic',
  ],
  cloud: [
    'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp',
    'google cloud', 'heroku', 'digitalocean', 'cloudflare', 'firebase',
    'supabase', 'vercel', 'netlify', 'kubernetes', 'k8s', 'docker',
    'terraform', 'ansible', 'jenkins', 'ci/cd', 'github actions',
    'gitlab ci', 'aws lambda', 'ec2', 's3', 'rds', 'sagemaker',
    'azure ml', 'azure devops', 'bigquery', 'cloud run', 'gke',
  ],
  databases: [
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite',
    'oracle', 'sql server', 'mssql', 'cassandra', 'dynamodb', 'firestore',
    'elasticsearch', 'neo4j', 'snowflake', 'databricks', 'clickhouse',
    'mariadb', 'cockroachdb', 'pinecone', 'weaviate', 'chroma', 'qdrant',
    'supabase', 'planetscale',
  ],
  tools: [
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
    'postman', 'swagger', 'figma', 'linux', 'unix', 'macos',
    'graphql', 'rest api', 'grpc', 'websocket', 'microservices',
    'agile', 'scrum', 'kanban', 'devops', 'devsecops', 'datadog',
    'grafana', 'prometheus', 'kibana', 'logstash', 'rabbitmq',
    'celery', 'nginx', 'apache', 'webpack', 'vite', 'babel',
    'power bi', 'tableau', 'looker', 'excel', 'jupyter', 'colab',
  ],
}

// ── EXPERIENCE EXTRACTION ────────────────────────────────────
const EXPERIENCE_PATTERNS = [
  // "3+ years", "5+ years experience"
  /(\d+)\+\s*years?\s*(?:of\s*)?(?:experience|exp)?/i,
  // "3-5 years", "3 to 5 years"
  /(\d+)\s*[-–to]+\s*(\d+)\s*years?\s*(?:of\s*)?(?:experience|exp)?/i,
  // "minimum 3 years", "at least 5 years"
  /(?:minimum|min\.?|at least|min\s+of)\s*(\d+)\s*years?\s*(?:of\s*)?(?:experience|exp)?/i,
  // "experience of 3+ years"
  /experience\s+of\s+(\d+)\+?\s*(?:to\s+(\d+))?\s*years?/i,
  // "3 years of hands-on experience"
  /(\d+)\s*years?\s+of\s+(?:hands-on|relevant|solid|strong|proven|total|professional)/i,
]

export function parseExperience(text) {
  if (!text) return null
  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      if (match[2]) return `${match[1]}–${match[2]} years`
      if (match[1]) return `${match[1]}+ years`
    }
  }
  return null
}

// ── SENIORITY EXTRACTION ─────────────────────────────────────
export function parseSeniority(title, description) {
  const combined = `${title || ''} ${description || ''}`.toLowerCase()

  // Check for very senior roles first
  if (/\b(principal|staff|distinguished|fellow|vp|vice president|chief|cto|ceo|c-level)\b/.test(combined)) {
    return 'Lead / Principal'
  }
  if (/\b(senior|sr\.|sr\b|lead|head of|director|manager|architect)\b/.test(combined)) {
    return 'Senior'
  }
  if (/\b(junior|jr\.|jr\b|entry.?level|fresher|graduate|intern|trainee|associate)\b/.test(combined)) {
    return 'Junior / Entry'
  }
  if (/\b(mid.?level|mid-senior|intermediate|3[\s-]5 years|2[\s-]4 years)\b/.test(combined)) {
    return 'Mid-Level'
  }
  return null
}

// ── TECHNOLOGY EXTRACTION ────────────────────────────────────
export function parseTechnologies(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  const result = {}
  let hasAny = false

  for (const [category, terms] of Object.entries(TECH_MAP)) {
    const found = []
    for (const term of terms) {
      // Use word boundary aware check (handles "r" not matching "or")
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i')
      if (regex.test(lower)) {
        // Capitalize nicely
        const display = term
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        found.push(display)
      }
    }
    if (found.length > 0) {
      result[category] = found
      hasAny = true
    }
  }

  return hasAny ? result : null
}

// ── RESPONSIBILITIES EXTRACTION ──────────────────────────────
// Looks for bullet-list sections commonly labeled "Responsibilities", 
// "What You'll Do", "Your Role", "Key Duties", etc.
const RESP_SECTION_HEADERS = [
  'responsibilities', 'what you.?ll do', 'your role', 'key duties',
  'job duties', 'role overview', 'what we.?re looking for',
  'your responsibilities', 'key responsibilities', 'the role', 'about the role',
  'what you will do', 'duties', 'role description',
]

export function parseResponsibilities(text) {
  if (!text) return []

  const lines = text.split(/\n/)
  let inSection = false
  const bullets = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Check if we're entering a responsibilities section
    const isHeader = RESP_SECTION_HEADERS.some(h =>
      new RegExp(`^${h}[:\\s]*$`, 'i').test(line)
    )

    if (isHeader) {
      inSection = true
      continue
    }

    // Exit section if we hit another major header (requirements, etc.)
    if (inSection && /^(requirements?|qualifications?|skills?|what you.?ll need|must.?have|experience|education|benefits?|about us|who are we):?\s*$/i.test(line)) {
      break
    }

    // Collect bullet items within section
    if (inSection) {
      const cleaned = line.replace(/^[-•*·▪▸►◆○●]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
      if (cleaned.length > 20 && cleaned.length < 300) {
        bullets.push(cleaned)
        if (bullets.length >= 6) break // max 6 bullets shown
      }
    }
  }

  // Fallback: if no section found, try to grab any bullet lines from text
  if (bullets.length === 0) {
    const allLines = text.split(/\n/)
    for (const line of allLines) {
      const trimmed = line.trim()
      if (/^[-•*·▪▸►◆○●]\s+\w/.test(trimmed) || /^\d+[.)]\s+\w/.test(trimmed)) {
        const cleaned = trimmed.replace(/^[-•*·▪▸►◆○●]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
        if (cleaned.length > 20 && cleaned.length < 300) {
          bullets.push(cleaned)
          if (bullets.length >= 5) break
        }
      }
    }
  }

  return bullets
}

// ── FULL JD PARSE ────────────────────────────────────────────
/**
 * parseJD(job, scoreData)
 * @param {object} job - the job object (needs title, description)
 * @param {object|null} scoreData - ATS score result { matched, missing, score, tier }
 * @returns {object} structured JD fields
 */
export function parseJD(job, scoreData = null) {
  const desc = job?.description || ''
  const title = job?.title || ''

  return {
    experience: parseExperience(desc),
    seniority: parseSeniority(title, desc),
    technologies: parseTechnologies(desc),
    responsibilities: parseResponsibilities(desc),
    // ATS-powered skills (Option A)
    mustHaveSkills: scoreData?.matched || [],
    missingSkills: scoreData?.missing || [],
    hasScore: !!scoreData && scoreData.score !== null,
  }
}
