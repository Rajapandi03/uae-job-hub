import { scoreJob } from './scoring.js'

// Web Worker for off-main-thread batch scoring
// Ensures the main UI thread never freezes when scoring 500+ or 1000+ jobs.

const scoreCache = new Map()

self.onmessage = function (e) {
  const { type, candidateSkills, candidateProfile, jobs } = e.data

  if (type === 'SCORE_JOBS') {
    const profile = candidateProfile || { skills: candidateSkills || [] }
    const skillsList = profile.skills || candidateSkills || []

    if (!skillsList || !Array.isArray(skillsList) || skillsList.length === 0 || !jobs || !Array.isArray(jobs)) {
      self.postMessage({ type: 'SCORE_RESULTS', scores: {} })
      return
    }

    const domain = profile.domain || profile.detectedDomain || ''
    // Include a short text fingerprint so resume text changes invalidate cache
    const textFingerprint = (profile.text || '').slice(0, 80).replace(/\s+/g, '')
    const profileHash = `${skillsList.slice().sort().join('|')}::${domain}::${textFingerprint}`
    const results = {}

    for (const job of jobs) {
      if (!job || !job.id) continue

      const cacheKey = `v3_domain::${profileHash}::${job.id}`

      if (scoreCache.has(cacheKey)) {
        results[job.id] = scoreCache.get(cacheKey)
      } else {
        const scored = scoreJob(profile, job)
        scoreCache.set(cacheKey, scored)
        results[job.id] = scored
      }
    }

    self.postMessage({
      type: 'SCORE_RESULTS',
      scores: results,
      skillsHash: profileHash
    })
  }
}
