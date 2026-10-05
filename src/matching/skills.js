// Skill Alias Dictionary mapping variations to canonical names
export const SKILL_ALIASES = {
  // Languages & Core
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'py': 'Python',
  'python': 'Python',
  'python3': 'Python',
  'c#': 'C#',
  'csharp': 'C#',
  'c++': 'C++',
  'cpp': 'C++',
  'golang': 'Go',
  'go': 'Go',
  'rust': 'Rust',
  'java': 'Java',
  'php': 'PHP',
  'ruby': 'Ruby',
  'swift': 'Swift',
  'kotlin': 'Kotlin',

  // AI & Data
  'ai': 'Artificial Intelligence',
  'artificial intelligence': 'Artificial Intelligence',
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'dl': 'Deep Learning',
  'deep learning': 'Deep Learning',
  'nlp': 'NLP',
  'natural language processing': 'NLP',
  'cv': 'Computer Vision',
  'computer vision': 'Computer Vision',
  'llm': 'LLM',
  'llms': 'LLM',
  'large language models': 'LLM',
  'generative ai': 'Generative AI',
  'gen ai': 'Generative AI',
  'genai': 'Generative AI',
  'prompt engineering': 'Prompt Engineering',
  'rag': 'RAG',
  'langchain': 'LangChain',
  'llamaindex': 'LlamaIndex',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'keras': 'Keras',
  'scikit-learn': 'Scikit-Learn',
  'sklearn': 'Scikit-Learn',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'spark': 'Apache Spark',
  'apache spark': 'Apache Spark',
  'hadoop': 'Hadoop',
  'tableau': 'Tableau',
  'power bi': 'Power BI',
  'powerbi': 'Power BI',
  'data analytics': 'Data Analytics',
  'data science': 'Data Science',
  'data engineering': 'Data Engineering',

  // Web & Frontend/Backend
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'angular': 'Angular',
  'node': 'Node.js',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'django': 'Django',
  'fastapi': 'FastAPI',
  'flask': 'Flask',
  'spring': 'Spring Boot',
  'spring boot': 'Spring Boot',
  '.net': '.NET',
  'dotnet': '.NET',
  'graphql': 'GraphQL',
  'rest api': 'REST API',
  'restful api': 'REST API',

  // Databases & Cloud
  'sql': 'SQL',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'mongo': 'MongoDB',
  'redis': 'Redis',
  'dynamodb': 'DynamoDB',
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'azure': 'Azure',
  'gcp': 'GCP',
  'google cloud': 'GCP',
  'google cloud platform': 'GCP',
  'docker': 'Docker',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'terraform': 'Terraform',
  'ci/cd': 'CI/CD',
  'devops': 'DevOps',
  'git': 'Git',
  'github': 'Git',
  'gitlab': 'Git',
  'linux': 'Linux',

  // Cybersecurity & Systems
  'cybersecurity': 'Cybersecurity',
  'infosec': 'Cybersecurity',
  'information security': 'Cybersecurity',
  'penetration testing': 'Penetration Testing',
  'soc': 'SOC',
  'siem': 'SIEM',
  'agile': 'Agile',
  'scrum': 'Scrum'
}

// Escape regex special characters safely
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Build exact word-boundary regex for a given phrase
function buildPhraseRegex(phrase) {
  const escaped = escapeRegex(phrase)
  // Check if first/last char is non-word character (like . or # or +)
  const startsWithWordChar = /^\w/.test(phrase)
  const endsWithWordChar = /\w$/.test(phrase)

  const leftBoundary = startsWithWordChar ? '\\b' : '(?:^|\\s|[^\\w])'
  const rightBoundary = endsWithWordChar ? '\\b' : '(?:$|\\s|[^\\w])'

  return new RegExp(`${leftBoundary}${escaped}${rightBoundary}`, 'i')
}

// Compiled regex cache for maximum performance
const COMPILED_REGEX_ENTRIES = Object.entries(SKILL_ALIASES).map(([alias, canonical]) => ({
  alias,
  canonical,
  regex: buildPhraseRegex(alias)
}))

/**
 * Extract canonical skills from raw text using word boundary matching only.
 * No substring false positives (e.g. "digital" will NOT match "git").
 */
export function extractSkills(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return []
  }

  const foundCanonicalSkills = new Set()

  for (const { canonical, regex } of COMPILED_REGEX_ENTRIES) {
    if (regex.test(text)) {
      foundCanonicalSkills.add(canonical)
    }
  }

  return Array.from(foundCanonicalSkills)
}
