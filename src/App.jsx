import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Bell,
  Search,
  LayoutDashboard,
  MapPin,
  Clock,
  Briefcase,
  Heart,
  MessageCircle,
  Building2,
  Calendar,
  ArrowRight,
  ChevronRight,
  Send,
  Loader2,
  ExternalLink,
  Filter,
  ArrowLeft,
  Globe,
  Tag,
  Ticket,
  X,
  PlusCircle,
  CheckCircle,
  LogOut,
  User as UserIcon,
  LogIn,
  UserCheck,
  GraduationCap,
  DollarSign,
  Newspaper,
  BookOpen,
  Award,
  AlertTriangle,
  Mail,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import {
  jobs as staticJobs,
  companies,
  events as staticEvents,
  resources,
  browseCategories,
  staticCertificates,
  staticSalaries,
  staticNews,
} from './data/jobs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(dateStr) {
  if (!dateStr) return null
  const posted = new Date(dateStr)
  if (isNaN(posted.getTime())) return null
  const now = new Date()
  const diffMs = now - posted
  if (diffMs < 0) return 'Just now'
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function sourceLabel(source) {
  const labels = {
    linkedin: 'LinkedIn',
    indeed: 'Indeed',
    google: 'Google Jobs',
    bayt: 'Bayt',
    naukrigulf: 'Naukrigulf',
    gulftalent: 'GulfTalent',
    career_page: 'Company Site',
    employer: 'Direct Employer',
  }
  return labels[source] || source
}

function applyLabel(source) {
  return `Apply on ${sourceLabel(source)}`
}

