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
  ChevronRight,
  Lightbulb,
  ShieldCheck
} from 'lucide-react'
import { scoreJob } from '../../matching/scoring.js'

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

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'description')
    }
  }, [isOpen, initialTab])

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !job) return null

  // Calculate ATS match score dynamically for this job if resume is active
  const scoreData = resumeData ? scoreJob(resumeData.skills || [], job) : null

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

  // Format description text nicely into clean paragraphs
  const formatDescription = (descText) => {
    if (!descText || descText.trim() === '') {
      return (
        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200/80 my-4">
          <Briefcase className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">Detailed job description not provided by portal.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click "Apply Directly" below to read the full posting on the official portal ({job.source ? (job.source) : 'Employer Site'}).
          </p>
        </div>
      )
    }

    // Clean markdown bold markers if any, and split by double newlines or single newlines with list items
    const cleanText = descText.replace(/\*\*/g, '').trim()
    const paragraphs = cleanText.split(/\n\s*\n/)

    return (
      <div className="space-y-4 text-slate-700 text-sm leading-relaxed font-normal">
        {paragraphs.map((paragraph, idx) => {
          const lines = paragraph.split('\n').filter(l => l.trim().length > 0)
          
          if (lines.length > 1 && lines.some(l => l.trim().startsWith('-') || l.trim().startsWith('•') || /^\d+[\.\)]/.test(l.trim()))) {
            return (
              <div key={idx} className="my-3">
                <ul className="space-y-2 pl-2">
                  {lines.map((line, lIdx) => {
                    const cleanLine = line.replace(/^[\-•\*\d+\.\)]\s*/, '').trim()
                    return (
                      <li key={lIdx} className="flex items-start gap-2 text-slate-700 text-sm">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                        <span>{cleanLine}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          }

          return (
            <p key={idx} className="text-slate-700 leading-relaxed text-sm">
              {paragraph}
            </p>
          )
        })}
      </div>
    )
  }

  const tierStyles = {
    Strong: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
    Good: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'border-indigo-500 bg-indigo-50 text-indigo-800' },
    Stretch: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'border-amber-500 bg-amber-50 text-amber-800' },
    Weak: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', ring: 'border-slate-400 bg-slate-50 text-slate-800' },
  }

  const currentTier = scoreData ? (tierStyles[scoreData.tier] || tierStyles.Weak) : tierStyles.Weak

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/50 backdrop-blur-xs flex justify-end transition-opacity animate-in fade-in duration-200">
      {/* Backdrop overlay listener */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white border-l border-slate-200 text-slate-900 h-full overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col justify-between relative z-10 select-text">
        
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-xs border border-indigo-100 flex items-center gap-1">
                <Briefcase size={13} /> Job Details & ATS Analysis
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

          {/* Job Overview Hero Card */}
          <div className="my-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
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
                </div>
              </div>

              {/* Match Ring Badge (if resume is uploaded) */}
              {scoreData && (
                <div
                  onClick={() => setActiveTab('ats')}
                  className="cursor-pointer group flex flex-col items-center shrink-0"
                  title="Click to open ATS Match breakdown"
                >
                  <div className={`w-12 h-12 rounded-full border-2 ${currentTier.ring} flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition`}>
                    {scoreData.score}%
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 mt-1 underline">
                    {scoreData.tier} Match
                  </span>
                </div>
              )}
            </div>

            {/* Quick Badges & Tags */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/60 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {job.source && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Source: {job.source.toUpperCase()}
                  </span>
                )}
                {job.type && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {job.type}
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
                  className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100 transition"
                  title="Share on WhatsApp"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 transition"
                  title="Copy link"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
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
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                  {scoreData.score}%
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: JOB DESCRIPTION */}
          {activeTab === 'description' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <FileText size={16} className="text-indigo-600" /> Full Job Overview & Requirements
                </h3>
              </div>

              {formatDescription(job.description)}

              {/* Required Skills Badges */}
              {scoreData && scoreData.matched && scoreData.matched.length > 0 && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 my-4">
                  <h4 className="text-xs font-bold text-indigo-950 mb-2 flex items-center gap-1">
                    <Sparkles size={13} className="text-indigo-600" /> Key Required Skills Mentioned:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {scoreData.matched.map(s => (
                      <span key={s} className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-md flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" /> {s}
                      </span>
                    ))}
                    {scoreData.missing && scoreData.missing.map(s => (
                      <span key={s} className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATS RESUME MATCHER */}
          {activeTab === 'ats' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {resumeData ? (
                <div>
                  {/* ATS Compatibility Hero Banner */}
                  <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 flex items-center justify-between gap-4 mb-4 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {scoreData?.tier} Match Grade
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">Verified ATS Score</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base mt-1">Resume Compatibility Breakdown</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Matched against your uploaded file: <strong className="text-slate-800">{resumeData.fileName}</strong>
                      </p>
                    </div>
                    <div className={`w-16 h-16 rounded-full border-3 ${currentTier.ring} flex items-center justify-center font-black text-xl shrink-0 shadow-sm`}>
                      {scoreData?.score}%
                    </div>
                  </div>

                  {/* Matched Skills List */}
                  <div className="my-4">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      Matched Skills ({scoreData?.matched?.length || 0})
                    </h4>
                    {scoreData?.matched && scoreData.matched.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {scoreData.matched.map(skill => (
                          <span key={skill} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1">
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-lg">No direct technical skill keywords matched yet.</p>
                    )}
                  </div>

                  {/* Missing Skills List */}
                  <div className="my-4">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertCircle size={15} className="text-rose-500" />
                      Skills to Highlight / Add ({scoreData?.missing?.length || 0})
                    </h4>
                    {scoreData?.missing && scoreData.missing.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {scoreData.missing.map(skill => (
                          <span key={skill} className="px-2.5 py-1 bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-bold rounded-lg flex items-center gap-1">
                            + {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                        Perfect Match! Your resume contains all detected technical requirements for this role.
                      </div>
                    )}
                  </div>

                  {/* Scoring Algorithm Breakdown */}
                  {scoreData?.reasons && scoreData.reasons.length > 0 && (
                    <div className="my-4">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Award size={15} className="text-indigo-600" /> Scoring Weight Breakdown
                      </h4>
                      <div className="space-y-1.5">
                        {scoreData.reasons.map((reason, idx) => (
                          <div key={idx} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 flex items-start gap-2 font-medium">
                            <span className="text-indigo-600 font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tailored Optimization Recommendation */}
                  {scoreData?.missing && scoreData.missing.length > 0 && (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl my-4 flex items-start gap-2.5">
                      <Lightbulb size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-extrabold text-amber-950 text-xs">ATS Optimization Tip</h5>
                        <p className="text-xs text-amber-900 mt-0.5 leading-relaxed font-medium">
                          Including keywords like <strong className="underline">{scoreData.missing.slice(0, 3).join(', ')}</strong> in your resume summary or work projects can help pass recruiter ATS filters for this application.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* No Resume Uploaded Callout */
                <div className="p-6 text-center bg-gradient-to-b from-indigo-50/60 to-white rounded-2xl border border-indigo-100 my-4 shadow-xs">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Upload size={22} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">Test Your Resume Match Score</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Upload your CV (`.pdf`, `.docx`, `.txt`) to instantly calculate your ATS match accuracy score and skill overlap for this position.
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
                        {isUploading ? (
                          <span>Parsing CV...</span>
                        ) : (
                          <>
                            <Upload size={15} /> Upload Resume Now
                          </>
                        )}
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

        {/* Apply CTA Footer */}
        <div className="pt-4 border-t border-slate-200 mt-6 pb-2 sticky bottom-0 bg-white">
          <div className="flex items-center gap-3">
            <a
              href={job.applyUrl || job.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/25"
            >
              Apply Directly on {job.source ? (job.source.toUpperCase()) : 'Portal'} <ExternalLink size={16} />
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
