import React, { useState, useEffect } from 'react'
import {
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  MapPin,
  ExternalLink,
  Award,
  FileText,
  Upload,
  Heart,
  MessageCircle,
  Clock,
  Briefcase,
  Share2,
  Check,
  Lightbulb,
  ShieldCheck,
  Code2,
  Database,
  Cloud,
  Wrench,
  Brain,
  Layers,
  UserCheck,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { scoreJob } from '../../matching/scoring.js'
import { parseJD } from '../../lib/jdParser.js'

function sourceLabel(source) {
  if (!source) return 'Job Portal'
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

// Category icons and colors for technology sections
const TECH_META = {
  languages:  { label: 'Languages',   Icon: Code2,    color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
  frameworks: { label: 'Frameworks',  Icon: Layers,   color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  aiMl:       { label: 'AI / ML',     Icon: Brain,    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  cloud:      { label: 'Cloud & DevOps', Icon: Cloud, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  databases:  { label: 'Databases',   Icon: Database, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  tools:      { label: 'Tools',        Icon: Wrench,  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
}

export function JobDetailDrawer({
  isOpen,
  onClose,
  job,
  resumeData,
  savedJobIds = [],
  onToggleSaveJob,
  onFileUpload,
  initialTab = 'description'
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [copied, setCopied] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showRawDesc, setShowRawDesc] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'description')
      setShowRawDesc(false)
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !job) return null

  // ATS score from engine
  const scoreData = resumeData ? scoreJob(resumeData.skills || [], job) : null

  // Structured JD parse (Option A: uses ATS skills for Must-Have)
  const jd = parseJD(job, scoreData)

  // TRUE if any structured section was extracted from the description
  const hasAnyStructuredData = !!(jd.experience || jd.seniority || jd.technologies || (jd.responsibilities && jd.responsibilities.length > 0))

  const isSaved = savedJobIds.includes(job.id)

  const handleShareWhatsApp = () => {
    const text = `Check out this job opportunity in UAE: ${job.title} at ${job.company}\n${job.applyUrl || job.url || ''}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleCopyLink = () => {
    const link = job.applyUrl || job.url || window.location.href
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInnerFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !onFileUpload) return
    setIsUploading(true)
    setUploadError('')
    try {
      await onFileUpload(e)
      setActiveTab('ats')
    } catch (err) {
      setUploadError(err.message || 'Failed to upload resume')
    } finally {
      setIsUploading(false)
    }
  }

  const tierStyles = {
    Strong:  { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', ring: 'border-indigo-600 bg-indigo-50 text-indigo-900' },
    Good:    { bg: 'bg-sky-50',    text: 'text-sky-800',    border: 'border-sky-200',    ring: 'border-sky-500 bg-sky-50 text-sky-900' },
    Stretch: { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200',  ring: 'border-amber-500 bg-amber-50 text-amber-900' },
    Weak:    { bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200',  ring: 'border-slate-400 bg-slate-50 text-slate-800' },
  }
  const currentTier = scoreData ? (tierStyles[scoreData.tier] || tierStyles.Weak) : tierStyles.Weak

  // ── SENIORITY BADGE ─────────────────────────────────────────
  function SeniorityBadge({ level }) {
    if (!level) return null
    const map = {
      'Lead / Principal': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
      'Senior':           { color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
      'Mid-Level':        { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
      'Junior / Entry':   { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    }
    const style = map[level] || { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
        style={{ color: style.color, background: style.bg, borderColor: style.border }}
      >
        <UserCheck size={11} />
        {level}
      </span>
    )
  }

  // ── EXPERIENCE BADGE ─────────────────────────────────────────
  function ExperienceBadge({ years }) {
    if (!years) return null
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-indigo-100 bg-indigo-50/60">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
          <Briefcase size={16} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Experience Required</p>
          <p className="text-sm font-extrabold text-indigo-900">{years}</p>
        </div>
      </div>
    )
  }

  // ── TECHNOLOGIES GRID ────────────────────────────────────────
  function TechGrid({ technologies }) {
    if (!technologies) return null
    const categories = Object.entries(TECH_META).filter(([key]) => technologies[key]?.length > 0)
    if (categories.length === 0) return null

    return (
      <div className="space-y-3">
        {categories.map(([key, meta]) => {
          const { Icon, label, color, bg, border } = meta
          const terms = technologies[key]
          return (
            <div key={key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={13} style={{ color }} />
                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color }}>{label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {terms.map(term => (
                  <span
                    key={term}
                    className="px-2.5 py-0.5 rounded-md text-xs font-bold border"
                    style={{ color, background: bg, borderColor: border }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── RESPONSIBILITIES LIST ────────────────────────────────────
  function ResponsibilitiesList({ items }) {
    if (!items || items.length === 0) return null
    return (
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-slate-700 text-sm">
            <span className="flex shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 items-center justify-center text-[10px] font-black mt-0.5">
              {idx + 1}
            </span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  // ── SKILLS SECTION ───────────────────────────────────────────
  function MustHaveSkillsPills({ matched, missing, hasScore }) {
    if (!hasScore) {
      // No resume uploaded — show "Upload to see skills" prompt
      return (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-xs text-slate-500 font-semibold">
            <Sparkles size={12} className="inline mr-1 text-indigo-500" />
            Upload your resume to see which skills you match for this role
          </p>
        </div>
      )
    }

    const allEmpty = (!matched || matched.length === 0) && (!missing || missing.length === 0)
    if (allEmpty) {
      return (
        <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          Not enough keyword data found in this job description.
        </p>
      )
    }

    return (
      <div className="space-y-2">
        {matched && matched.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {matched.map(skill => (
              <span key={skill} className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-md flex items-center gap-1">
                <CheckCircle2 size={11} className="text-indigo-600" />
                {skill}
              </span>
            ))}
          </div>
        )}
        {missing && missing.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {missing.map(skill => (
              <span key={skill} className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-md">
                {skill}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-400 font-medium">
          ✓ = matched in your resume &nbsp;|&nbsp; uncolored = gaps to address
        </p>
      </div>
    )
  }

  // ── EMPTY DESCRIPTION STATE ──────────────────────────────────
  function EmptyDescState() {
    return (
      <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200/80 my-4">
        <Briefcase className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="font-semibold text-slate-700">Detailed job description not provided by portal.</p>
        <p className="text-xs text-slate-500 mt-1">
          Click "Apply Directly" below to read the full posting on {job.source ? sourceLabel(job.source) : 'the official portal'}.
        </p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-md flex justify-end transition-all duration-300 animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white border-l border-slate-200 text-slate-900 h-full overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col justify-between relative z-10 select-text transition-transform duration-300">
        
        <div>
          {/* ── HEADER BAR ─────────────────────────────────────── */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-xs border border-indigo-100 flex items-center gap-1">
                <Briefcase size={13} /> Job Details & ATS Analysis
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100 flex items-center gap-1 hidden sm:flex">
                <ShieldCheck size={13} /> Verified UAE Listing
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* ── JOB OVERVIEW HERO ──────────────────────────────── */}
          <div className="my-4 p-4.5 bg-gradient-to-br from-slate-50/90 to-indigo-50/30 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                  {job.companyInitial || (job.company ? job.company.charAt(0).toUpperCase() : 'C')}
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-lg leading-snug">{job.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-800"><Building2 size={13} className="text-indigo-600" /> {job.company}</span>
                    <span className="flex items-center gap-1"><MapPin size={13} className="text-indigo-600" /> {job.location}</span>
                    {job.postedDate && (
                      <span className="flex items-center gap-1 text-slate-500"><Clock size={13} /> {job.postedDate}</span>
                    )}
                  </div>
                  {/* Seniority badge inline */}
                  {jd.seniority && (
                    <div className="mt-2">
                      <SeniorityBadge level={jd.seniority} />
                    </div>
                  )}
                </div>
              </div>

              {/* Match Badge (Text Only) */}
              {scoreData && (
                <div
                  onClick={() => setActiveTab('ats')}
                  className="cursor-pointer group flex items-center shrink-0"
                  title="Click to open ATS Match breakdown"
                >
                  <span className={`px-3 py-1.5 rounded-full border text-xs font-extrabold shadow-xs transition group-hover:scale-105 ${currentTier.ring}`}>
                    {scoreData.tier} Match
                  </span>
                </div>
              )}
            </div>

            {/* Quick badges */}
            <div className="flex items-center justify-between gap-2 mt-3.5 pt-3 border-t border-slate-200/60 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {job.source && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {job.source.toUpperCase()}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={10} /> Verified UAE
                </span>
                {job.type && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {job.type}
                  </span>
                )}
                {jd.experience && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                    <Briefcase size={10} /> {jd.experience}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleSaveJob && onToggleSaveJob(job.id)}
                  className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                    isSaved ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={isSaved ? "Saved to Favorites" : "Save Job"}
                >
                  <Heart size={14} fill={isSaved ? '#e11d48' : 'none'} className={isSaved ? 'text-rose-600' : ''} />
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-indigo-100 transition"
                  title="Share on WhatsApp"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 transition"
                  title="Copy link"
                >
                  {copied ? <Check size={14} className="text-indigo-600" /> : <Share2 size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* ── NAVIGATION TABS ─────────────────────────────────── */}
          <div className="flex items-center border-b border-slate-200 mb-4 gap-2">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 transition border-b-2 ${
                activeTab === 'description'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={15} /> Job Description
            </button>
            <button
              onClick={() => setActiveTab('ats')}
              className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 transition border-b-2 relative ${
                activeTab === 'ats'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles size={15} className="text-indigo-600" /> ATS Resume Matcher
              {scoreData && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  {scoreData.tier} Match
                </span>
              )}
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════
              TAB 1 — STRUCTURED JD VIEW
          ══════════════════════════════════════════════════════ */}
          {activeTab === 'description' && (
            <div className="space-y-5 animate-in fade-in duration-150">

              {/* ── NO DESCRIPTION AT ALL ────────────────────────── */}
              {!job.description || job.description.trim() === '' ? (
                <EmptyDescState />
              ) : !hasAnyStructuredData ? (

                /* ── RAW TEXT ONLY — no structured data extracted ─── */
                /* Show description directly. No toggle, no extra clicks. */
                <>
                  {/* Title + Seniority header */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100/80">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-1">Job Title</p>
                        <p className="font-extrabold text-slate-900 text-base leading-snug">{job.title}</p>
                      </div>
                      {jd.seniority && <SeniorityBadge level={jd.seniority} />}
                    </div>
                  </div>

                  {/* Must-Have Skills (ATS) — still show even with no parsed structure */}
                  {jd.hasScore && (
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-indigo-600" />
                        Must-Have Skills
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold ml-1">ATS Powered</span>
                      </h4>
                      <MustHaveSkillsPills matched={jd.mustHaveSkills} missing={jd.missingSkills} hasScore={jd.hasScore} />
                    </div>
                  )}

                  {/* Full raw description — always visible, no toggle needed */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-600" />
                      Full Job Description
                    </h4>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {job.description.replace(/\*\*/g, '').trim()}
                    </div>
                  </div>
                </>
              ) : (

                /* ── STRUCTURED JD VIEW — parsed data found ──────── */
                <>
                  {/* ── SECTION: JOB TITLE + SENIORITY ─────────── */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100/80">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-1">Job Title</p>
                        <p className="font-extrabold text-slate-900 text-base leading-snug">{job.title}</p>
                      </div>
                      {jd.seniority && <SeniorityBadge level={jd.seniority} />}
                    </div>
                  </div>

                  {/* ── SECTION: EXPERIENCE ─────────────────────── */}
                  {jd.experience && (
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Briefcase size={14} className="text-indigo-600" /> Experience
                      </h4>
                      <ExperienceBadge years={jd.experience} />
                    </div>
                  )}

                  {/* ── SECTION: MUST-HAVE SKILLS (ATS-powered) ─── */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-indigo-600" />
                      Must-Have Skills
                      {jd.hasScore && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold ml-1">ATS Powered</span>
                      )}
                    </h4>
                    <MustHaveSkillsPills matched={jd.mustHaveSkills} missing={jd.missingSkills} hasScore={jd.hasScore} />
                  </div>

                  {/* ── SECTION: TECHNOLOGIES ───────────────────── */}
                  {jd.technologies && (
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Code2 size={14} className="text-indigo-600" /> Technologies
                      </h4>
                      <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                        <TechGrid technologies={jd.technologies} />
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: RESPONSIBILITIES ────────────────── */}
                  {jd.responsibilities && jd.responsibilities.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ListChecks size={14} className="text-indigo-600" /> Responsibilities
                      </h4>
                      <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                        <ResponsibilitiesList items={jd.responsibilities} />
                      </div>
                    </div>
                  )}

                  {/* ── TOGGLE: Full Raw Description (optional) ──── */}
                  <div className="border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setShowRawDesc(prev => !prev)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                    >
                      {showRawDesc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showRawDesc ? 'Hide' : 'Show'} Full Raw Description
                    </button>
                    {showRawDesc && (
                      <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap animate-in fade-in duration-150">
                        {job.description.replace(/\*\*/g, '').trim()}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 2 — ATS RESUME MATCHER
          ══════════════════════════════════════════════════════ */}
          {activeTab === 'ats' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {resumeData ? (
                <div>
                  {/* ATS Hero Banner */}
                  <div className="p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-between gap-4 mb-6 shadow-xs">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">ATS Match Analysis</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Based on your resume: <span className="font-bold text-slate-700">{resumeData.fileName}</span>
                      </p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full border ${currentTier.ring} flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs`}>
                      {scoreData?.tier === 'Strong' ? 'Strong Match' : scoreData?.tier === 'Good' ? 'Good Match' : scoreData?.tier === 'Stretch' ? 'Stretch Match' : 'Low Match'}
                    </div>
                  </div>

                  {/* Matched Skills */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-sm font-bold text-slate-900">Matched Requirements</h4>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{scoreData?.matched?.length || 0}</span>
                    </div>
                    {scoreData?.matched && scoreData.matched.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {scoreData.matched.map(skill => (
                          <span key={skill} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No direct technical skill keywords matched yet.</p>
                    )}
                  </div>

                  {/* Missing Skills */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-sm font-bold text-slate-900">Missing Requirements</h4>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{scoreData?.missing?.length || 0}</span>
                    </div>
                    {scoreData?.missing && scoreData.missing.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {scoreData.missing.map(skill => (
                          <span key={skill} className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-xs font-medium rounded-md shadow-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-indigo-700">
                        Perfect Match! Your resume contains all detected technical requirements.
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* No Resume Uploaded */
                <div className="p-6 text-center bg-gradient-to-b from-indigo-50/60 to-white rounded-2xl border border-indigo-100 my-4 shadow-xs">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Upload size={22} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">Test Your Resume Match Score</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Upload your CV (`.pdf`, `.docx`, `.txt`) to instantly calculate your ATS match accuracy score and skill overlap.
                  </p>
                  <div className="mt-4 max-w-sm mx-auto">
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleInnerFileUpload}
                        className="hidden"
                      />
                      <div className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20">
                        {isUploading ? <span>Parsing CV...</span> : <><Upload size={15} /> Upload Resume Now</>}
                      </div>
                    </label>
                  </div>
                  {uploadError && (
                    <p className="text-xs text-rose-600 font-semibold mt-2">⚠️ {uploadError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── APPLY CTA FOOTER ──────────────────────────────────── */}
        <div className="pt-4 border-t border-slate-200 mt-6 pb-2 sticky bottom-0 bg-white">
          <div className="flex items-center gap-3">
            <a
              href={job.applyUrl || job.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/25"
            >
              Apply Directly on {job.source ? job.source.toUpperCase() : 'Portal'} <ExternalLink size={16} />
            </a>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
            Redirects directly to official job portal. Free & zero sign-up required.
          </p>
        </div>
      </div>
    </div>
  )
}
