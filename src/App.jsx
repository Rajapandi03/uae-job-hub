import React, { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { jobs as staticJobs, companies, events, resources, browseCategories } from './data/jobs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(dateStr) {
  if (!dateStr) return null
  const posted = new Date(dateStr)
  const now = new Date()
  const diffMs = now - posted
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'Today'
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
  }
  return labels[source] || source
}

function applyLabel(source) {
  return `Apply on ${sourceLabel(source)}`
}

// ---------------------------------------------------------------------------
// Map DB job to card-friendly format
// ---------------------------------------------------------------------------
function mapDbJob(job) {
  return {
    id: job.job_hash,
    title: job.title,
    company: job.company,
    companyInitial: job.company.charAt(0).toUpperCase(),
    industry: sourceLabel(job.source),
    location: job.location,
    type: 'Onsite',
    typeColor: '#16a34a',
    level: '',
    postedDate: job.posted_at
      ? `Posted ${timeAgo(job.posted_at)}`
      : `Found on ${new Date(job.first_seen).toLocaleDateString()}`,
    updatedDate: '',
    description: job.description || '',
    tags: [],
    applyUrl: job.apply_url || job.url,
    source: job.source,
    posted_at: job.posted_at,
    first_seen: job.first_seen,
  }
}

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------
function App() {
  // State for live jobs
  const [liveJobs, setLiveJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbConnected, setDbConnected] = useState(false)
  const [showAllCompanies, setShowAllCompanies] = useState(false)
  const [visibleJobsCount, setVisibleJobsCount] = useState(10)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('All Emirates')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')

  // Fetch jobs from Supabase
  useEffect(() => {
    async function fetchJobs() {
      if (!supabase) {
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('active', true)
          .order('posted_at', { ascending: false, nullsFirst: false })
          .limit(200)

        if (error) throw error
        if (data && data.length > 0) {
          setLiveJobs(data.map(mapDbJob))
          setDbConnected(true)
        }
      } catch (err) {
        console.warn('Supabase fetch failed, using static data:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [])

  // Use live jobs if connected, otherwise static fallback
  const allJobs = dbConnected ? liveJobs : staticJobs

  // Dynamic stats
  const totalJobs = allJobs.length
  const totalCompanies = new Set(allJobs.map(j => j.company)).size

  // Dynamic top companies from live data
  const COMPANY_COLORS = ['#1f2937','#6d28d9','#0ea5e9','#16a34a','#f97316','#7c3aed','#dc2626','#0d9488']
  const topCompanies = useMemo(() => {
    if (!dbConnected) return companies
    const counts = {}
    allJobs.forEach(j => {
      if (j.company) counts[j.company] = (counts[j.company] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const toShow = showAllCompanies ? sorted : sorted.slice(0, 8)
    return toShow
      .map(([name, count], i) => ({
        id: i + 1,
        name,
        initial: name.substring(0, 2).toUpperCase(),
        openRoles: count,
        color: COMPANY_COLORS[i % COMPANY_COLORS.length],
      }))
  }, [allJobs, dbConnected, showAllCompanies])

  // Apply filters
  const filteredJobs = useMemo(() => {
    let result = allJobs

    // Keyword search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q))
      )
    }

    // Location filter
    if (locationFilter !== 'All Emirates') {
      result = result.filter(j =>
        j.location.toLowerCase().includes(locationFilter.toLowerCase())
      )
    }

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(j => j.source === sourceFilter)
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      if (timeFilter === '24h') cutoff.setHours(now.getHours() - 24)
      else if (timeFilter === '7d') cutoff.setDate(now.getDate() - 7)

      result = result.filter(j => {
        const d = j.posted_at ? new Date(j.posted_at) : (j.first_seen ? new Date(j.first_seen) : null)
        return d && d >= cutoff
      })
    }

    // Level filter
    if (levelFilter !== 'all') {
      const seniorKeywords = ['senior', 'sr', 'sr.', 'lead', 'principal', 'manager', 'director', 'head', 'chief', 'vp', 'architect']
      const entryKeywords = ['junior', 'jr', 'jr.', 'entry', 'intern', 'associate', 'graduate', 'fresher', 'trainee']
      
      result = result.filter(j => {
        const title = j.title.toLowerCase()
        // Boundary enforcement: make sure we're matching whole words loosely if possible, but basic includes works fine for now
        const isSenior = seniorKeywords.some(kw => title.includes(kw))
        const isEntry = entryKeywords.some(kw => title.includes(kw))
        
        if (levelFilter === 'senior') return isSenior
        if (levelFilter === 'entry') return isEntry
        if (levelFilter === 'mid') return !isSenior && !isEntry
        return true
      })
    }

    return result
  }, [allJobs, searchTerm, locationFilter, sourceFilter, timeFilter, levelFilter])

  // Reset visible jobs count when filters change
  useEffect(() => {
    setVisibleJobsCount(10)
  }, [searchTerm, locationFilter, sourceFilter, timeFilter, levelFilter])

  // Unique sources for filter dropdown
  const availableSources = useMemo(() => {
    const srcs = new Set(allJobs.map(j => j.source).filter(Boolean))
    return Array.from(srcs).sort()
  }, [allJobs])

  return (
    <div className="app">

      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-brand-icon">AI</span>
          JobsUAE
        </div>
        <div className="nav-links">
          <a href="#">Find Jobs</a>
          <a href="#">Companies</a>
          <a href="#">Events</a>
          <a href="#">Resources</a>
        </div>
        <div className="nav-actions">
          <button className="btn-dashboard">
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <Bell size={20} className="nav-bell" />
          <div className="avatar">RB</div>
          <span className="nav-signout">Sign Out</span>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-content">
          <h1>Your AI career in the <br /><span className="highlight">UAE</span> starts here</h1>
          <p>Explore every AI career opportunity in the UAE—all in one place. Save time, stop the search, and focus on your next step.</p>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search AI jobs by title, skill"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option>All Emirates</option>
              <option>Dubai</option>
              <option>Abu Dhabi</option>
              <option>Sharjah</option>
              <option>Ajman</option>
              <option>Ras Al Khaimah</option>
            </select>
            <button className="btn-primary" onClick={() => {}}>
              <Search size={16} /> Search Jobs
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <h3>{totalJobs}+ Active AI Jobs</h3>
              <p>Live opportunities</p>
            </div>
            <div className="stat">
              <h3>{totalCompanies}+ Companies Hiring</h3>
              <p>Actively recruiting</p>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="/dubai-skyline.png" alt="Dubai Skyline at Night" />
        </div>
      </section>

      {/* ===== LATEST JOBS ===== */}
      <section className="section-jobs" id="jobs-section">
        <div className="section-title">
          <h2>Latest AI Opportunities</h2>
          <p>Discover roles that match your expertise and aspirations</p>
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
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
              </select>
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
              {dbConnected && (
                <span className="filter-live-badge">● Live from DB</span>
              )}
            </div>
          </div>
        )}

        <div className="jobs-container">
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
          {!loading && filteredJobs.slice(0, visibleJobsCount).map((job) => (
            <div className="job-card" key={job.id}>
              <div className="company-logo">{job.companyInitial}</div>
              <div className="job-details">
                <div className="job-header">
                  <div>
                    <h3 className="job-title">{job.title}</h3>
                    <div className="job-company">{job.company} • {job.industry}</div>
                  </div>
                  <div className="job-actions">
                    <button className="icon-btn"><Heart size={20} /></button>
                    <button className="icon-btn whatsapp"><MessageCircle size={20} /></button>
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
                  <p className="job-desc">{job.description.substring(0, 250)}...</p>
                )}
                {job.tags && job.tags.length > 0 && (
                  <div className="job-tags">
                    {job.tags.map((tag, i) => (
                      <span className="tag" key={i}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredJobs.length > visibleJobsCount && (
            <div className="btn-outline-center">
              <button 
                className="btn-outline"
                onClick={() => setVisibleJobsCount(filteredJobs.length)}
              >
                View All {filteredJobs.length} Jobs →
              </button>
            </div>
          )}
          {filteredJobs.length > 0 && filteredJobs.length <= visibleJobsCount && filteredJobs.length > 10 && (
            <div className="btn-outline-center">
              <button 
                className="btn-outline"
                onClick={() => setVisibleJobsCount(10)}
              >
                Show Less ↑
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===== LEADING COMPANIES ===== */}
      <section className="section-companies">
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
              <div className="company-card-icon" style={{ background: c.color }}>
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
            {showAllCompanies ? 'Show Top Companies' : `View All ${totalCompanies} Companies`}
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
          <div className="events-col">
            <h3>Upcoming AI Events</h3>
            {events.map((event) => (
              <div className="event-card" key={event.id}>
                <div className="event-icon"><Calendar size={20} /></div>
                <div>
                  <div className="event-title">{event.title}</div>
                  <div className="event-meta">
                    <span><Calendar size={13} /> {event.date}</span>
                    <span><MapPin size={13} /> {event.location}</span>
                  </div>
                </div>
              </div>
            ))}
            <a href="#" className="show-more-link">
              Show More Events <ArrowRight size={16} />
            </a>
          </div>
          <div className="resources-col">
            <h3>Career Resources</h3>
            {resources.map((res) => (
              <div className="resource-card" key={res.id}>
                <div className="resource-icon">{res.icon}</div>
                <div className="resource-title">{res.title}</div>
                <div className="resource-desc">{res.description}</div>
                <a href="#" className="resource-link">{res.linkText}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIAL ===== */}
      <section className="section-testimonial">
        <div className="testimonial-card">
          <p className="testimonial-text">
            "We filled our Senior ML Engineer role within 2 weeks. The quality of candidates was outstanding."
          </p>
          <div className="testimonial-author">Sarah Al-Mansoori</div>
          <div className="testimonial-role">Head of AI, Dubai FinTech Co.</div>
        </div>
      </section>

      {/* ===== EMPLOYER CTA ===== */}
      <section className="section-employer-cta">
        <h2>Build your AI dream team, right here in the UAE</h2>
        <p>Join 65+ companies already hiring through AIJobsUAE. We connect you with pre-vetted AI professionals who are ready to make an impact.</p>
        <div className="cta-buttons">
          <button className="btn-cta-primary">Post Your First Job</button>
          <button className="btn-cta-outline">Let's Chat</button>
        </div>
      </section>

      {/* ===== BROWSE BY LOCATION & SPECIALTY ===== */}
      <section className="section-browse">
        <div className="section-title">
          <h2>Browse AI Jobs by Location & Specialty</h2>
          <p>Find the right AI role wherever you are in the UAE</p>
        </div>
        <div className="browse-grid">
          {browseCategories.map((cat, i) => (
            <div className="browse-card" key={i}>
              <div className="browse-emoji">{cat.emoji}</div>
              <div className="browse-title">{cat.title}</div>
              <div className="browse-desc">{cat.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="section-final-cta">
        <h2>Ready to advance your AI career in the UAE?</h2>
        <p>Join thousands of AI professionals who've found their dream jobs through our platform.</p>
        <div className="final-cta-buttons">
          <button className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Browse Jobs as Guest</button>
        </div>
        <div className="final-cta-note">Free to join • Apply in seconds • Track your progress</div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="nav-brand" style={{ color: 'white', marginBottom: '0.75rem' }}>
              <span className="nav-brand-icon">AI</span> JobsUAE
            </div>
            <p className="footer-brand-desc">
              Connecting AI talent with opportunities across the United Arab Emirates.
            </p>
          </div>
          <div className="footer-col">
            <h4>For Candidates</h4>
            <a href="#">Browse Jobs</a>
            <a href="#">Find Events</a>
            <a href="#">Application Tracker</a>
          </div>
          <div className="footer-col">
            <h4>For Employers</h4>
            <a href="#">Post Jobs</a>
            <a href="#">Company Profiles</a>
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
          <p>© 2026 AIJobsUAE. All rights reserved. Empowering AI careers across the Emirates.</p>
          <div className="footer-links-bottom">
            <a href="#">AI Jobs in Dubai</a>
            <a href="#">ML Jobs Dubai</a>
            <a href="#">Data Scientist UAE</a>
            <a href="#">Remote AI Jobs</a>
            <a href="#">AI Jobs Abu Dhabi</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
