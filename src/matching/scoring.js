import { extractSkills } from './skills.js'

/**
 * Score a single job against a candidate's resume/skills.
 * Returns null if the job has fewer than 2 detectable skills.
 */
export function scoreJob(candidateSkillsInput, job) {
  if (!job) return null

  // Support candidate input as an array of skill strings or raw resume text string
  const candidateSkills = Array.isArray(candidateSkillsInput)
    ? candidateSkillsInput
    : extractSkills(candidateSkillsInput || '')

  if (!candidateSkills || candidateSkills.length === 0) {
    return null
  }

  const jobFullText = [
    job.title || '',
    job.company || '',
    job.description || '',
    (job.tags || []).join(' ')
  ].join(' ')

  const jobRequiredSkills = extractSkills(jobFullText)

  // Rule: Return null if job has fewer than 2 detectable skills
  if (jobRequiredSkills.length < 2) {
    return null
  }

  // Calculate Matched & Missing Skills
  const candidateSkillsLower = new Set(candidateSkills.map(s => s.toLowerCase()))
  const matched = jobRequiredSkills.filter(s => candidateSkillsLower.has(s.toLowerCase()))
  const missing = jobRequiredSkills.filter(s => !candidateSkillsLower.has(s.toLowerCase()))

  const reasons = []

  // 1. Skills Weight (max 50 pts)
  const skillMatchRatio = matched.length / Math.max(jobRequiredSkills.length, 1)
  const skillsScore = Math.round(skillMatchRatio * 50)
  reasons.push(`Skills match: ${matched.length}/${jobRequiredSkills.length} required tech skills (+${skillsScore}/50 pts)`)

  // 2. Title Relevance Weight (max 20 pts)
  const titleLower = (job.title || '').toLowerCase()
  let titleScore = 0
  const titleMatchedSkills = candidateSkills.filter(s => titleLower.includes(s.toLowerCase()))
  if (titleMatchedSkills.length > 0 && matched.length > 0) {
    titleScore = Math.min(20, 10 + (titleMatchedSkills.length * 5))
    reasons.push(`Title relevance: Your expertise matches target role title (+${titleScore}/20 pts)`)
  } else {
    titleScore = 5
    reasons.push(`Title relevance: General alignment (+5/20 pts)`)
  }

  // 3. Experience Level Weight (max 15 pts)
  let expScore = 10
  const seniorKeywords = ['senior', 'sr', 'lead', 'principal', 'manager', 'head', 'architect']
  const isSeniorJob = seniorKeywords.some(kw => titleLower.includes(kw))
  const isSeniorCandidate = candidateSkills.length >= 6
  if ((isSeniorJob && isSeniorCandidate) || (!isSeniorJob && !isSeniorCandidate)) {
    expScore = 15
    reasons.push(`Experience level: Profile seniority (+15/15 pts)`)
  } else {
    expScore = 10
    reasons.push(`Experience level: Acceptable seniority range (+10/15 pts)`)
  }

  // 4. Location Weight (max 10 pts)
  let locationScore = 8
  const locationLower = (job.location || '').toLowerCase()
  if (locationLower.includes('dubai') || locationLower.includes('abu dhabi') || locationLower.includes('uae')) {
    locationScore = 10
    reasons.push(`Location: Prime UAE tech hub (+10/10 pts)`)
  } else {
    reasons.push(`Location: UAE regional (+8/10 pts)`)
  }

  // 5. Freshness Weight (max 5 pts)
  let freshnessScore = 3
  if (job.postedDate || job.posted_at || job.first_seen) {
    const rawDate = job.first_seen || job.posted_at || job.postedDate
    const diffHours = (Date.now() - new Date(rawDate).getTime()) / (1000 * 60 * 60)
    if (diffHours <= 48) {
      freshnessScore = 5
      reasons.push(`Freshness: Freshly posted within 48h (+5/5 pts)`)
    } else {
      freshnessScore = 3
      reasons.push(`Freshness: Active listing (+3/5 pts)`)
    }
  } else {
    reasons.push(`Freshness: Active listing (+3/5 pts)`)
  }

  // Calculate Total Score
  let rawTotal = skillsScore + titleScore + expScore + locationScore + freshnessScore

  // STRICT ATS CAP RULES:
  // If candidate has 0 matching skills for a job with required skills, MAX score is 20 (Weak Match)
  if (matched.length === 0 && jobRequiredSkills.length > 0) {
    rawTotal = Math.min(20, rawTotal)
  } else if (skillMatchRatio < 0.3) {
    // Low skill overlap caps at 45 (Stretch Match max)
    rawTotal = Math.min(45, rawTotal)
  } else if (skillMatchRatio < 0.5) {
    // Moderate skill overlap caps at 65 (Good Match max)
    rawTotal = Math.min(65, rawTotal)
  }

  const finalScore = Math.min(95, Math.max(15, rawTotal))

  // Determine Tier
  let tier = 'Weak'
  if (finalScore >= 80) tier = 'Strong'
  else if (finalScore >= 60) tier = 'Good'
  else if (finalScore >= 40) tier = 'Stretch'

  return {
    score: finalScore,
    tier,
    matched,
    missing,
    reasons
  }
}
