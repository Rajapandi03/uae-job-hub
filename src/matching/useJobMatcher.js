import { useState, useEffect, useRef, useMemo } from 'react'
import { scoreJob } from './scoring.js'

/**
 * React hook to trigger off-main-thread job scoring via Web Worker.
 * Falls back synchronously if Web Worker is unavailable.
 */
export function useJobMatcher(candidateSkills, jobs) {
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(false)
  const workerRef = useRef(null)

  const skillsHash = useMemo(() => {
    if (!candidateSkills || !Array.isArray(candidateSkills)) return ''
    return candidateSkills.slice().sort().join('|')
  }, [candidateSkills])

  useEffect(() => {
    if (!candidateSkills || candidateSkills.length === 0 || !jobs || jobs.length === 0) {
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
          candidateSkills,
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
        fallbackResults[job.id] = scoreJob(candidateSkills, job)
      }
    }
    setScores(fallbackResults)
    setLoading(false)
  }, [skillsHash, jobs])

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
