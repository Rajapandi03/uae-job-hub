import { useState, useEffect, useRef, useMemo } from 'react'
import { scoreJob } from './scoring.js'

/**
 * React hook to trigger off-main-thread job scoring via Web Worker.
 * Falls back synchronously if Web Worker is unavailable.
 */
export function useJobMatcher(candidateInput, jobs) {
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(false)
  const workerRef = useRef(null)

  const candidateProfile = useMemo(() => {
    if (!candidateInput) return null
    if (Array.isArray(candidateInput)) {
      return { skills: candidateInput }
    }
    return {
      skills: candidateInput.skills || [],
      text: candidateInput.text || '',
      fileName: candidateInput.fileName || '',
      detectedDomain: candidateInput.detectedDomain || null,
      domain: candidateInput.detectedDomain || null
    }
  }, [candidateInput])

  const profileHash = useMemo(() => {
    if (!candidateProfile || !candidateProfile.skills || candidateProfile.skills.length === 0) return ''
    const skills = candidateProfile.skills.slice().sort().join('|')
    const domain = candidateProfile.detectedDomain || candidateProfile.domain || ''
    const textFingerprint = (candidateProfile.text || '').slice(0, 80).replace(/\s+/g, '')
    return `${skills}::${domain}::${textFingerprint}`
  }, [candidateProfile])

  useEffect(() => {
    if (!candidateProfile || !candidateProfile.skills || candidateProfile.skills.length === 0 || !jobs || jobs.length === 0) {
      setScores({})
      setLoading(false)
      return
    }

    setLoading(true)

    // Check Web Worker support
    if (window.Worker) {
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(new URL('./matcherWorker.js', import.meta.url), { type: 'module' })
        }

        const handleWorkerMessage = (e) => {
          if (e.data && e.data.type === 'SCORE_RESULTS') {
            setScores(e.data.scores || {})
            setLoading(false)
          }
        }

        workerRef.current.onmessage = handleWorkerMessage
        workerRef.current.postMessage({
          type: 'SCORE_JOBS',
          candidateProfile,
          candidateSkills: candidateProfile.skills,
          jobs
        })

        return
      } catch (err) {
        console.warn('Web Worker fallback to main thread scoring:', err)
      }
    }

    // Main thread fallback
    const fallbackResults = {}
    for (const job of jobs) {
      if (job && job.id) {
        fallbackResults[job.id] = scoreJob(candidateProfile, job)
      }
    }
    setScores(fallbackResults)
    setLoading(false)
  }, [profileHash, jobs])

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  return { scores, loading }
}
