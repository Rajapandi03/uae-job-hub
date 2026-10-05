import React from 'react'
import { X, Building2, MapPin, Clock, ExternalLink, Sparkles, CheckCircle2, AlertCircle, Heart } from 'lucide-react'

export function JobDetailsModal({ isOpen, onClose, job, scoreData, resumeData, onToggleSave, isSaved }) {
  if (!isOpen || !job) return null

  const { score, tier, matched = [], missing = [] } = scoreData || {}

  const tierStyles = {
    Strong: { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
    Good: { bg: 'bg-indigo-50/80', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'border-indigo-500 bg-indigo-50 text-indigo-800' },
    Stretch: { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200', ring: 'border-amber-500 bg-amber-50 text-amber-800' },
    Weak: { bg: 'bg-slate-50/80', text: 'text-slate-700', border: 'border-slate-200', ring: 'border-slate-400 bg-slate-50 text-slate-800' },
  }

  const currentTier = tierStyles[tier] || tierStyles.Weak

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 transition-opacity">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-indigo-100 text-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm shrink-0">
              {job.companyInitial || job.company?.[0] || 'J'}
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug">{job.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1 flex-wrap">
                <span className="flex items-center gap-1"><Building2 size={13} className="text-indigo-500" /> {job.company}</span>
                <span className="flex items-center gap-1"><MapPin size={13} className="text-indigo-500" /> {job.location}</span>
                {job.postedDate && (
                  <span className="flex items-center gap-1"><Clock size={13} className="text-slate-400" /> {job.postedDate}</span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* ATS Resume Score Box (If Resume Uploaded) */}
          {resumeData && scoreData && (
            <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-indigo-100/80">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <div>
                    <span className="text-xs font-extrabold text-slate-900">Your ATS Resume Match Analysis</span>
                    <p className="text-[10px] text-slate-500 font-medium">Scored against full job text</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${currentTier.bg} ${currentTier.text} border ${currentTier.border}`}>
                    {tier} Match
                  </span>
                  <div className={`w-10 h-10 rounded-full border-2 ${currentTier.ring} flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                    {score}%
                  </div>
                </div>
              </div>

              {/* Skills Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Matched Skills ({matched.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {matched.map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-medium rounded">
                        ✓ {skill}
                      </span>
                    ))}
                    {matched.length === 0 && <span className="text-slate-400 italic text-[11px]">None detected</span>}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <AlertCircle size={12} className="text-rose-500" /> Missing Skills ({missing.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {missing.map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-rose-50 border border-rose-200/70 text-rose-800 text-[11px] font-medium rounded">
                        + {skill}
                      </span>
                    ))}
                    {missing.length === 0 && (
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 size={12} /> All detected role skills matched!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Job Description Section */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
              Full Job Description
            </h3>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line bg-slate-50/60 p-4 rounded-xl border border-slate-200/70">
              {job.description ? job.description.replace(/\*\*/g, '') : 'No full description provided.'}
            </div>
          </div>

          {/* Tags & Metadata */}
          {job.tags && job.tags.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Key Focus Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-md border border-indigo-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onToggleSave && (
              <button
                onClick={() => onToggleSave(job.id)}
                className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
                  isSaved
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Heart size={16} fill={isSaved ? '#ef4444' : 'none'} />
                {isSaved ? 'Saved' : 'Save Job'}
              </button>
            )}
          </div>

          <a
            href={job.applyUrl || job.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
          >
            Apply Directly on {job.source || 'Portal'} <ExternalLink size={15} />
          </a>
        </div>

      </div>
    </div>
  )
}
