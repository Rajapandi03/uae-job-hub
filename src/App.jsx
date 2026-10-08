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
  Sparkles,
  Bot,
  FileText,
  Settings,
  Minimize2,
  Upload,
  FileCheck,
  Trash2,
  AlertCircle,
  Check,
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
import { parseResumeFile, getSavedResume, saveResumeState, clearSavedResume } from './components/resume/ResumeParser.js'
import { useJobMatcher } from './matching/useJobMatcher.js'
import { ResumeStrip } from './components/resume/ResumeStrip.jsx'
import { JobDetailDrawer } from './components/jobs/JobDetailDrawer.jsx'
import { parseExperience, parseSeniority, parseTechnologies } from './lib/jdParser.js'

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

// Filter out non-job titles (dictionary definitions, Wikipedia pages, W3Schools tutorials, download pages)
const INVALID_JOB_TITLE_REGEX = /\b(definition|meaning|tutorial|download|downloads|wikipedia|w3schools|geeksforgeeks|dictionary|what is|how it works|documentation|guides|merriam-webster|cheat sheet|course|learn|faq|overview|basics|introduction to|lesson|types and how)\b/i

// 🚫 Non-IT / Civil / Non-Tech job blocklist — reject non-tech roles (Civil, MEP, Mechanical, Structural, Construction, Draftsman, QA/QC, CAD, Wet Utilities, Planning, Estimator, Survey, etc.)
const NON_IT_BLOCKLIST_REGEX = /\b(civil|structural|steel structure|mep|draftsman|draughtsman|drafting|drafter|autocad|cad technician|cad|survey|surveyor|surveying|quantity surveyor|land surveyor|heavy civil|highway|bridge engineer|road engineer|geotechnical|materials engineer|bim|revit|piping engineer|process engineer(?! .*data)|site engineer|site manager|construction|contracting|fabrication|welding|pipefitter|rigger|scaffolding|formwork|rebar|concrete|mason|carpenter|painter|plumber|electrician(?! .*it)|hvac|fire fighting|sprinkler|landscape|horticulture|upholstery|cabin crew|pilot|flight crew|aircraft maintenance|automobile engineer(?! .*software)|automotive engineer(?! .*software)|environmental|planning engineer|wet utilities|utilities design|utilities engineer|coastal engineer|marine surveyor|estimator|cost engineer|technical drawing|rebar detailer|steel detailer|scaffolder|fit out|fitout|driver|delivery rider|mechanic|logistics|procurement|qa\/qc|qa qc|quality inspector|quality control|quality administrator|customer support|customer service|customer care|receptionist|office administrator|secretary|teacher(?! .*coding|.*cs|.*ai)|professor(?! .*cs|.*ai)|doctor|physician|nurse|pharmacist|dentist|physiotherapist|real estate|property manager|facilities manager|building manager|drilling|petroleum|reservoir|geophysicist|well engineer|wellsite|refinery engineer|oil gas(?! .*software|.*tech)|solar engineer(?! .*software)|wind engineer|engineer internship|engineering intern|architectural consultancy|architectural|lighting designer)\b/i