function formatEventDateDisplay(startStr, endStr) {
  if (!startStr) return ''
  const start = new Date(startStr)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const startMonth = monthNames[start.getMonth()]
  const startDay = start.getDate()
  const startYear = start.getFullYear()

  if (endStr && endStr !== startStr) {
    const end = new Date(endStr)
    const endMonth = monthNames[end.getMonth()]
    const endDay = end.getDate()
    if (start.getMonth() === end.getMonth()) {
      return `${startDay} - ${endDay} ${startMonth} ${startYear}`
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`
  }
  return `${startDay} ${startMonth} ${startYear}`
}

function getMonthKey(dateStr) {
  if (!dateStr) return 'Upcoming Events'
  const d = new Date(dateStr)
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${fullMonths[d.getMonth()]} ${d.getFullYear()}`
}

function formatLabel(format) {
  const map = {
    in_person: 'In-Person',
    online: 'Online',
    hybrid: 'Hybrid',
  }
  return map[format] || format
}

function eventTypeLabel(type) {
  const map = {
    conference: 'Conference',
    meetup: 'Meetup',
    workshop: 'Workshop',
    hackathon: 'Hackathon',
    webinar: 'Webinar',
    career_fair: 'Career Fair',
    networking: 'Networking',
  }
  return map[type] || type
}

// ---------------------------------------------------------------------------
// Map DB job to card-friendly format
// ---------------------------------------------------------------------------
function mapDbJob(job) {
  const comp = (job.company && job.company !== 'None' && job.company !== 'nan') ? String(job.company).trim() : 'Hiring Company'
  const title = (job.title && job.title !== 'None' && job.title !== 'nan') ? String(job.title).trim() : 'AI / Tech Specialist'
  const loc = (job.location && job.location !== 'None' && job.location !== 'nan') ? String(job.location).trim() : 'Dubai, UAE'

  // Prefer first_seen over date-only posted_at (midnight timestamps from scrapers)
  // Date-only posted_at values (e.g. "2026-10-02" → midnight) produce wildly inaccurate
  // "X hours ago" labels. first_seen is when our scraper actually discovered the job.
  let bestDate = job.posted_at
  if (bestDate) {
    const d = new Date(bestDate)
    // Detect midnight timestamps (date-only values from scrapers)
    if (!isNaN(d.getTime()) && d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && job.first_seen) {
      bestDate = job.first_seen
    }
  }
  const postedRelative = timeAgo(bestDate) || timeAgo(job.first_seen) || 'Just now'

  return {
    id: job.job_hash,
    title: title,
    company: comp,
    companyInitial: comp.charAt(0).toUpperCase() || 'C',
    industry: sourceLabel(job.source),
    location: loc,
    type: 'Onsite',
    typeColor: '#16a34a',
    level: '',
    postedDate: `Posted ${postedRelative}`,
    updatedDate: '',
    description: (job.description && job.description !== 'None') ? job.description : '',
    tags: [],
    applyUrl: job.apply_url || job.url,
    source: job.source,
    posted_at: job.posted_at,
    first_seen: job.first_seen,
  }
}

function formatDateLabel(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitialView() {
  const path = window.location.pathname
  if (path === '/certificates') return 'certificates'
  if (path === '/salary-report') return 'salary'
  if (path === '/news') return 'news'
  if (path === '/events') return 'events'
  return 'jobs'
}

const viewToPath = {
  jobs: '/',
  events: '/events',
  certificates: '/certificates',
  salary: '/salary-report',
  news: '/news',
}

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------
function App() {
  // Navigation view: 'jobs' | 'hiring' | 'events' | 'certificates' | 'salary' | 'news'
  const [currentView, setCurrentView] = useState(getInitialView)

  // State for live jobs
  const [liveJobs, setLiveJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbConnected, setDbConnected] = useState(false)
  const [showAllCompanies, setShowAllCompanies] = useState(false)
  const [visibleJobsCount, setVisibleJobsCount] = useState(10)
  const [showAllJobs, setShowAllJobs] = useState(false)
  const jobsScrollRef = useRef(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshed, setRefreshed] = useState(false)


  const navigateTo = (view) => {
    setCurrentView(view)
    const path = viewToPath[view] || '/'
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Dynamic SEO: Update document title, description, and meta tags
  useEffect(() => {
    const pageMeta = {
      jobs: {
        title: "Hini – UAE Job Hub | #1 AI Jobs & Tech Jobs in Dubai, Abu Dhabi",
        desc: "Hini is UAE's #1 job hub for AI & tech jobs. 1000+ new AI, machine learning, software & data roles posted in the last 24 hours. Updated every hour. Apply free."
      },
      events: {
        title: "Hini – UAE Tech & AI Events 2026 | Conferences, Meetups & Workshops in Dubai",
        desc: "Explore upcoming AI, tech conferences, hackathons, and developer meetups across Dubai, Abu Dhabi and UAE on Hini."
      },
      certificates: {
        title: "Hini – Top AI & Tech Certifications 2026 | Free Courses in UAE",
        desc: "Boost your tech career in UAE with top certified courses in AI, Machine Learning, Data Science, and Cloud on Hini."
      },
      salary: {
        title: "Hini – UAE Tech & AI Salary Report 2026 | Dubai & Abu Dhabi Pay Benchmarks",
        desc: "Comprehensive UAE tech salary benchmarks on Hini. View salary insights for AI engineers, software developers, data scientists, and DevOps in Dubai."
      },
      news: {
        title: "Hini – UAE Tech & AI News | Latest Updates from Dubai & Abu Dhabi",
        desc: "Stay updated with breaking news on AI developments, startup investments, tech initiatives, and career insights in UAE on Hini."
      }
    }

    const currentMeta = pageMeta[currentView] || pageMeta.jobs
    document.title = currentMeta.title

    let metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', currentMeta.desc)

    let ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', currentMeta.title)

    let ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) ogDesc.setAttribute('content', currentMeta.desc)
  }, [currentView])

  // Inject dynamic Google JobPosting schema tags for live jobs to boost Google Search & Google Jobs indexing
  useEffect(() => {
    if (!liveJobs || liveJobs.length === 0) return

    const existingSchemaScript = document.getElementById('dynamic-job-schema')
    if (existingSchemaScript) existingSchemaScript.remove()

    const schemaData = liveJobs.slice(0, 15).map(job => ({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description || `${job.title} position at ${job.company} in ${job.location}, UAE.`,
      "identifier": {
        "@type": "PropertyValue",
        "name": job.company,
        "value": String(job.id)
      },
      "datePosted": job.posted_at || new Date().toISOString(),
      "validThrough": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      "employmentType": "FULL_TIME",
      "hiringOrganization": {
        "@type": "Organization",
        "name": job.company,
        "sameAs": "https://uae-jobs-hub.vercel.app"
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": (job.location && job.location.includes('Abu Dhabi')) ? 'Abu Dhabi' : 'Dubai',
          "addressCountry": "AE"
        }
      }
    }))

    const script = document.createElement('script')
    script.id = 'dynamic-job-schema'
    script.type = 'application/ld+json'
    script.text = JSON.stringify(schemaData)
    document.head.appendChild(script)

    return () => {
      const el = document.getElementById('dynamic-job-schema')
      if (el) el.remove()
    }
  }, [liveJobs])


  const [savedJobIds, setSavedJobIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('uae_saved_jobs') || '[]')
    } catch {
      return []
    }
  })

  const toggleSaveJob = (jobId) => {
    setSavedJobIds(prev => {
      const next = prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
      try { localStorage.setItem('uae_saved_jobs', JSON.stringify(next)) } catch { }
      return next
    })
  }

  // Resources state (fetched from Supabase table `resource_items` with static fallbacks)
  const [resourcesList, setResourcesList] = useState({
    certificates: staticCertificates,
    salary: staticSalaries,
    news: staticNews,
  })
  const [resourcesLoading, setResourcesLoading] = useState(true)

  useEffect(() => {
    async function fetchResources() {
      if (!supabase) {
        setResourcesLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('resource_items')
          .select('*')
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false })

        if (error) throw error
        if (data && data.length > 0) {
          const certs = data.filter(item => item.type === 'course')
          const salaries = data.filter(item => item.type === 'salary')
          const newsItems = data.filter(item => item.type === 'news')

          setResourcesList({
            certificates: certs.length > 0 ? certs : staticCertificates,
            salary: salaries.length > 0 ? salaries : staticSalaries,
            news: newsItems.length > 0 ? newsItems : staticNews,
          })
        }
      } catch (err) {
        console.warn('Supabase resource_items fetch error, using static fallback:', err.message)
      } finally {
        setResourcesLoading(false)
      }
    }
    fetchResources()
  }, [])

  // Auth State
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup'
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authForm, setAuthForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'recruiter', // 'jobseeker' | 'recruiter'
  })

  // Check initial Auth session and listen for auth state changes
  useEffect(() => {
    if (!supabase) {
      // Fallback: try to restore cached display info (not a real session)
      const savedUser = localStorage.getItem('uae_job_user')
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)) } catch (e) { }
      }
      return
    }

    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {}
        const loggedInUser = {
          id: session.user.id,
          email: session.user.email,
          fullName: meta.full_name || session.user.email.split('@')[0],
          role: meta.role || 'recruiter'
        }
        setUser(loggedInUser)
        localStorage.setItem('uae_job_user', JSON.stringify(loggedInUser))
      }
    }).catch(err => console.warn('Auth session check:', err.message))

    // Listen for real-time auth state changes (token refresh, sign-out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        localStorage.removeItem('uae_job_user')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const meta = session.user.user_metadata || {}
          const updatedUser = {
            id: session.user.id,
            email: session.user.email,
            fullName: meta.full_name || session.user.email.split('@')[0],
            role: meta.role || 'recruiter'
          }
          setUser(updatedUser)
          localStorage.setItem('uae_job_user', JSON.stringify(updatedUser))
        }
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Auth form submit handler
  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      if (authMode === 'login') {
        if (!authForm.email || !authForm.password) {
          setAuthError('Please enter your email and password.')
          setAuthLoading(false)
          return
        }

        let signedInUser = null
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: authForm.email,
            password: authForm.password,
          })
          if (data?.session?.user) {
            const meta = data.session.user.user_metadata || {}
            signedInUser = {
              id: data.session.user.id,
              email: data.session.user.email,
              fullName: meta.full_name || authForm.email.split('@')[0],
              role: meta.role || authForm.role || 'recruiter'
            }
          } else if (error && !error.message.includes('FetchError') && !error.message.includes('Failed to fetch')) {
            setAuthError(error.message)
            setAuthLoading(false)
            return
          }
        }

        if (!signedInUser) {
          signedInUser = {
            id: 'user_' + Date.now(),
            email: authForm.email,
            fullName: authForm.fullName || authForm.email.split('@')[0],
            role: authForm.role || 'recruiter'
          }
        }

        setUser(signedInUser)
        localStorage.setItem('uae_job_user', JSON.stringify(signedInUser))
        setShowAuthModal(false)
        setAuthForm({ fullName: '', email: '', password: '', role: 'recruiter' })
      } else {
        // Sign Up
        if (!authForm.email || !authForm.password || !authForm.fullName) {
          setAuthError('Please fill in all fields to create an account.')
          setAuthLoading(false)
          return
        }

        let newSignedUser = null
        if (supabase) {
          const { data, error } = await supabase.auth.signUp({
            email: authForm.email,
            password: authForm.password,
            options: {
              data: {
                full_name: authForm.fullName,
                role: authForm.role
              }
            }
          })
          if (data?.user) {
            newSignedUser = {
              id: data.user.id,
              email: data.user.email,
              fullName: authForm.fullName,
              role: authForm.role
            }
          } else if (error && !error.message.includes('FetchError') && !error.message.includes('Failed to fetch')) {
            setAuthError(error.message)
            setAuthLoading(false)
            return
          }
        }

        if (!newSignedUser) {
          newSignedUser = {
            id: 'user_' + Date.now(),
            email: authForm.email,
            fullName: authForm.fullName,
            role: authForm.role
          }
        }

        setUser(newSignedUser)
        localStorage.setItem('uae_job_user', JSON.stringify(newSignedUser))
        setShowAuthModal(false)
        setAuthForm({ fullName: '', email: '', password: '', role: 'recruiter' })
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication error')
    } finally {
      setAuthLoading(false)
    }
  }

  // Handle Sign Out
  async function handleSignOut() {
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (e) { }
    }
    setUser(null)
    localStorage.removeItem('uae_job_user')
  }

  // State for live events
  const [eventsList, setEventsList] = useState(staticEvents)
  const [eventsLoading, setEventsLoading] = useState(true)

  // Recruiter Post Job Modal state
  const [showPostJobModal, setShowPostJobModal] = useState(false)
  const [postingJob, setPostingJob] = useState(false)
  const [postJobSuccess, setPostJobSuccess] = useState(false)
  const [postJobData, setPostJobData] = useState({
    title: '',
    company: '',
    location: 'Dubai',
    applyUrl: '',
    description: '',
    recruiterEmail: '',
  })

  // Submit job from Recruiter form
  async function handlePostJobSubmit(e) {
    e.preventDefault()
    if (!postJobData.title || !postJobData.company || !postJobData.applyUrl) return

    setPostingJob(true)
    try {
      const hashSeed = `${postJobData.title.toLowerCase().trim()}|${postJobData.company.toLowerCase().trim()}|${postJobData.location.toLowerCase().trim()}|${Date.now()}`
      let hash = 0
      for (let i = 0; i < hashSeed.length; i++) {
        hash = ((hash << 5) - hash) + hashSeed.charCodeAt(i)
        hash |= 0
      }
      const jobHash = `employer_${Math.abs(hash)}_${Date.now()}`

      const newJobDb = {
        job_hash: jobHash,
        title: postJobData.title.trim(),
        company: postJobData.company.trim(),
        location: postJobData.location,
        url: postJobData.applyUrl.trim(),
        apply_url: postJobData.applyUrl.trim(),
        source: 'employer',
        posted_at: new Date().toISOString(),
        first_seen: new Date().toISOString(),
        description: postJobData.description
          ? `${postJobData.description.trim()}\n\nContact: ${postJobData.recruiterEmail}`
          : `Posted directly by recruiter (${postJobData.recruiterEmail})`,
        active: true
      }

      if (supabase) {
        const { error } = await supabase.from('jobs').insert([newJobDb])
        if (error) console.warn('Supabase job insert warning:', error.message)
      }

      // Add to local state immediately so user sees it right away
      const newJobFormatted = mapDbJob(newJobDb)
      setLiveJobs(prev => [newJobFormatted, ...prev])
      setDbConnected(true)
      setPostJobSuccess(true)

      setTimeout(() => {
        setShowPostJobModal(false)
        setPostJobSuccess(false)
        setPostJobData({ title: '', company: '', location: 'Dubai', applyUrl: '', description: '', recruiterEmail: '' })
      }, 1800)
    } catch (err) {
      console.error('Error submitting job:', err)
    } finally {
      setPostingJob(false)
    }
  }

  // Job Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('All Emirates')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')

  // Event Filter state
  const [eventSearchTerm, setEventSearchTerm] = useState('')
  const [selectedMonthTab, setSelectedMonthTab] = useState('all')
  const [eventCityFilter, setEventCityFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [eventPriceFilter, setEventPriceFilter] = useState('all')
  const [eventFormatFilter, setEventFormatFilter] = useState('all')
  const [eventTimeframeFilter, setEventTimeframeFilter] = useState('all')

  // Fetch jobs from Supabase (used for initial load and auto-refresh)
  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (!supabase) {
      setLoading(false)
      return
    }
    try {
      const cutoff7d = new Date()
      cutoff7d.setDate(cutoff7d.getDate() - 7)
      const cutoffISO = cutoff7d.toISOString()

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('active', true)
        .gte('first_seen', cutoffISO)
        .order('posted_at', { ascending: false, nullsFirst: false })
        .order('first_seen', { ascending: false })
        .limit(1000)

      if (error) throw error
      if (data && data.length > 0) {
        setLiveJobs(data.map(mapDbJob))
        setDbConnected(true)
        // Track the newest job's first_seen as "last updated"
        const newest = data.reduce((a, b) => ((a.first_seen || '') > (b.first_seen || '') ? a : b), data[0])
        setLastUpdated(newest.first_seen || new Date().toISOString())
        if (isRefresh) {
          setRefreshed(true)
          setTimeout(() => setRefreshed(false), 3000)
        }
      }
    } catch (err) {
      console.warn('Supabase jobs fetch failed, using static data:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs(false)
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchJobs(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  // Fetch events from Supabase (start_date >= today, ordered by start_date ASC)
  useEffect(() => {
    async function fetchEvents() {
      if (!supabase) {
        setEventsLoading(false)
        return
      }
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('start_date', todayStr)
          .order('start_date', { ascending: true })

        if (error) throw error
        if (data && data.length > 0) {
          setEventsList(data)
        }
      } catch (err) {
        console.warn('Supabase events fetch failed, using static data:', err.message)
      } finally {
        setEventsLoading(false)
      }
    }
    fetchEvents()
  }, [])


  // Freshness Badge Helper
  function getFreshnessInfo(postedAt, detectedAt) {
    const timeStr = postedAt || detectedAt
    if (!timeStr) return { label: '⚪ Today', class: 'badge-today', mins: 9999 }
    const postTime = new Date(timeStr).getTime()
    if (isNaN(postTime)) return { label: '⚪ Today', class: 'badge-today', mins: 9999 }
    const diffMins = Math.max(0, Math.floor((Date.now() - postTime) / 60000))

    if (diffMins <= 10) return { label: `🔥 ${diffMins}m ago • Very Fresh`, class: 'badge-very-fresh', mins: diffMins }
    if (diffMins <= 30) return { label: `🟢 ${diffMins}m ago • Fresh`, class: 'badge-fresh', mins: diffMins }
    if (diffMins <= 60) return { label: `🔵 ${diffMins}m ago • Recent`, class: 'badge-recent', mins: diffMins }
    
    const hrs = Math.floor(diffMins / 60)
    if (hrs < 24) return { label: `⚪ ${hrs}h ago`, class: 'badge-today', mins: diffMins }
    return { label: '⚪ Today', class: 'badge-today', mins: diffMins }
  }


  // Use live jobs if connected, otherwise static fallback
  const allJobs = dbConnected ? liveJobs : staticJobs

  // Dynamic stats
  const totalJobs = allJobs.length
  const totalCompanies = new Set(allJobs.filter(j => j.company && j.company !== 'Hiring Company').map(j => j.company)).size

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const counts = {}
    allJobs.forEach(j => { if (j.source) counts[j.source] = (counts[j.source] || 0) + 1 })
    const total = allJobs.length || 1
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([src, cnt]) => ({
        source: src,
        label: { linkedin: 'LinkedIn', indeed: 'Indeed', bayt: 'Bayt', google: 'Google Jobs', naukrigulf: 'Naukrigulf', gulftalent: 'GulfTalent', career_page: 'Company Sites', employer: 'Direct Employer' }[src] || src,
        count: cnt,
        pct: Math.round((cnt / total) * 100),
        color: { linkedin: '#0a66c2', indeed: '#2557a7', bayt: '#e8252d', google: '#4285f4', naukrigulf: '#f26522', gulftalent: '#00aeef', career_page: '#7c3aed', employer: '#16a34a' }[src] || '#6b7280',
      }))
  }, [allJobs])

  // Ticker: newest 12 jobs
  const tickerJobs = useMemo(() => {
    return allJobs.slice(0, 12).map(j => ({ title: j.title, company: j.company }))
  }, [allJobs])

  // Last updated relative
  function lastUpdatedLabel(iso) {
    if (!iso) return 'just now'
    const date = new Date(iso)
    if (isNaN(date.getTime())) return 'just now'
    const diffMs = Date.now() - date.getTime()
    if (diffMs < 0) return 'just now'
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  // Clean raw scraper company names
  function cleanCompanyName(raw) {
    if (!raw || raw === 'None' || raw === 'nan') return 'Hiring Company'
    let str = String(raw).trim()
    str = str.split('|')[0]
    str = str.split(', by ')[0]
    str = str.split(' - ')[0]
    str = str.replace(/\b(Inc|LLC|Ltd|FZC|FZ-LLC|Co\.|Corp|Corporation|Group|Holdings|Private Limited|Pvt Ltd|Jobs|Career|Recruitment)\b/gi, '').trim()
    str = str.replace(/[,.-]+$/, '').trim()
    return str || raw
  }

  function getCompanyInitial(name) {
    const cleaned = cleanCompanyName(name)
    const parts = cleaned.split(/\s+/).filter(Boolean)
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return cleaned.substring(0, 2).toUpperCase()
  }

  // Dynamic top companies from live data
  const COMPANY_Gradients = [
    'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
  ]

  const topCompanies = useMemo(() => {
    if (!dbConnected) return companies
    const counts = {}
    allJobs.forEach(j => {
      if (j.company) {
        const cleaned = cleanCompanyName(j.company)
        counts[cleaned] = (counts[cleaned] || 0) + 1
      }
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const toShow = showAllCompanies ? sorted : sorted.slice(0, 10)
    return toShow
      .map(([name, count], i) => ({
        id: i + 1,
        rawName: name,
        name: name,
        initial: getCompanyInitial(name),
        openRoles: count,
        background: COMPANY_Gradients[i % COMPANY_Gradients.length],
      }))
  }, [allJobs, dbConnected, showAllCompanies])

  // Apply job filters
  const filteredJobs = useMemo(() => {
    let result = allJobs

    // Strict UAE safety filter (reject non-UAE URLs/locations like India/Pakistan)
    const NON_UAE_URL_REGEX = /\/(pakistan|india|bangladesh|philippines|egypt|jordan|saudi|qatar|oman|kuwait|bahrain)\//i
    const NON_UAE_LOC_REGEX = /\b(pakistan|india|bangladesh|philippines|egypt|jordan|lebanon|saudi|qatar|oman|kuwait|bahrain|hyderabad|bengaluru|mumbai|delhi|karachi|lahore|islamabad|chennai|pune|gurgaon|noida)\b/i

    // Non-IT job title blocklist (defense in depth - catches stale non-IT jobs in DB)
    const NON_IT_TITLE_REGEX = /\b(nurse|doctor|pharmacist|dentist|physiotherapist|radiologist|surgeon|barista|waiter|waitress|cook|chef|housekeeper|cleaner|hotel manager|concierge|front desk agent|mason|plumber|electrician|carpenter|welder|painter|real estate|property consultant|leasing agent|sales agent|sales executive|sales representative|sales manager|business development manager|business development executive|marketing manager|marketing executive|brand manager|content writer|copywriter|social media manager|accountant|auditor|financial analyst|bookkeeper|tax consultant|hr manager|hr executive|recruiter|receptionist|cashier|office manager|personal assistant|executive assistant|office boy|admin assistant|secretary|legal counsel|paralegal|lawyer|security guard|storekeeper|warehouse manager|facilities manager|tailor|beautician|hair stylist|fashion designer|driver|delivery rider|mechanic|logistics coordinator|logistics manager|supply chain manager|procurement officer|teacher|tutor|nanny|lecturer|mechanical engineer|civil engineer|structural engineer|electrical engineer|field engineer|maintenance engineer|production engineer|manufacturing engineer|piping engineer|hvac engineer|instrumentation engineer|quantity surveyor|site engineer|process engineer|plant engineer|welding engineer|marine engineer|chemical engineer|petroleum engineer|safety engineer|quality inspector|drilling engineer|operations manager|store manager|retail manager|general manager)\b/i

    result = result.filter(j => {
      const u = (j.applyUrl || j.url || '').toLowerCase()
      const loc = (j.location || '').toLowerCase()
      const title = (j.title || '').toLowerCase()
      if (NON_UAE_URL_REGEX.test(u) || NON_UAE_LOC_REGEX.test(loc)) return false
      if (NON_IT_TITLE_REGEX.test(title)) return false
      return true
    })

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q))
      )
    }

    if (locationFilter !== 'All Emirates') {
      result = result.filter(j =>
        j.location.toLowerCase().includes(locationFilter.toLowerCase())
      )
    }

    if (sourceFilter !== 'all') {
      result = result.filter(j => j.source === sourceFilter)
    }

    if (timeFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date(now)
      if (timeFilter === '1h') cutoff.setTime(now.getTime() - 1 * 60 * 60 * 1000)
      else if (timeFilter === '6h') cutoff.setTime(now.getTime() - 6 * 60 * 60 * 1000)
      else if (timeFilter === '12h') cutoff.setTime(now.getTime() - 12 * 60 * 60 * 1000)
      else if (timeFilter === '24h') cutoff.setTime(now.getTime() - 24 * 60 * 60 * 1000)
      else if (timeFilter === '3d') cutoff.setTime(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      result = result.filter(j => {
        // Use the best available date: prefer non-midnight posted_at, else first_seen
        let bestD = null
        if (j.posted_at) {
          const pa = new Date(j.posted_at)
          if (!isNaN(pa.getTime())) {
            // Check if it's a midnight timestamp (date-only from scraper)
            const isMidnight = pa.getUTCHours() === 0 && pa.getUTCMinutes() === 0 && pa.getUTCSeconds() === 0
            if (!isMidnight) {
              bestD = pa
            }
          }
        }
        if (!bestD && j.first_seen) {
          const fs = new Date(j.first_seen)
          if (!isNaN(fs.getTime())) bestD = fs
        }
        if (!bestD && j.posted_at) {
          bestD = new Date(j.posted_at) // fallback to midnight posted_at
        }
        return bestD && bestD >= cutoff
      })
    }

    if (levelFilter !== 'all') {
      const seniorKeywords = ['senior', 'sr', 'sr.', 'lead', 'principal', 'manager', 'director', 'head', 'chief', 'vp', 'architect']
      const fresherKeywords = ['fresher', 'junior', 'jr', 'jr.', 'entry', 'intern', 'internship', 'graduate', 'associate', 'trainee']

      result = result.filter(j => {
        const title = j.title.toLowerCase()
        const desc = (j.description || '').toLowerCase()
        const isSenior = seniorKeywords.some(kw => title.includes(kw))
        const isFresher = fresherKeywords.some(kw => title.includes(kw) || desc.includes(kw))

        if (levelFilter === 'fresher') return isFresher
        if (levelFilter === 'entry') return isFresher
        if (levelFilter === 'senior') return isSenior
        if (levelFilter === 'mid') return !isSenior && !isFresher
        return true
      })
    }

    // Always sort by newest first — prefer first_seen (exact scraper discovery time)
    // over posted_at which is often a midnight timestamp from date-only scraper data
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.first_seen || a.posted_at || 0).getTime()
      const dateB = new Date(b.first_seen || b.posted_at || 0).getTime()
      return dateB - dateA
    })

    return result
  }, [allJobs, searchTerm, locationFilter, sourceFilter, timeFilter, levelFilter])

  useEffect(() => {
    setVisibleJobsCount(10)
    setShowAllJobs(false)
  }, [searchTerm, locationFilter, sourceFilter, timeFilter, levelFilter])

  const availableSources = useMemo(() => {
    const srcs = new Set(allJobs.map(j => j.source).filter(Boolean))
    return Array.from(srcs).sort()
  }, [allJobs])

  // Filtered Events
  const filteredEvents = useMemo(() => {
    let result = eventsList

    if (eventSearchTerm.trim()) {
      const q = eventSearchTerm.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.organizer && e.organizer.toLowerCase().includes(q)) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q))
      )
    }

    if (selectedMonthTab !== 'all') {
      result = result.filter(e => {
        if (!e.start_date) return false
        const d = new Date(e.start_date)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return monthKey === selectedMonthTab
      })
    }

    if (eventCityFilter !== 'all') {
      result = result.filter(e => e.city && e.city.toLowerCase() === eventCityFilter.toLowerCase())
    }

    if (eventTypeFilter !== 'all') {
      result = result.filter(e => e.event_type === eventTypeFilter)
    }

    if (eventPriceFilter !== 'all') {
      if (eventPriceFilter === 'free') {
        result = result.filter(e => e.is_free === true)
      } else if (eventPriceFilter === 'paid') {
        result = result.filter(e => e.is_free === false || (e.price_text && e.price_text.toLowerCase() !== 'free'))
      }
    }

    if (eventFormatFilter !== 'all') {
      result = result.filter(e => e.format === eventFormatFilter)
    }

    if (eventTimeframeFilter !== 'all') {
      const now = new Date()
      result = result.filter(e => {
        if (!e.start_date) return false
        const eventDate = new Date(e.start_date)
        if (eventTimeframeFilter === 'week') {
          const nextWeek = new Date(now)
          nextWeek.setDate(now.getDate() + 7)
          return eventDate >= now && eventDate <= nextWeek
        } else if (eventTimeframeFilter === 'month') {
          return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()
        }
        return true
      })
    }

    return result
  }, [eventsList, eventSearchTerm, selectedMonthTab, eventCityFilter, eventTypeFilter, eventPriceFilter, eventFormatFilter, eventTimeframeFilter])

  // Month Tabs List
  const monthTabs = useMemo(() => {
    const tabsMap = new Map()
    eventsList.forEach(e => {
      if (e.start_date) {
        const d = new Date(e.start_date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
        if (!tabsMap.has(key)) {
          tabsMap.set(key, label)
        }
      }
    })
    return Array.from(tabsMap.entries()).map(([key, label]) => ({ key, label }))
  }, [eventsList])

  // Events Grouped By Month
  const eventsByMonth = useMemo(() => {
    const groups = {}
    filteredEvents.forEach(e => {
      const monthTitle = getMonthKey(e.start_date)
      if (!groups[monthTitle]) {
        groups[monthTitle] = []
      }
      groups[monthTitle].push(e)
    })
    return groups
  }, [filteredEvents])

  // Unique cities from events
  const eventCities = useMemo(() => {
    const cities = new Set(eventsList.map(e => e.city).filter(Boolean))
    return Array.from(cities).sort()
  }, [eventsList])

  return (
    <div className="app">

      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => navigateTo('jobs')}>
          <span className="nav-wordmark">Hini</span><span className="nav-wordmark-uae"> UAE Job Hub</span>
        </div>
        <div className="nav-links">
          <a href="/" className={currentView === 'jobs' ? 'active-link' : ''} onClick={(e) => { e.preventDefault(); navigateTo('jobs') }}>Find Jobs</a>
          <a href="/hiring-posts" className={currentView === 'hiring' ? 'active-link' : ''} onClick={(e) => { e.preventDefault(); navigateTo('hiring') }}>🚀 Hiring Posts</a>
          <a href="#companies-section" onClick={(e) => { e.preventDefault(); navigateTo('jobs'); setTimeout(() => document.getElementById('companies-section')?.scrollIntoView({ behavior: 'smooth' }), 100) }}>Companies</a>
          <a href="/events" className={currentView === 'events' ? 'active-link' : ''} onClick={(e) => { e.preventDefault(); navigateTo('events') }}>Events</a>
          <a href="/certificates" className={['certificates', 'salary', 'news'].includes(currentView) ? 'active-link' : ''} onClick={(e) => { e.preventDefault(); navigateTo('certificates') }}>Resources</a>
        </div>
        <div className="nav-actions">
          <div className="nav-live-pill" title="Live data updated automatically" style={{ gap: '0.4rem', padding: '0.35rem 0.75rem' }}>
            <span className="live-dot" />
            <span className="nav-live-count" style={{ fontWeight: '500' }}>Updated {lastUpdated ? lastUpdatedLabel(lastUpdated) : 'just now'}</span>
          </div>
        </div>
      </nav>

      {/* ===== VIEW CONDITIONAL RENDERING ===== */}
      {currentView === 'events' ? (
        /* ==================== FULL EVENTS VIEW ==================== */
        <section className="section-events-page">
          <div className="events-view-container">
            <button className="events-nav-back" onClick={() => setCurrentView('jobs')}>
              <ArrowLeft size={16} /> Back to Jobs
            </button>

            <div className="section-title" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h2>UAE AI & Tech Events</h2>
              <p>Discover conferences, hackathons, workshops, and tech meetups across the UAE</p>
            </div>

            {/* Event Search & Filters */}
            <div className="filter-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="search-box" style={{ flex: '1 1 280px', margin: 0, padding: '0.4rem 1rem' }}>
                <Search size={16} style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Search events by title, organizer, city..."
                  value={eventSearchTerm}
                  onChange={(e) => setEventSearchTerm(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', padding: '0.5rem' }}
                />
              </div>
              <div className="filter-group" style={{ flexWrap: 'wrap' }}>
                <Filter size={16} />
                <select value={eventCityFilter} onChange={(e) => setEventCityFilter(e.target.value)}>
                  <option value="all">All Cities</option>
                  {eventCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
                  <option value="all">All Event Types</option>
                  <option value="conference">Conference</option>
                  <option value="meetup">Meetup</option>
                  <option value="workshop">Workshop</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="webinar">Webinar</option>
                  <option value="career_fair">Career Fair</option>
                  <option value="networking">Networking</option>
                </select>
                <select value={eventPriceFilter} onChange={(e) => setEventPriceFilter(e.target.value)}>
                  <option value="all">All Prices</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
                <select value={eventFormatFilter} onChange={(e) => setEventFormatFilter(e.target.value)}>
                  <option value="all">All Formats</option>
                  <option value="in_person">In-Person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <select value={eventTimeframeFilter} onChange={(e) => setEventTimeframeFilter(e.target.value)}>
                  <option value="all">All Timeframes</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>

            {/* Month Tabs Bar */}
            {monthTabs.length > 0 && (
              <div className="month-tabs-bar">
                <button
                  className={`month-tab ${selectedMonthTab === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedMonthTab('all')}
                >
                  All Months
                </button>
                {monthTabs.map(tab => (
                  <button
                    key={tab.key}
                    className={`month-tab ${selectedMonthTab === tab.key ? 'active' : ''}`}
                    onClick={() => setSelectedMonthTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Loading State */}
            {eventsLoading && (
              <div className="loading-state">
                <Loader2 size={24} className="spin" />
                <p>Loading upcoming tech & AI events...</p>
              </div>
            )}

            {/* Empty State */}
            {!eventsLoading && filteredEvents.length === 0 && (
              <div className="empty-state">
                <Calendar size={48} />
                <h3>No events found</h3>
                <p>Try adjusting your search query or filters.</p>
              </div>
            )}

            {/* Events Grouped By Month */}
            {!eventsLoading && Object.keys(eventsByMonth).map((monthTitle) => (
              <div className="month-group" key={monthTitle}>
                <h3 className="month-title">
                  <Calendar size={20} style={{ color: 'var(--primary)' }} />
                  {monthTitle}
                </h3>
                <div className="events-grid">
                  {eventsByMonth[monthTitle].map((event) => (
                    <div className="event-full-card" key={event.event_hash || event.title + event.start_date}>
                      <div>
                        <div className="event-card-top">
                          <div className="event-date-box">
                            <Clock size={14} />
                            {formatEventDateDisplay(event.start_date, event.end_date)}
                          </div>
                        </div>
                        <h4 className="event-card-title">{event.title}</h4>
                        <div className="event-card-organizer">
                          {event.organizer ? `Organized by ${event.organizer}` : 'UAE AI Event'}
                        </div>
                        <div className="event-card-badges">
                          {event.event_type && (
                            <span className="event-badge event-badge-type">
                              {eventTypeLabel(event.event_type)}
                            </span>
                          )}
                          {event.format && (
                            <span className="event-badge event-badge-format">
                              {formatLabel(event.format)}
                            </span>
                          )}
                          {event.is_free === true ? (
                            <span className="event-badge event-badge-free">Free</span>
                          ) : event.is_free === false ? (
                            <span className="event-badge event-badge-paid">
                              {event.price_text || 'Paid'}
                            </span>
                          ) : (
                            <span className="event-badge event-badge-unknown">Check website</span>
                          )}
                        </div>
                      </div>

                      <div className="event-card-footer">
                        <div className="event-location-text">
                          <MapPin size={14} />
                          {event.venue ? `${event.venue}, ${event.city}` : event.city || 'UAE'}
                        </div>
                        <a
                          href={event.registration_url || event.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-register"
                        >
                          Register <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : currentView === 'certificates' ? (
        /* ==================== CERTIFICATES PAGE ==================== */
        <section className="section-resource-page">
          <div className="resource-view-container">
            <button className="events-nav-back" onClick={() => navigateTo('jobs')}>
              <ArrowLeft size={16} /> Back to Jobs
            </button>

            <div className="section-title" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h2><GraduationCap size={28} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#7c3aed' }} /> Free & Paid AI Certificates</h2>
              <p>Verified cloud & AI certifications from Google, AWS, Microsoft, and DeepLearning.AI</p>
            </div>

            <div className="resource-subnav">
              <button className="subnav-btn active" onClick={() => navigateTo('certificates')}>Certificates</button>
              <button className="subnav-btn" onClick={() => navigateTo('salary')}>Salary Report 2026</button>
              <button className="subnav-btn" onClick={() => navigateTo('news')}>Daily UAE News</button>
            </div>

            {resourcesLoading ? (
              <div className="loading-state">
                <Loader2 size={24} className="spin" />
                <p>Loading certificate programs...</p>
              </div>
            ) : resourcesList.certificates.length === 0 ? (
              <div className="empty-state">
                <GraduationCap size={48} />
                <h3>No certificate resources found</h3>
                <p>Check back soon for new AI course updates.</p>
              </div>
            ) : (
              <div className="resource-items-grid">
                {resourcesList.certificates.map((cert, idx) => (
                  <div className="resource-detail-card" key={cert.id || idx}>
                    <div className="resource-card-header">
                      <span className="resource-source-badge">{cert.source || 'Cloud Certification'}</span>
                      {cert.price_text ? (
                        <span className="resource-price-badge">{cert.price_text}</span>
                      ) : (
                        <span className="resource-price-badge unknown">Check website</span>
                      )}
                    </div>
                    <h3 className="resource-card-title">{cert.title}</h3>
                    {cert.summary && <p className="resource-card-summary">{cert.summary}</p>}
                    <div className="resource-card-footer">
                      <span className="resource-updated-label">
                        {cert.updated_at ? `Updated ${formatDateLabel(cert.updated_at)}` : ''}
                      </span>
                      {cert.link && (
                        <a href={cert.link} target="_blank" rel="noopener noreferrer" className="btn-resource-action">
                          Explore Course <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : currentView === 'salary' ? (
        /* ==================== SALARY REPORT PAGE ==================== */
        <section className="section-resource-page">
          <div className="resource-view-container">
            <button className="events-nav-back" onClick={() => navigateTo('jobs')}>
              <ArrowLeft size={16} /> Back to Jobs
            </button>

            <div className="section-title" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h2><DollarSign size={28} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#16a34a' }} /> UAE AI Salary Report 2026</h2>
              <p>Monthly compensation benchmarks for AI, Machine Learning, and Data Science roles in the UAE</p>
            </div>

            <div className="resource-subnav">
              <button className="subnav-btn" onClick={() => navigateTo('certificates')}>Certificates</button>
              <button className="subnav-btn active" onClick={() => navigateTo('salary')}>Salary Report 2026</button>
              <button className="subnav-btn" onClick={() => navigateTo('news')}>Daily UAE News</button>
            </div>

            {resourcesLoading ? (
              <div className="loading-state">
                <Loader2 size={24} className="spin" />
                <p>Loading salary benchmarks...</p>
              </div>
            ) : resourcesList.salary.length === 0 ? (
              <div className="empty-state">
                <DollarSign size={48} />
                <h3>No salary data found</h3>
                <p>Updating latest market figures...</p>
              </div>
            ) : (
              <div className="resource-items-grid">
                {resourcesList.salary.map((sal, idx) => (
                  <div className="resource-detail-card salary-card" key={sal.id || idx}>
                    <div className="resource-card-header">
                      <span className="resource-source-badge">{sal.source || 'Industry Benchmark'}</span>
                    </div>
                    <h3 className="resource-card-title">{sal.title}</h3>
                    <div className="salary-amount-display">{sal.price_text}</div>
                    {sal.summary && <p className="resource-card-summary">{sal.summary}</p>}
                    <div className="resource-card-footer">
                      <span className="resource-updated-label">
                        {sal.updated_at ? `Updated ${formatDateLabel(sal.updated_at)}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : currentView === 'news' ? (
        /* ==================== DAILY UAE NEWS PAGE ==================== */
        <section className="section-resource-page">
          <div className="resource-view-container">
            <button className="events-nav-back" onClick={() => navigateTo('jobs')}>
              <ArrowLeft size={16} /> Back to Jobs
            </button>

            <div className="section-title" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h2><Newspaper size={28} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#0ea5e9' }} /> Daily UAE AI & Tech News</h2>
              <p>Latest headlines and coverage on UAE artificial intelligence, tech investments, and hiring</p>
            </div>

            <div className="resource-subnav">
              <button className="subnav-btn" onClick={() => navigateTo('certificates')}>Certificates</button>
              <button className="subnav-btn" onClick={() => navigateTo('salary')}>Salary Report 2026</button>
              <button className="subnav-btn active" onClick={() => navigateTo('news')}>Daily UAE News</button>
            </div>

            {resourcesLoading ? (
              <div className="loading-state">
                <Loader2 size={24} className="spin" />
                <p>Fetching latest tech news...</p>
              </div>
            ) : resourcesList.news.length === 0 ? (
              <div className="empty-state">
                <Newspaper size={48} />
                <h3>No news stories available</h3>
                <p>Check back shortly for news updates.</p>
              </div>
            ) : (
              <div className="news-items-list">
                {resourcesList.news.map((item, idx) => (
                  <div className="news-detail-card" key={item.id || idx}>
                    <div className="news-card-meta">
                      <span className="news-source">{item.source || 'Google News'}</span>
                      {item.published_at && (
                        <span className="news-time"><Clock size={12} /> {timeAgo(item.published_at)}</span>
                      )}
                    </div>
                    <h3 className="news-card-title">{item.title}</h3>
                    <div className="news-card-footer">
                      <span className="resource-updated-label">
                        {item.updated_at ? `Updated ${formatDateLabel(item.updated_at)}` : ''}
                      </span>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn-read-news">
                          Read Original Article <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        /* ==================== HOMEPAGE (JOBS VIEW) ==================== */
        <>
          {/* ===== HERO ===== */}
          <section className="hero">
            <div className="hero-content">
              <h1>Hini – Your <span className="highlight">UAE Job Hub</span> for AI & Tech Careers</h1>
              <p>{loading ? 'Discover' : `${totalJobs}+`} live AI, Data & Tech roles from LinkedIn, Indeed & Bayt — all in one place. Updated every hour, apply in one click.</p>

              <div className="hero-stats">
                <div className="stat">
                  <h3 className="stat-number">{loading ? '...' : `${totalJobs}`}<span className="stat-plus">+</span></h3>
                  <p className="stat-label">Active AI Jobs</p>
                </div>
                <div className="stat">
                  <h3 className="stat-number">{loading ? '...' : `${totalCompanies}`}<span className="stat-plus">+</span></h3>
                  <p className="stat-label">Companies Hiring</p>
                </div>
                <div className="stat">
                  <h3 className="stat-number">3</h3>
                  <p className="stat-label">Top Sources</p>
                </div>
              </div>
            </div>
            <div className="hero-image">
              <img src="/dubai-skyline.png" alt="Hini UAE Job Hub – AI and Tech Jobs in Dubai, Abu Dhabi" />
            </div>
          </section>

          {/* ===== JOBS TICKER ===== */}
          {!loading && tickerJobs.length > 0 && (
            <div className="ticker-wrap">
              <span className="ticker-badge">New</span>
              <div className="ticker-track">
                <div className="ticker-content">
                  {[...tickerJobs, ...tickerJobs].map((j, i) => (
                    <span key={i} className="ticker-item">
                      <span className="ticker-title">{j.title}</span>
                      <span className="ticker-at">@</span>
                      <span className="ticker-company">{j.company}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}



          {/* ===== LATEST JOBS ===== */}
          <section className="section-jobs" id="jobs-section">
            <div className="section-title">
              <h2>Latest AI Opportunities</h2>
              <p>Discover roles that match your expertise and aspirations</p>
            </div>

            {/* Global Search Bar */}
            <div className="search-box" style={{ maxWidth: '800px', margin: '0 auto 2rem auto', paddingLeft: '1rem' }}>
              <Search size={20} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search AI jobs by title, skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '0.75rem' }}
              />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={{ borderLeft: '1px solid var(--border)' }}
              >
                <option>All Emirates</option>
                <option>Dubai</option>
                <option>Abu Dhabi</option>
                <option>Sharjah</option>
                <option>Ajman</option>
                <option>Ras Al Khaimah</option>
              </select>
            </div>

            {/* Filter bar */}
            {dbConnected && (
              <div className="filter-bar">
                <div className="filter-group">
                  <Filter size={16} />
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                    <option value="all">All Sources</option>
                    {availableSources.map(s => (
                      <option key={s} value={s}>{sourceLabel(s)}</option>
                    ))}
                  </select>
                  <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                    <option value="all">All Levels</option>
                    <option value="fresher">Fresher</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                  </select>
                  <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                    <option value="all">All (Last 7 Days)</option>
                    <option value="1h">Last 1 Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="12h">Last 12 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="3d">Last 3 Days</option>
                  </select>
                  {dbConnected && (
                    <span className="filter-live-badge">• Live from DB</span>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Jobs Container */}
            <div className={`jobs-scroll-wrapper ${showAllJobs ? 'expanded' : ''}`}>
              {showAllJobs && (
                <div className="jobs-scroll-header">
                  <div className="jobs-scroll-header-info">
                    <Briefcase size={18} />
                    <span>Showing all <strong>{filteredJobs.length}</strong> jobs</span>
                    <span className="jobs-scroll-hint">↕ Scroll inside to browse</span>
                  </div>
                  <button
                    className="btn-collapse-jobs"
                    onClick={() => {
                      setShowAllJobs(false)
                      setVisibleJobsCount(10)
                      document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    ✕ Collapse
                  </button>
                </div>
              )}
              <div
                className={`jobs-container ${showAllJobs ? 'jobs-container-scrollable' : ''}`}
                ref={jobsScrollRef}
              >
                {/* Loading state */}
                {loading && (
                  <div className="loading-state">
                    <Loader2 size={24} className="spin" />
                    <p>Fetching latest jobs...</p>
                  </div>
                )}

                {/* Empty state */}
                {!loading && filteredJobs.length === 0 && (
                  <div className="empty-state">
                    <Search size={48} />
                    <h3>No jobs found</h3>
                    <p>Try adjusting your search or filters.</p>
                  </div>
                )}

                {/* Job Cards */}
                {!loading && (showAllJobs ? filteredJobs : filteredJobs.slice(0, visibleJobsCount)).map((job) => (
                  <div className="job-card" key={job.id}>
                    <div className="job-card-top">
                      <div className="company-logo">{job.companyInitial}</div>
                      <div className="job-header">
                        <h3 className="job-title">{job.title}</h3>
                        <div className="job-company">{job.company} • {job.industry}</div>
                      </div>
                    </div>

                    <div className="job-details">
                      <div className="job-meta">
                        <div className="meta-item"><MapPin size={14} /> {job.location}</div>
                        {job.source && (
                          <div className="meta-item">
                            <span className={`source-badge source-${job.source}`}>
                              {sourceLabel(job.source)}
                            </span>
                          </div>
                        )}
                        {job.postedDate && (
                          <div className="meta-item"><Clock size={14} /> {job.postedDate}</div>
                        )}
                      </div>

                      {job.description && (
                        <p className="job-desc">
                          {job.description.replace(/\*\*/g, '').substring(0, 200)}...
                        </p>
                      )}

                      {job.tags && job.tags.length > 0 && (
                        <div className="job-tags">
                          {job.tags.map((tag, i) => (
                            <span className="tag" key={i}>{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="job-card-footer">
                        <div className="job-social-actions">
                          <button
                            className={`icon-btn ${savedJobIds.includes(job.id) ? 'saved' : ''}`}
                            title={savedJobIds.includes(job.id) ? "Unsave Job" : "Save Job"}
                            onClick={() => toggleSaveJob(job.id)}
                            style={{ color: savedJobIds.includes(job.id) ? '#ef4444' : undefined }}
                          >
                            <Heart size={18} fill={savedJobIds.includes(job.id) ? '#ef4444' : 'none'} />
                          </button>
                          <button
                            className="icon-btn whatsapp"
                            title="Share on WhatsApp"
                            onClick={() => {
                              const text = `Check out this job opportunity in UAE: ${job.title} at ${job.company}\n${job.applyUrl || job.url || ''}`
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
                            }}
                          >
                            <MessageCircle size={18} />
                          </button>
                        </div>
                        <a
                          href={job.applyUrl || job.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-apply"
                        >
                          {job.source ? applyLabel(job.source) : 'Apply Now'}
                          <ExternalLink size={14} style={{ marginLeft: 4 }} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}

                {/* "Back to Top" button inside scrollable area */}
                {showAllJobs && filteredJobs.length > 10 && (
                  <div className="btn-outline-center jobs-scroll-bottom-actions">
                    <button
                      className="btn-outline"
                      onClick={() => {
                        if (jobsScrollRef.current) {
                          jobsScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                    >
                      ↑ Scroll to Top
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => {
                        setShowAllJobs(false)
                        setVisibleJobsCount(10)
                        document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      ✕ Collapse Jobs
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* View All / Show Less buttons (outside scrollable container) */}
            {!showAllJobs && filteredJobs.length > visibleJobsCount && (
              <div className="btn-outline-center">
                <button
                  className="btn-outline btn-view-all-jobs"
                  onClick={() => {
                    setShowAllJobs(true)
                    setVisibleJobsCount(filteredJobs.length)
                    setTimeout(() => {
                      const container = document.querySelector('.jobs-scroll-wrapper')
                      if (container) {
                        const yOffset = -90 // header offset
                        const y = container.getBoundingClientRect().top + window.pageYOffset + yOffset
                        window.scrollTo({ top: y, behavior: 'smooth' })
                      }
                      if (jobsScrollRef.current) {
                        jobsScrollRef.current.scrollTop = 0
                      }
                    }, 50)
                  }}
                >
                  View All {filteredJobs.length} Jobs →
                </button>
              </div>
            )}
          </section>

          {/* ===== LEADING COMPANIES ===== */}
          <section className="section-companies" id="companies-section">
            <div className="section-title">
              <h2>Leading Companies using AI in the UAE</h2>
              <p>Discover the innovative organisations shaping the future</p>
            </div>
            <div className="companies-grid">
              {topCompanies.map((c) => (
                <div
                  className="company-card"
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSearchTerm(c.name)
                    document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <div className="company-card-icon" style={{ background: c.background }}>
                    {c.initial}
                  </div>
                  <div className="company-card-name">{c.name}</div>
                  <div className="company-card-roles">{c.openRoles} open {c.openRoles === 1 ? 'role' : 'roles'}</div>
                </div>
              ))}
            </div>
            <div className="btn-outline-center" style={{ marginTop: '2rem' }}>
              <button
                className="btn-outline"
                onClick={() => setShowAllCompanies(!showAllCompanies)}
              >
                {showAllCompanies ? 'Show Top 10 Companies ↑' : `View All ${totalCompanies} Companies ↓`}
              </button>
            </div>
          </section>

          {/* ===== COMMUNITY & GROWTH ===== */}
          <section className="section-community">
            <div className="section-title">
              <h2>Community & Growth</h2>
              <p>Connect, learn, and advance your AI career</p>
            </div>
            <div className="community-grid">
              <div className="events-col" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>Upcoming AI Events</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {eventsList.slice(0, 3).map((event) => (
                    <div
                      className="resource-card"
                      key={event.event_hash || event.title}
                      onClick={() => setCurrentView('events')}
                      style={{ cursor: 'pointer', marginBottom: 0, flex: 1, display: 'flex' }}
                    >
                      <div className="resource-icon"><Calendar size={22} /></div>
                      <div className="resource-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', flex: 1 }}>
                        <div>
                          <div className="resource-title">{event.title}</div>
                          <div className="resource-desc" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.8rem' }}>
                            <span><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> {formatEventDateDisplay(event.start_date, event.end_date)}</span>
                            <span><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> {event.city}</span>
                          </div>
                        </div>
                        <span className="resource-link">View Event Details <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn-outline" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={() => setCurrentView('events')}>
                  Show More Events <ArrowRight size={16} />
                </button>
              </div>
              <div className="resources-col" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>Career Resources</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {resources.map((res) => {
                    const IconLookup = { GraduationCap, DollarSign, Newspaper }
                    const IconComponent = IconLookup[res.iconName] || BookOpen
                    return (
                      <div
                        className="resource-card"
                        key={res.id}
                        onClick={() => navigateTo(res.view)}
                        style={{ cursor: 'pointer', marginBottom: 0, flex: 1, display: 'flex' }}
                      >
                        <div className="resource-icon"><IconComponent size={22} /></div>
                        <div className="resource-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', flex: 1 }}>
                          <div>
                            <div className="resource-title">{res.title}</div>
                            <div className="resource-desc">{res.description}</div>
                          </div>
                          <span className="resource-link" style={{ marginTop: '0.8rem' }}>{res.linkText} <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ===== EMPLOYER CTA ===== */}
          <section className="section-employer-cta">
            <h2>Build your AI dream team, right here in the UAE</h2>
            <p>Join 65+ companies already hiring through Hini – UAE Job Hub. We connect you with pre-vetted AI professionals who are ready to make an impact.</p>
            <div className="cta-buttons">
              <button className="btn-cta-primary" onClick={() => setShowPostJobModal(true)}>Post Your First Job</button>
              <button className="btn-cta-outline" onClick={() => setShowPostJobModal(true)}>Recruiter Portal</button>
            </div>
          </section>

          {/* ===== FINAL CTA ===== */}
          <section className="section-final-cta">
            <h2>Ready to advance your AI career in the UAE?</h2>
            <p>Join thousands of AI professionals who've found their dream jobs through our platform.</p>
            <div className="final-cta-buttons">
              <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={() => document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })}>Browse All Jobs</button>
            </div>
            <div className="final-cta-note">
              <span style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500' }}>100% Free Forever • No Subscriptions • Built for Job Seekers</span>
              <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'inline-block', maxWidth: '600px', lineHeight: '1.5' }}>
                <span style={{ fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '0.4rem' }}>👋</span>
                I built this platform completely free to help you land your dream role. If you get hired, <a href="https://www.linkedin.com/in/rajapandi6/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none', borderBottom: '1px solid var(--primary)' }}>message me on LinkedIn</a> so I can celebrate with you! (Please report any website issues there too.)
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="nav-brand" style={{ color: 'white', marginBottom: '0.75rem', cursor: 'pointer' }} onClick={() => setCurrentView('jobs')}>
              <span className="footer-wordmark">Hini – UAE Job Hub</span>
            </div>
            <p className="footer-brand-desc">
              Connecting AI talent with opportunities across the United Arab Emirates.
            </p>
          </div>
          <div className="footer-col">
            <h4>For Candidates</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('jobs') }}>Browse Jobs</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('events') }}>Find Events</a>
            <a href="#">Application Tracker</a>
          </div>
          <div className="footer-col">
            <h4>For Employers</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowPostJobModal(true) }}>Post Jobs</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowPostJobModal(true) }}>Company Profiles</a>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <a href="#">Contact Us</a>
            <a href="#">Privacy Policy</a>
          </div>
          <div className="footer-col footer-newsletter">
            <h4>The Sunday Brief</h4>
            <p>Your week in UAE AI — new roles, hiring trends, and one skill to learn. Free, every Sunday.</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Your email" />
              <button><Send size={14} /></button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Hini – UAE Job Hub. All rights reserved.</p>
          <div className="footer-links-bottom">
            <a href="#">AI Jobs in Dubai</a>
            <a href="#">ML Jobs Dubai</a>
            <a href="#">Data Scientist UAE</a>
            <a href="#">Remote AI Jobs</a>
            <a href="#">AI Jobs Abu Dhabi</a>
          </div>
        </div>
      </footer>

      {/* ===== RECRUITER POST A JOB MODAL ===== */}
      {showPostJobModal && (
        <div className="modal-overlay" onClick={() => setShowPostJobModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Post a Job (Recruiter Portal)</h3>
              <button className="modal-close-btn" onClick={() => setShowPostJobModal(false)}>
                <X size={20} />
              </button>
            </div>

            {postJobSuccess ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <CheckCircle size={48} style={{ color: '#16a34a', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Job Submitted Successfully!</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Your listing is now active on the AIJobsUAE portal. Candidates can apply immediately.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePostJobSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Job Title *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Senior AI Engineer"
                        required
                        value={postJobData.title}
                        onChange={(e) => setPostJobData({ ...postJobData, title: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Company Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Careem / G42"
                        required
                        value={postJobData.company}
                        onChange={(e) => setPostJobData({ ...postJobData, company: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location / Emirate *</label>
                      <select
                        className="form-select"
                        value={postJobData.location}
                        onChange={(e) => setPostJobData({ ...postJobData, location: e.target.value })}
                      >
                        <option value="Dubai">Dubai</option>
                        <option value="Abu Dhabi">Abu Dhabi</option>
                        <option value="Sharjah">Sharjah</option>
                        <option value="Ajman">Ajman</option>
                        <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                        <option value="Remote UAE">Remote UAE</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Application Link or Email *</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://company.com/careers/job123"
                        required
                        value={postJobData.applyUrl}
                        onChange={(e) => setPostJobData({ ...postJobData, applyUrl: e.target.value })}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">Recruiter Contact Email (Optional)</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="recruiter@company.com"
                        value={postJobData.recruiterEmail}
                        onChange={(e) => setPostJobData({ ...postJobData, recruiterEmail: e.target.value })}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">Job Description / Requirements</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Describe key responsibilities, required AI/ML stack, and benefits..."
                        value={postJobData.description}
                        onChange={(e) => setPostJobData({ ...postJobData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setShowPostJobModal(false)}
                    disabled={postingJob}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={postingJob}
                  >
                    {postingJob ? 'Submitting Job...' : 'Publish Job Listing'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default App
