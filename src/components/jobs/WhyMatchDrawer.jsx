import React from 'react'
import { X, CheckCircle2, AlertCircle, Sparkles, Building2, MapPin, ExternalLink, Award } from 'lucide-react'

export function WhyMatchDrawer({ isOpen, onClose, job, scoreData }) {
  if (!isOpen || !job || !scoreData) return null

  const { score, tier, matched = [], missing = [], reasons = [] } = scoreData

  const tierStyles = {
    Strong: { bg: 'bg-indigo-50/80', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'border-indigo-500 bg-indigo-50 text-indigo-800' },
    Good: { bg: 'bg-sky-50/80', text: 'text-sky-700', border: 'border-sky-200', ring: 'border-sky-500 bg-sky-50 text-sky-800' },
    Stretch: { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200', ring: 'border-amber-500 bg-amber-50 text-amber-800' },
    Weak: { bg: 'bg-slate-50/80', text: 'text-slate-700', border: 'border-slate-200', ring: 'border-slate-400 bg-slate-50 text-slate-800' },
  }

  const currentTier = tierStyles[tier] || tierStyles.Weak
  
  const isStrong = tier === 'Strong'
  const isGood = tier === 'Good'

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-xs sm:max-w-sm bg-white border-l border-indigo-100 text-slate-900 h-full overflow-y-auto p-3.5 sm:p-4 shadow-2xl flex flex-col justify-between relative select-none">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                <Sparkles size={14} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 tracking-tight">Why This Match?</h3>
                <p className="text-[10px] text-slate-400 font-medium leading-none">ATS Algorithm Breakdown</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Job Card Meta */}
          <div className="my-2.5 p-2.5 bg-slate-50/70 rounded-lg border border-slate-200/70 shadow-2xs">
            <h4 className="font-bold text-slate-900 text-xs leading-snug">{job.title}</h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-1 flex-wrap">
              <span className="flex items-center gap-1"><Building2 size={11} className="text-indigo-500" /> {job.company}</span>
              <span className="flex items-center gap-1"><MapPin size={11} className="text-indigo-500" /> {job.location}</span>
            </div>
          </div>

          {/* Score Hero Card */}
          <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between my-2.5 shadow-2xs">
            <div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block mb-0.5 ${currentTier.bg} ${currentTier.text} ${currentTier.border}`}>
                {tier} Match Grade
              </span>
              <div className="text-xs font-bold text-slate-900">ATS Match Analysis</div>
              <p className="text-[10px] text-slate-400 font-medium">Based on required skills</p>
            </div>
            <div className={`px-2.5 py-1 rounded-full border text-xs font-extrabold shrink-0 shadow-2xs ${currentTier.bg} ${currentTier.text} ${currentTier.border}`}>
              {tier} Match
            </div>
          </div>

          {/* Matched Skills */}
          <div className="my-4">
            <h5 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              Matched Requirements
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{matched.length}</span>
            </h5>
            {matched.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {matched.map(skill => (
                  <span key={skill} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border ${isStrong ? 'bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-xs' : isGood ? 'bg-sky-50/80 border-sky-200 text-sky-700 shadow-xs' : 'bg-amber-50/80 border-amber-200 text-amber-700 shadow-xs'}`}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No direct skill matches</p>
            )}
          </div>

          {/* Missing Skills */}
          <div className="my-4">
            <h5 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              Missing Requirements
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{missing.length}</span>
            </h5>
            {missing.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {missing.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[11px] font-medium rounded-md shadow-xs">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className={`text-[11px] font-semibold ${isStrong ? 'text-indigo-700' : isGood ? 'text-sky-700' : 'text-amber-700'}`}>
                Perfect Match! Your resume contains all detected technical requirements.
              </div>
            )}
          </div>
        </div>

        {/* Apply CTA Footer */}
        <div className="pt-2.5 border-t border-slate-100 mt-3 pb-12">
          <a
            href={job.applyUrl || job.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md flex items-center justify-center gap-1.5 transition shadow-2xs"
          >
            Apply Directly on {job.source || 'Portal'} <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  )
}