function isValidJob(job) {
  if (!job || !job.title) return false
  const title = String(job.title).toLowerCase().trim()
  const comp = String(job.company || '').toLowerCase().trim()
  const url = String(job.apply_url || job.url || job.applyUrl || '').toLowerCase().trim()
  const source = String(job.source || '').toLowerCase().trim()

  // Strict Source Domain Check: Naukrigulf & GulfTalent links MUST belong to their official domains
  if (source === 'naukrigulf' && url && !url.includes('naukrigulf.com')) return false
  if (source === 'gulftalent' && url && !url.includes('gulftalent.com')) return false

  if (INVALID_JOB_TITLE_REGEX.test(title)) return false
  if (NON_IT_BLOCKLIST_REGEX.test(title)) return false

  if (comp.includes('merriam-webster') || comp.includes('w3schools') || comp.includes('wikipedia') || comp.includes('geeksforgeeks') || comp.includes('mech lesson') || comp.includes('scientific american') || comp.includes('data.gov')) {
    return false
  }

  // Pure standalone keywords or non-job titles without role indicators
  if (['artificial intelligence', 'data', 'generative ai', 'java', 'data.gov home', 'free ai prompt generator', 'java software | oracle'].includes(title)) {
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Map DB job to card-friendly format
// ---------------------------------------------------------------------------
function mapDbJob(job) {
  const comp = (job.company && job.company !== 'None' && job.company !== 'nan') ? String(job.company).trim() : 'Hiring Company'
  const title = (job.title && job.title !== 'None' && job.title !== 'nan') ? String(job.title).trim() : 'AI / Tech Specialist'
  const loc = (job.location && job.location !== 'None' && job.location !== 'nan') ? String(job.location).trim() : 'Dubai, UAE'

  let bestDate = job.posted_at
  if (bestDate) {
    const d = new Date(bestDate)
    if (!isNaN(d.getTime()) && d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && job.first_seen) {
      bestDate = job.first_seen
    }
  }
  const postedRelative = timeAgo(bestDate) || timeAgo(job.first_seen) || 'Just now'

  const isAiRole = /\b(ai engineer|artificial intelligence|machine learning|ml engineer|deep learning|generative ai|genai|llm|agentic|ai agent|multi-agent|applied ai|ai developer|full stack ai|nlp|computer vision|rag engineer|prompt engineer|conversational ai|mlops|llmops|ai platform|ai research|research scientist|applied scientist|data scientist|data engineer|data analyst|analytics engineer|ai|ml)\b/i.test(title)
  const roleTag = isAiRole ? 'AI' : 'Tech'

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
    tag: roleTag,
    tags: [roleTag],
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
  const companiesScrollRef = useRef(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshed, setRefreshed] = useState(false)

  // State for Resume Upload & Matching Engine (key: hini_resume_v1)
  const [resumeData, setResumeData] = useState(() => getSavedResume())
  const [sortOption, setSortOption] = useState(() => (getSavedResume() ? 'best' : 'newest'))
  const [showWeakerMatches, setShowWeakerMatches] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // State for Job Details & ATS Match Drawer
  const [drawerJob, setDrawerJob] = useState(null)
  const [drawerScoreData, setDrawerScoreData] = useState(null)
  const [drawerTab, setDrawerTab] = useState('description')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const openJobDrawer = (job, scoreData = null, tab = 'description') => {
    setDrawerJob(job)
    setDrawerScoreData(scoreData)
    setDrawerTab(tab)
    setIsDrawerOpen(true)
  }

  // State for AI Career Assistant Chatbot
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [groqApiKey, setGroqApiKey] = useState(() => {
    const local = localStorage.getItem('groq_api_key')
    if (local && local.trim().length > 0) return local
    return import.meta.env.VITE_GROQ_API_KEY || ''
  })
  const [showSettings, setShowSettings] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [userResumeText, setUserResumeText] = useState(() => localStorage.getItem('hini_user_resume') || '')
  const [resumeFileName, setResumeFileName] = useState('')
  const fileInputRef = useRef(null)

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: resumeData
        ? `👋 Welcome back! I detected **${resumeData.skills.length} skills** in your resume \`${resumeData.fileName}\`. Click **"Show my best jobs"** below to see your top recommendations!`
        : "👋 Welcome to **Hini Career AI**! Upload your CV/Resume file (`.pdf`, `.docx`, `.txt`) to instantly rank all live UAE jobs by your skill match score!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const chatMessagesEndRef = useRef(null)

  // Real File Upload Handler using pdfjs-dist / mammoth / text
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError('')

    try {
      const parsedData = await parseResumeFile(file)
      setResumeData(parsedData)
      setSortOption('best')

      const successMsg = {
        id: Date.now(),
        sender: 'bot',
        text: `✅ **Resume Uploaded & Parsed Successfully!**\n📄 **File**: \`${parsedData.fileName}\`\n🧠 **Detected Skills (${parsedData.skills.length})**: ${parsedData.skills.map(s => `\`${s}\``).join(', ')}\n\nYour job feed below has been re-ordered by your highest ATS match score!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages(prev => [...prev, successMsg])
    } catch (err) {
      console.error('Upload error:', err)
      const errorMsg = err.message || 'Failed to parse resume file.'
      setUploadError(errorMsg)

      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'bot',
        text: `❌ **Resume Parsing Error**: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Update Skills in Resume Strip
  const handleUpdateSkills = (newSkills) => {
    if (!resumeData) return
    const updatedData = {
      ...resumeData,
      skills: newSkills
    }
    saveResumeState(updatedData)
    setResumeData(updatedData)
  }

  // Clear Resume Handler
  const handleClearResume = () => {
    clearSavedResume()
    setResumeData(null)
    setUserResumeText('')
    localStorage.removeItem('hini_user_resume')
    setSortOption('newest')
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'bot',
      text: "🗑️ **Resume cleared.** Upload a new CV file to calculate ATS match scores.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
  }

  const handleSendChatMessage = async (customPrompt = null) => {
    const promptText = (customPrompt || chatInput).trim()
    const isATSRequest = customPrompt === "Find my top ATS job matches in UAE" || promptText.toLowerCase().includes('ats') || promptText.toLowerCase().includes('match')
    const activeResumeText = (resumeData?.rawText || userResumeText || "").trim()

    // STRICT VALIDATION: If requesting ATS matches but no resume is uploaded/pasted
    if (isATSRequest && !activeResumeText) {
      const noResumeMsg = {
        id: Date.now(),
        sender: 'bot',
        text: `⚠️ **No Resume Detected!**\n\nPlease click **"📁 Upload CV File"** above or paste your CV text into the box first.\n\nOnce your resume is uploaded, I will perform a real ATS skill analysis against all live UAE jobs!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages(prev => [...prev, noResumeMsg])
      if (!customPrompt) setChatInput('')
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return
    }

    if (!promptText && !activeResumeText) return

    const userText = promptText || "Analyze my uploaded CV for live UAE jobs."
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setChatMessages(prev => [...prev, userMsg])
    if (!customPrompt) setChatInput('')
    setIsAiThinking(true)

    const matches = activeResumeText ? findBestJobMatches(activeResumeText, allJobs, 5) : []

    let botReplyText = ""
    if (!groqApiKey.trim()) {
      botReplyText = `⚠️ **AI Brain Offline:** Please click the Settings gear icon (⚙️) above and enter your free Groq API key to chat with me!`
    } else {
      try {
        const topJobsList = matches.map(m => ({ title: m.title, company: m.company, match_score: m.atsScore })).slice(0, 3);
        const hasResume = activeResumeText.length > 0;

        const systemPrompt = `You are Hini AI, an expert UAE Tech Recruiter & Job Search Assistant.
Rules:
1. Talk like a friendly human recruiter. Use professional, conversational language.
2. If the user asks general-knowledge or non-career related questions (e.g. coding help, recipes, history), you MUST politely refuse and guide them back to UAE jobs and their tech career.
3. If they ask for the "Best jobs to apply today" or an "AI Job Search Agent", give them actionable advice based on the provided Job list or ask clarifying career questions.`

        const dynamicUserPrompt = `Context: ${hasResume ? 'Candidate resume provided.' : 'No resume provided yet.'}
Top matching jobs from database: ${JSON.stringify(topJobsList)}
User Query: "${userText}"
Respond directly to the user's query adhering STRICTLY to your rules. Do not just blindly summarize the resume.`

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey.trim()}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: dynamicUserPrompt }
            ],
            temperature: 0.7,
            max_tokens: 400
          })
        })
        if (response.ok) {
          const data = await response.json()
          botReplyText = data.choices?.[0]?.message?.content || ""
        } else {
          botReplyText = `⚠️ **API Error:** Groq returned an error (HTTP ${response.status}). Check if your API key is valid and has credits.`
        }
      } catch (err) {
        console.warn("Groq API error:", err)
        botReplyText = `⚠️ **Network Error:** Could not connect to Groq API. Check your internet connection.`
      }
    }

    if (!botReplyText) {
      if (matches.length > 0) {
        const topScore = matches[0]?.atsScore || 0
        botReplyText = `🎯 **ATS Analysis Complete!** Based on your uploaded CV, I analyzed **${allJobs.length} live UAE opportunities**. Your top match is **${topScore}% compatible**!`
      } else {
        botReplyText = `I am your Hini AI Job Search Agent! Upload your resume and I'll find the best roles for you in the UAE.`
      }
    }

    const botMsg = {
      id: Date.now() + 1,
      sender: 'bot',
      text: botReplyText,
      jobs: matches,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setChatMessages(prev => [...prev, botMsg])
    setIsAiThinking(false)
    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }


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
  const [categoryFilter, setCategoryFilter] = useState('all')
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
      let allData = []
      let page = 0
      const pageSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('active', true)
          .order('posted_at', { ascending: false, nullsFirst: false })
          .order('first_seen', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        allData = allData.concat(data)
        if (data.length < pageSize) break
        page++
      }

      if (allData && allData.length > 0) {
        const validData = allData.filter(isValidJob)
        setLiveJobs(validData.map(mapDbJob))
        setDbConnected(true)
        // Track the newest job's first_seen as "last updated"
        const newest = allData.reduce((a, b) => ((a.first_seen || '') > (b.first_seen || '') ? a : b), allData[0])
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

  // Web Worker Background Job Scoring Hook
  const candidateSkills = useMemo(() => resumeData?.skills || [], [resumeData])
  const { scores: jobScores, loading: isScoring } = useJobMatcher(candidateSkills, allJobs)

  // Compute Tier Counts for active candidate resume
  const tierCounts = useMemo(() => {
    const counts = { Strong: 0, Good: 0, Stretch: 0, Weak: 0 }
    if (!resumeData || !jobScores) return counts

    Object.values(jobScores).forEach(scoreData => {
      if (scoreData && scoreData.tier && counts[scoreData.tier] !== undefined) {
        counts[scoreData.tier]++
      }
    })
    return counts
  }, [resumeData, jobScores])

  // Top 3 Best Job Matches for highlight row
  const topMatches = useMemo(() => {
    if (!resumeData || !jobScores || allJobs.length === 0) return []
    const list = allJobs.map(job => ({
      job,
      scoreData: jobScores[job.id]
    })).filter(item => item.scoreData && item.scoreData.score !== null && item.scoreData.score >= 40)

    list.sort((a, b) => (b.scoreData.score || 0) - (a.scoreData.score || 0))
    return list.slice(0, 3)
  }, [resumeData, jobScores, allJobs])

  // Apply job filters and sorting
  const filteredJobs = useMemo(() => {
    let result = allJobs

    // Strict UAE safety filter (reject non-UAE URLs/locations like India/Pakistan)
    const NON_UAE_URL_REGEX = /\/(pakistan|india|bangladesh|philippines|egypt|jordan|saudi|qatar|oman|kuwait|bahrain)\//i
    const NON_UAE_LOC_REGEX = /\b(pakistan|india|bangladesh|philippines|egypt|jordan|lebanon|saudi|qatar|oman|kuwait|bahrain|hyderabad|bengaluru|mumbai|delhi|karachi|lahore|islamabad|chennai|pune|gurgaon|noida)\b/i

    result = result.filter(j => {
      const u = (j.applyUrl || j.url || '').toLowerCase()
      const loc = (j.location || '').toLowerCase()
      const title = (j.title || '').toLowerCase()
      if (NON_UAE_URL_REGEX.test(u) || NON_UAE_LOC_REGEX.test(loc)) return false
      if (NON_IT_BLOCKLIST_REGEX.test(title)) return false
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

    if (categoryFilter !== 'all') {
      const CATEGORY_PATTERNS = {
        ai: /\b(ai|artificial intelligence|machine learning|deep learning|genai|generative ai|llm|nlp|computer vision|prompt|rag|mlops|data scientist)\b/i,
        software: /\b(software engineer|software developer|full stack|fullstack|frontend|backend|web developer|react|node|python|java|\.net|golang|c\+\+|mobile|ios|android|developer|coder|programmer)\b/i,
        data: /\b(data scientist|data engineer|data analyst|bi developer|business intelligence|data architect|database|data)\b/i,
        cloud: /\b(cloud|devops|site reliability|sre|system administrator|network engineer|infrastructure|aws|azure)\b/i,
        security: /\b(cyber|security|information security|soc analyst|penetration tester|ethical hacker)\b/i,
        qa: /\b(qa|quality assurance|software tester|automation engineer|testing)\b/i,
        leadership: /\b(scrum master|agile|project manager|product manager|tech lead|solutions architect|it manager|cto|head of it)\b/i,
        support: /\b(it support|helpdesk|desktop support|service desk|technical support|system support)\b/i,
      }
      const pattern = CATEGORY_PATTERNS[categoryFilter]
      if (pattern) {
        result = result.filter(j => pattern.test(j.title || ''))
      }
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
        let maxMs = 0
        if (j.posted_at) {
          const pa = new Date(j.posted_at).getTime()
          if (!isNaN(pa)) maxMs = Math.max(maxMs, pa)
        }
        if (j.first_seen) {
          const fs = new Date(j.first_seen).getTime()
          if (!isNaN(fs)) maxMs = Math.max(maxMs, fs)
        }
        if (!maxMs) return true
        return maxMs >= cutoff.getTime()
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

    // Filter weak matches (<40) if resume is active and switch is off
    if (resumeData && !showWeakerMatches) {
      result = result.filter(j => {
        const sData = jobScores[j.id]
        return !sData || sData.score === null || sData.score >= 40
      })
    }

    // Sort jobs based on sortOption
    result = [...result].sort((a, b) => {
      if (sortOption === 'best' && resumeData) {
        const scoreA = jobScores[a.id]?.score || 0
        const scoreB = jobScores[b.id]?.score || 0
        return scoreB - scoreA
      } else if (sortOption === 'salary') {
        const salA = parseFloat(a.price_text || a.salary || 0) || 0
        const salB = parseFloat(b.price_text || b.salary || 0) || 0
        return salB - salA
      } else {
        const dateA = new Date(a.first_seen || a.posted_at || 0).getTime()
        const dateB = new Date(b.first_seen || b.posted_at || 0).getTime()
        return dateB - dateA
      }
    })

    return result
  }, [allJobs, searchTerm, locationFilter, sourceFilter, categoryFilter, timeFilter, levelFilter, resumeData, jobScores, sortOption, showWeakerMatches])

  useEffect(() => {
    setVisibleJobsCount(10)
    setShowAllJobs(false)
  }, [searchTerm, locationFilter, sourceFilter, categoryFilter, timeFilter, levelFilter])

  const availableSources = useMemo(() => {
    const defaultSources = ['linkedin', 'indeed', 'bayt', 'naukrigulf', 'gulftalent']
    const srcs = new Set([...defaultSources, ...allJobs.map(j => j.source).filter(Boolean)])
    return Array.from(srcs)
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
        <div className="nav-brand" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }} onClick={() => navigateTo('jobs')}>
          <img src="/logo.png" alt="Hini UAE Job Hub" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
          <div>
            <span className="nav-wordmark">Hini</span><span className="nav-wordmark-uae"> UAE Job Hub</span>
          </div>
        </div>
        <div className="nav-links">
          <a href="/" className={currentView === 'jobs' ? 'active-link' : ''} onClick={(e) => { e.preventDefault(); navigateTo('jobs') }}>Find Jobs</a>
          <a href="#companies-section" onClick={(e) => { e.preventDefault(); navigateTo('jobs'); setTimeout(() => document.getElementById('companies-section')?.scrollIntoView({ behavior: 'smooth' }), 100) }}>Companies</a>
          <a href="/events" className={currentView === 'events' ? 'active-link' : ''} onClick={(e) => { e.preventDefault(); navigateTo('events') }}>Events</a>
          <a href="/certificates" className={['certificates', 'salary', 'news'].includes(currentView) ? 'active-link' : ''} onClick={(e) => { e.preventDefault(); navigateTo('certificates') }}>Resources</a>
        </div>
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              <p>{loading ? 'Discover' : `${totalJobs}+`} live AI, Data & Tech roles from LinkedIn, Indeed, Bayt, Naukrigulf & GulfTalent — all in one place. Updated every hour, apply in one click.</p>

              <div className="hero-stats">
                <div className="stat">
                  <h3 className="stat-number">{loading ? '...' : `${totalJobs}`}<span className="stat-plus">+</span></h3>
                  <p className="stat-label">Active AI & Tech Jobs</p>
                </div>
                <div className="stat">
                  <h3 className="stat-number">{loading ? '...' : `${totalCompanies}`}<span className="stat-plus">+</span></h3>
                  <p className="stat-label">Companies Hiring</p>
                </div>
                <div className="stat">
                  <h3 className="stat-number">5</h3>
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



          {/* Hidden File Input for Resume Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.txt"
            style={{ display: 'none' }}
          />

          {/* ===== HOMEPAGE RESUME STRIP & UPLOAD CARD ===== */}
          {resumeData ? (
            <ResumeStrip
              resumeData={resumeData}
              onUpdateSkills={handleUpdateSkills}
              onReplaceResume={() => fileInputRef.current?.click()}
              onRemoveResume={handleClearResume}
              tierCounts={tierCounts}
            />
          ) : (
            <section className="homepage-resume-section" style={{ maxWidth: '1200px', margin: '1rem auto', padding: '0 1.25rem' }}>
              <div className="resume-matcher-card">
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3.5px', background: 'linear-gradient(90deg, #4f46e5 0%, #9333ea 50%, #38bdf8 100%)' }} />

                {/* Left Info */}
                <div className="resume-matcher-info">
                  <div className="resume-matcher-star-icon">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div className="resume-matcher-title-wrapper">
                      <h3 className="resume-matcher-title">
                        Instant AI Resume Matcher
                      </h3>
                      <span className="resume-matcher-badge">
                        ATS Scoring Engine
                      </span>
                    </div>
                    <p className="resume-matcher-desc">
                      Upload CV to score & rank all 900+ live UAE AI & Tech roles by your skill match.
                    </p>
                  </div>
                </div>

                {/* Right Compact Upload Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="resume-matcher-upload-box hover:border-indigo-600 transition"
                >
                  <Upload size={18} style={{ color: '#4f46e5', flexShrink: 0 }} />
                  <div className="resume-matcher-upload-text">
                    <span className="resume-matcher-upload-label">
                      {isUploading ? 'Parsing Resume...' : 'Upload CV / Resume'}
                    </span>
                    <span className="resume-matcher-upload-sub">
                      Supports PDF, DOCX, TXT
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <div style={{ width: '100%', marginTop: '0.25rem', background: '#fef2f2', border: '1px solid #fecaca', padding: '0.5rem 0.85rem', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem', textAlign: 'center', fontWeight: '600' }}>
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ===== TOP 3 MATCHES ROW ===== */}
          {resumeData && topMatches.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 my-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Sparkles size={18} />
                </div>
                <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">Top Matches For You</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                  Highest ATS Compatibility
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {topMatches.map(({ job, scoreData }) => {
                  const isStrong = scoreData.tier === 'Strong'
                  const isGood = scoreData.tier === 'Good'

                  return (
                    <div
                      key={job.id}
                      onClick={(e) => {
                        if (e.target.closest('button') || e.target.closest('a')) return
                        openJobDrawer(job, scoreData, 'description')
                      }}
                      className="bg-white rounded-2xl p-5 text-slate-900 border border-indigo-100/80 shadow-md shadow-indigo-950/5 hover:border-indigo-300 transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer"
                    >
                      {/* Top gradient accent */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 opacity-80" />

                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block border ${isStrong ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              isGood ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              {scoreData.tier} Match
                            </span>
                            <h3 className="font-extrabold text-base mt-2.5 text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">{job.title}</h3>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">{job.company} • {job.location}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full border flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${isStrong ? 'border-indigo-600 bg-indigo-50 text-indigo-700' :
                            isGood ? 'border-sky-500 bg-sky-50 text-sky-700' :
                              'border-amber-500 bg-amber-50 text-amber-700'
                            }`}>
                            {scoreData.tier} Match
                          </div>
                        </div>

                        <div className="my-3 pt-3 border-t border-slate-100">
                          <div className="flex flex-wrap gap-1">
                            {scoreData.matched.slice(0, 3).map(skill => (
                              <span key={skill} className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${isStrong ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                isGood ? 'bg-sky-50 border-sky-200 text-sky-700' :
                                  'bg-amber-50 border-amber-200 text-amber-700'
                                }`}>
                                ✓ {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openJobDrawer(job, scoreData, 'ats')
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline font-bold flex items-center gap-1"
                        >
                          Why match?
                        </button>

                        <a
                          href={job.applyUrl || job.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 transition shadow-xs"
                        >
                          Apply <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
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

            {/* Filter & Sort Bar */}
            <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
              <div className="filter-group">
                <Filter size={16} />
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option value="all">All Sources</option>
                  {availableSources.map(s => (
                    <option key={s} value={s}>{sourceLabel(s)}</option>
                  ))}
                </select>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Role Categories</option>
                  <option value="ai">AI & Machine Learning</option>
                  <option value="software">Software & Full-Stack</option>
                  <option value="data">Data Science & Analytics</option>
                  <option value="cloud">Cloud & DevOps</option>
                  <option value="security">Cybersecurity</option>
                  <option value="qa">QA & Software Testing</option>
                  <option value="leadership">IT Leadership & Architecture</option>
                  <option value="support">IT Support & Systems</option>
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
              </div>

              {/* Sort Controls & Weaker Matches Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {resumeData && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showWeakerMatches}
                      onChange={(e) => setShowWeakerMatches(e.target.checked)}
                      style={{ borderRadius: '4px', cursor: 'pointer' }}
                    />
                    Show weaker matches (&lt;40)
                  </label>
                )}

                <div style={{ display: 'flex', background: 'var(--bg-secondary, #f1f5f9)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setSortOption('best')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: sortOption === 'best' ? '#4f46e5' : 'transparent',
                      color: sortOption === 'best' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Best Match
                  </button>
                  <button
                    onClick={() => setSortOption('newest')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: sortOption === 'newest' ? '#4f46e5' : 'transparent',
                      color: sortOption === 'newest' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setSortOption('salary')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: sortOption === 'salary' ? '#4f46e5' : 'transparent',
                      color: sortOption === 'salary' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Salary
                  </button>
                </div>
              </div>
            </div>

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
                {!loading && filteredJobs.slice(0, visibleJobsCount).map((job) => {
                  const scoreData = resumeData ? jobScores[job.id] : null

                  return (
                    <div className="job-card group hover:border-indigo-400 transition-all cursor-pointer" key={job.id}>
                      <div
                        className="job-card-top"
                        style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                        onClick={(e) => {
                          if (e.target.closest('button') || e.target.closest('a')) return
                          openJobDrawer(job, scoreData, 'description')
                        }}
                      >
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div className="company-logo">{job.companyInitial}</div>
                          <div className="job-header">
                            <h3 className="job-title group-hover:text-indigo-600 transition-colors" style={{ cursor: 'pointer' }}>{job.title}</h3>
                            <div className="job-company">{job.company} • {job.industry}</div>
                          </div>
                        </div>

                        {/* Match Score Badge (Text Only - No Percentage) */}
                        {resumeData ? (
                          scoreData && scoreData.score !== null ? (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                openJobDrawer(job, scoreData, 'ats')
                              }}
                              title="Click to view ATS breakdown"
                              style={{
                                cursor: 'pointer',
                                shrink: 0
                              }}
                            >
                              <span style={{
                                padding: '0.35rem 0.7rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                                color: scoreData.tier === 'Strong' ? '#4338ca' :
                                  scoreData.tier === 'Good' ? '#0369a1' :
                                    scoreData.tier === 'Stretch' ? '#b45309' : '#475569',
                                background: scoreData.tier === 'Strong' ? '#eef2ff' :
                                  scoreData.tier === 'Good' ? '#f0f9ff' :
                                    scoreData.tier === 'Stretch' ? '#fffbeb' : '#f8fafc',
                                border: `1.5px solid ${scoreData.tier === 'Strong' ? '#c7d2fe' :
                                  scoreData.tier === 'Good' ? '#bae6fd' :
                                    scoreData.tier === 'Stretch' ? '#fde68a' : '#e2e8f0'
                                  }`,
                                boxShadow: `0 2px 6px ${scoreData.tier === 'Strong' ? 'rgba(99, 102, 241, 0.12)' :
                                  scoreData.tier === 'Good' ? 'rgba(2, 132, 199, 0.12)' :
                                    scoreData.tier === 'Stretch' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.03)'
                                  }`
                              }}>
                                {scoreData.tier === 'Strong' ? 'Strong Match' : scoreData.tier === 'Good' ? 'Good Match' : scoreData.tier === 'Stretch' ? 'Stretch Match' : 'Low Match'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              Not enough data
                            </span>
                          )
                        ) : null}
                      </div>

                      <div
                        className="job-details"
                        onClick={(e) => {
                          if (e.target.closest('button') || e.target.closest('a')) return
                          openJobDrawer(job, scoreData, 'description')
                        }}
                      >
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
                          <p className="job-desc" style={{ cursor: 'pointer' }}>
                            {(() => {
                              const clean = job.description.replace(/\*\*/g, '').replace(/\n+/g, ' ').trim()
                              if (clean.length <= 220) return clean
                              const truncated = clean.substring(0, 220)
                              const lastSpace = truncated.lastIndexOf(' ')
                              return (lastSpace > 150 ? truncated.substring(0, lastSpace) : truncated) + '…'
                            })()}
                          </p>
                        )}

                        {/* ── JD QUICK-INFO STRIP ── */}
                        {(() => {
                          const exp = job.description ? parseExperience(job.description) : null
                          const seniority = parseSeniority(job.title, job.description)

                          // When resume active — show ATS skill pills
                          if (resumeData && scoreData) {
                            return (
                              <div style={{ margin: '0.6rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                {exp && (
                                  <span style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    🗓 {exp}
                                  </span>
                                )}
                                {scoreData.matched && scoreData.matched.slice(0, 4).map(skill => (
                                  <span key={skill} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4338ca', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600' }}>
                                    ✓ {skill}
                                  </span>
                                ))}
                                {scoreData.missing && scoreData.missing.slice(0, 2).map(skill => (
                                  <span key={skill} style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600' }}>
                                    + {skill}
                                  </span>
                                ))}
                              </div>
                            )
                          }

                          // When NO resume — show experience + seniority parsed from JD
                          const hasMeta = exp || seniority
                          if (!hasMeta) return null

                          return (
                            <div style={{ margin: '0.6rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                              {exp && (
                                <span style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.15rem 0.65rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700' }}>
                                  🗓 {exp}
                                </span>
                              )}
                              {seniority && (
                                <span style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.15rem 0.65rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700' }}>
                                  {seniority}
                                </span>
                              )}
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600' }}>Click for full JD →</span>
                            </div>
                          )
                        })()}

                        {job.tags && job.tags.length > 0 && !resumeData && (
                          <div className="job-tags">
                            {job.tags.map((tag, i) => (
                              <span className="tag" key={i}>{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="job-card-footer">
                          <div className="job-social-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              className={`icon-btn ${savedJobIds.includes(job.id) ? 'saved' : ''}`}
                              title={savedJobIds.includes(job.id) ? "Unsave Job" : "Save Job"}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSaveJob(job.id)
                              }}
                              style={{ color: savedJobIds.includes(job.id) ? '#ef4444' : undefined }}
                            >
                              <Heart size={18} fill={savedJobIds.includes(job.id) ? '#ef4444' : 'none'} />
                            </button>
                            <button
                              className="icon-btn whatsapp"
                              title="Share on WhatsApp"
                              onClick={(e) => {
                                e.stopPropagation()
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            {job.source ? applyLabel(job.source) : 'Apply Now'}
                            <ExternalLink size={14} style={{ marginLeft: 4 }} />
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Load More & Navigation controls inside expanded view */}
                {showAllJobs && (
                  <div className="btn-outline-center flex flex-col items-center justify-center gap-3 my-4">
                    {visibleJobsCount < filteredJobs.length && (
                      <button
                        className="btn-outline border-indigo-200 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 font-bold px-6 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2"
                        onClick={() => setVisibleJobsCount(prev => Math.min(prev + 40, filteredJobs.length))}
                      >
                        <PlusCircle size={16} /> Load Next 40 Jobs ({filteredJobs.length - visibleJobsCount} remaining)
                      </button>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        className="btn-outline"
                        onClick={() => {
                          if (jobsScrollRef.current) {
                            jobsScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
                          } else {
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }}
                      >
                        ↑ Scroll to Top
                      </button>
                      <button
                        className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => {
                          setShowAllJobs(false)
                          setVisibleJobsCount(10)
                          document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                      >
                        ✕ Collapse Jobs
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* View All / Load More buttons */}
            {!showAllJobs && filteredJobs.length > visibleJobsCount && (
              <div className="btn-outline-center flex flex-wrap items-center justify-center gap-3 mt-6 mb-4">
                <button
                  className="btn-outline border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/80 font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2"
                  onClick={() => {
                    setVisibleJobsCount(prev => Math.min(prev + 20, filteredJobs.length))
                  }}
                >
                  <PlusCircle size={16} /> Load 20 More Jobs ({filteredJobs.length - visibleJobsCount} remaining)
                </button>
                <button
                  className="btn-outline btn-view-all-jobs"
                  onClick={() => {
                    setShowAllJobs(true)
                    setVisibleJobsCount(Math.min(40, filteredJobs.length))
                    setTimeout(() => {
                      const container = document.querySelector('.jobs-scroll-wrapper')
                      if (container) {
                        const yOffset = -90
                        const y = container.getBoundingClientRect().top + window.pageYOffset + yOffset
                        window.scrollTo({ top: y, behavior: 'smooth' })
                      }
                    }, 10)
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

            {/* Scrollable Companies Container */}
            <div className={`companies-scroll-wrapper ${showAllCompanies ? 'expanded' : ''}`}>
              {showAllCompanies && (
                <div className="jobs-scroll-header">
                  <div className="jobs-scroll-header-info">
                    <Building2 size={18} />
                    <span>Showing all <strong>{topCompanies.length}</strong> hiring companies</span>
                    <span className="jobs-scroll-hint">↕ Scroll inside to browse</span>
                  </div>
                  <button
                    className="btn-collapse-jobs"
                    onClick={() => {
                      setShowAllCompanies(false)
                      document.getElementById('companies-section')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    ✕ Collapse
                  </button>
                </div>
              )}

              <div
                className={showAllCompanies ? 'companies-container-scrollable' : ''}
                ref={companiesScrollRef}
              >
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

                {/* "Back to Top" button inside scrollable area */}
                {showAllCompanies && (
                  <div className="btn-outline-center jobs-scroll-bottom-actions" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                    <button
                      className="btn-outline"
                      onClick={() => {
                        if (companiesScrollRef.current) {
                          companiesScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                    >
                      ↑ Scroll to Top
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => {
                        setShowAllCompanies(false)
                        document.getElementById('companies-section')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      ✕ Collapse Companies
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* View All button (outside container when collapsed) */}
            {!showAllCompanies && (
              <div className="btn-outline-center" style={{ marginTop: '2rem' }}>
                <button
                  className="btn-outline btn-view-all-jobs"
                  onClick={() => {
                    setShowAllCompanies(true)
                    setTimeout(() => {
                      const container = document.querySelector('.companies-scroll-wrapper')
                      if (container) {
                        const yOffset = -90
                        const y = container.getBoundingClientRect().top + window.pageYOffset + yOffset
                        window.scrollTo({ top: y, behavior: 'smooth' })
                      }
                      if (companiesScrollRef.current) {
                        companiesScrollRef.current.scrollTop = 0
                      }
                    }, 50)
                  }}
                >
                  View All {totalCompanies} Companies →
                </button>
              </div>
            )}
          </section>

          {/* ===== COMMUNITY & GROWTH ===== */}
          <section className="section-community">
            <div className="section-title">
              <h2>Community & Growth</h2>
              <p>Connect, learn, and advance your AI & Tech career</p>
            </div>
            <div className="community-grid">
              <div className="events-col" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>Upcoming AI & Tech Events</h3>
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
            <h2>Build your AI & Tech dream team, right here in the UAE</h2>
            <p>Join 65+ companies already hiring through Hini – UAE Job Hub. We connect you with pre-vetted AI & Tech professionals who are ready to make an impact.</p>
            <div className="cta-buttons">
              <button className="btn-cta-primary" onClick={() => setShowPostJobModal(true)}>Post Your First Job</button>
              <button className="btn-cta-outline" onClick={() => setShowPostJobModal(true)}>Recruiter Portal</button>
            </div>
          </section>

          {/* ===== FINAL CTA ===== */}
          <section className="section-final-cta">
            <h2>Ready to advance your AI & Tech career in the UAE?</h2>
            <p>Join thousands of AI & Tech professionals who've found their dream jobs through our platform.</p>
            <div className="final-cta-buttons">
              <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={() => document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })}>Browse AI & Tech Jobs</button>
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
            <div className="nav-brand" style={{ color: '#0f172a', marginBottom: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }} onClick={() => setCurrentView('jobs')}>
              <img src="/logo.png" alt="Hini UAE Job Hub" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              <span className="footer-wordmark">Hini – UAE Job Hub</span>
            </div>
            <p className="footer-brand-desc">
              Connecting AI & Tech talent with opportunities across the United Arab Emirates.
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
            <p>Your week in UAE AI & Tech — new roles, hiring trends, and key skills. Free, every Sunday.</p>
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

      {/* ===== AI CAREER ASSISTANT CHATBOT (HIDDEN FOR LIVE DEPLOYMENT) ===== */}
      {false && (
        <>
          <button
            className="ai-chat-fab"
            onClick={() => setIsChatOpen(!isChatOpen)}
            title="Ask Hini AI Career Assistant"
          >
            <Sparkles size={20} className="ai-sparkle-spin" />
            <span>Ask Hini AI</span>
            <span className="ai-fab-badge">Groq</span>
          </button>

          {isChatOpen && (
            <div className="ai-chat-window">
              {/* Header */}
              <div className="ai-chat-header">
                <div className="ai-chat-title">
                  <Bot size={22} className="ai-bot-icon" />
                  <div>
                    <h4>Hini Career AI</h4>
                    <span className="ai-status-online">● Powered by Groq LLM</span>
                  </div>
                </div>
                <div className="ai-chat-controls">
                  <button
                    className="ai-icon-btn"
                    title="Groq API Key Settings"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings size={18} />
                  </button>
                  <button
                    className="ai-icon-btn"
                    title="Close Chat"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Settings Modal Bar */}
              {showSettings && (
                <div className="ai-chat-settings-bar">
                  <label className="ai-settings-label">Groq API Key (Optional):</label>
                  <div className="ai-settings-input-row">
                    <input
                      type="password"
                      placeholder="gsk_..."
                      value={groqApiKey}
                      onChange={(e) => {
                        setGroqApiKey(e.target.value)
                        localStorage.setItem('groq_api_key', e.target.value)
                      }}
                    />
                    <button
                      className="ai-btn-save-key"
                      onClick={() => setShowSettings(false)}
                    >
                      Save
                    </button>
                  </div>
                  <span className="ai-settings-hint">Using Groq Llama-3.3-70B for instant resume analysis.</span>
                </div>
              )}

              {/* Genuine Resume Upload / Dropzone Banner */}
              <div className="ai-chat-resume-banner">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                />

                <div className="ai-resume-file-zone">
                  {resumeData || userResumeText.trim() ? (
                    <div className="ai-resume-uploaded-badge">
                      <div className="ai-resume-file-info">
                        <FileCheck size={16} className="text-green-500" />
                        <div>
                          <span className="ai-filename">{resumeData ? resumeData.fileName : (resumeFileName || 'Resume CV Text')}</span>
                          <span className="ai-filesize">({resumeData ? resumeData.skills.length + ' skills detected' : userResumeText.split(/\s+/).length + ' words parsed'})</span>
                        </div>
                      </div>
                      <button
                        className="ai-btn-remove-resume"
                        onClick={handleClearResume}
                        title="Remove Resume"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      className="ai-btn-upload-file"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} />
                      <span>Upload Resume File (.pdf, .docx, .txt)</span>
                    </button>
                  )}
                </div>

                {!resumeData && (
                  <textarea
                    className="ai-resume-textarea"
                    placeholder="Or paste your CV / Resume text manually here..."
                    value={userResumeText}
                    onChange={(e) => {
                      setUserResumeText(e.target.value)
                      localStorage.setItem('hini_user_resume', e.target.value)
                    }}
                  />
                )}

              </div>

              {/* Messages Body */}
              <div className="ai-chat-messages">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`ai-msg-row ${msg.sender}`}>
                    {msg.sender === 'bot' && <div className="ai-bot-avatar"><Bot size={16} /></div>}
                    <div className="ai-msg-bubble">
                      <div className="ai-msg-text">{msg.text}</div>

                      {/* Matched Job Cards */}
                      {msg.jobs && msg.jobs.length > 0 && (
                        <div className="ai-matched-jobs-list">
                          {msg.jobs.map(j => (
                            <div key={j.id} className="ai-job-card">
                              <div className="ai-job-card-header">
                                <span className="ai-job-title">{j.title}</span>
                                <span className={`ai-ats-badge ${j.atsScore >= 75 ? 'high' : j.atsScore >= 50 ? 'med' : 'low'}`}>
                                  {j.atsScore}% Genuine Match
                                </span>
                              </div>
                              <div className="ai-job-card-meta">
                                <span>{j.company}</span> • <span>{j.location}</span>
                              </div>

                              {/* Skill Audit Pill Lists */}
                              {j.matchedSkills && j.matchedSkills.length > 0 && (
                                <div className="ai-skills-audit">
                                  <span className="ai-skill-label matched">Matched:</span>
                                  {j.matchedSkills.slice(0, 4).map(s => (
                                    <span key={s} className="ai-skill-pill match">{s}</span>
                                  ))}
                                </div>
                              )}
                              {j.missingSkills && j.missingSkills.length > 0 && (
                                <div className="ai-skills-audit">
                                  <span className="ai-skill-label missing">Missing:</span>
                                  {j.missingSkills.slice(0, 3).map(s => (
                                    <span key={s} className="ai-skill-pill miss">{s}</span>
                                  ))}
                                </div>
                              )}

                              <a
                                href={j.applyUrl || j.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ai-job-apply-link"
                              >
                                Apply Now <ExternalLink size={12} />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                      <span className="ai-msg-time">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div className="ai-msg-row bot">
                    <div className="ai-bot-avatar"><Bot size={16} /></div>
                    <div className="ai-msg-bubble thinking">
                      <Loader2 size={16} className="spin" />
                      <span>Scanning live UAE jobs & calculating ATS score...</span>
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="ai-chat-footer">
                <input
                  type="text"
                  className="ai-chat-input"
                  placeholder="Ask Hini AI about jobs, ATS, skills..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChatMessage()
                  }}
                />
                <button
                  className="ai-chat-send-btn"
                  onClick={() => handleSendChatMessage()}
                  disabled={isAiThinking}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Job Description & ATS Resume Match Side Drawer */}
      <JobDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        job={drawerJob}
        initialTab={drawerTab}
        resumeData={resumeData}
        savedJobIds={savedJobIds}
        onToggleSaveJob={toggleSaveJob}
        onFileUpload={handleFileUpload}
      />

    </div>
  )
}

export default App
