import { scoreJob } from './scoring.js'

// Web Worker for off-main-thread batch scoring
// Ensures the main UI thread never freezes when scoring 500+ or 1000+ jobs.

const scoreCache = new Map()

self.onmessage = function (e) {
  const { type, candidateSkills, jobs } = e.data

  if (type === 'SCORE_JOBS') {
    if (!candidateSkills || !Array.isArray(candidateSkills) || candidateSkills.length === 0 || !jobs || !Array.isArray(jobs)) {
      self.postMessage({ type: 'SCORE_RESULTS', scores: {} })
      return
    }

    const skillsHash = candidateSkills.slice().sort().join('|')
    const results = {}

    for (const job of jobs) {
      if (!job || !job.id) continue

      const cacheKey = `v2_strict::${skillsHash}::${job.id}`

      if (scoreCache.has(cacheKey)) {
        results[job.id] = scoreCache.get(cacheKey)
      } else {
        const scored = scoreJob(candidateSkills, job)
        scoreCache.set(cacheKey, scored)
        results[job.id] = scored
      }
    }

    self.postMessage({
      type: 'SCORE_RESULTS',
      scores: results,
      skillsHash
    })
  }
}
