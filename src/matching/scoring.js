/**
 * scoring.js — ATS Scoring Bridge
 *
 * This module wraps the smart ATS engine (ats.js) and
 * provides backward-compatible exports used throughout the app:
 *   - scoreJob(candidateInput, job)
 *   - findBestJobMatches(candidateInput, jobs, limit)
 */
import {
  extractSkills,
  detectCandidateDomain,
} from './skills.js'
import {
  smartScoreJob,
  findSmartBestMatches,
} from './ats.js'

/**
 * Score a single job against a candidate's resume/skills.
 *
 * Accepts flexible candidateInput:
 *   - Array of skill strings          → skills-only mode
 *   - Object { text, skills, ... }    → full resume mode (recommended)
 *   - Raw string                      → treated as resume text
 *
 * Returns null if the job cannot be scored.
 */
export function scoreJob(candidateInput, job) {
  if (!job) return null

  // Normalise candidateInput → resumeData object
  let resumeData = null

  if (Array.isArray(candidateInput)) {
    // Array of skills passed — no resume text, build minimal object
    resumeData = {
      skills: candidateInput,
      text: '',
      fileName: '',
      detectedDomain: detectCandidateDomain(candidateInput, '', ''),
    }
  } else if (candidateInput && typeof candidateInput === 'object') {
    // Already a resume data object (the normal app path)
    resumeData = {
      skills: candidateInput.skills || [],
      text: candidateInput.text || candidateInput.rawText || '',
      fileName: candidateInput.fileName || '',
      detectedDomain: candidateInput.detectedDomain || candidateInput.domain || null,
    }
  } else if (typeof candidateInput === 'string' && candidateInput.trim()) {
    // Raw resume text string
    const skills = extractSkills(candidateInput)
    resumeData = {
      skills,
      text: candidateInput,
      fileName: '',
      detectedDomain: detectCandidateDomain(skills, candidateInput, ''),
    }
  }

  if (!resumeData) return null
  if (resumeData.skills.length === 0 && !resumeData.text) return null

  return smartScoreJob(resumeData, job)
}

/**
 * Find top matching jobs for a candidate.
 * Only returns domain-compatible jobs with score >= 55.
 *
 * @param {Array|Object|string} candidateInput - Skills, resume object, or raw text
 * @param {Array}  jobs  - Array of job objects
 * @param {number} limit - Maximum results to return
 */
export function findBestJobMatches(candidateInput, jobs, limit = 5) {
  if (!candidateInput || !jobs || !Array.isArray(jobs) || jobs.length === 0) return []

  // Normalise to resumeData
  let resumeData = null

  if (Array.isArray(candidateInput)) {
    resumeData = {
      skills: candidateInput,
      text: '',
      fileName: '',
      detectedDomain: detectCandidateDomain(candidateInput, '', ''),
    }
  } else if (candidateInput && typeof candidateInput === 'object') {
    resumeData = {
      skills: candidateInput.skills || [],
      text: candidateInput.text || candidateInput.rawText || '',
      fileName: candidateInput.fileName || '',
      detectedDomain: candidateInput.detectedDomain || candidateInput.domain || null,
    }
  } else if (typeof candidateInput === 'string') {
    const skills = extractSkills(candidateInput)
    resumeData = {
      skills,
      text: candidateInput,
      fileName: '',
      detectedDomain: detectCandidateDomain(skills, candidateInput, ''),
    }
  }

  if (!resumeData) return []

  return findSmartBestMatches(resumeData, jobs, limit)
}
