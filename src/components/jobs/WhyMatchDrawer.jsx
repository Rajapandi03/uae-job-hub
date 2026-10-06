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
              <div className="text-xs font-bold text-slate-900">ATS Score Compatibility</div>
              <p className="text-[10px] text-slate-400 font-medium">Weighted Skills, Title & Experience</p>
            </div>
            <div className={`w-10 h-10 rounded-full border-2 ${currentTier.ring} flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
              {score}%
            </div>
          </div>

          {/* Matched Skills */}
          <div className="my-2.5">
            <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle2 size={13} className={isStrong ? 'text-indigo-500' : isGood ? 'text-sky-500' : 'text-amber-500'} />
              Matched Skills ({matched.length})
            </h5>
            {matched.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {matched.map(skill => (
                  <span key={skill} className={`px-2 py-0.5 text-[11px] font-medium rounded border ${isStrong ? 'bg-indigo-50 border-indigo-200/70 text-indigo-800' : isGood ? 'bg-sky-50 border-sky-200/70 text-sky-800' : 'bg-amber-50 border-amber-200/70 text-amber-800'}`}>
                    ✓ {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No direct skill matches</p>
            )}
          </div>

          {/* Missing Skills */}
          <div className="my-2.5">
            <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <AlertCircle size={13} className="text-rose-500" />
              Missing Skills ({missing.length})
            </h5>
            {missing.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {missing.map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-rose-50 border border-rose-200/70 text-rose-800 text-[11px] font-medium rounded">
                    + {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className={`p-1.5 border rounded-md text-[11px] font-semibold flex items-center gap-1.5 ${isStrong ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-800' : isGood ? 'bg-sky-50/70 border-sky-200/80 text-sky-800' : 'bg-amber-50/70 border-amber-200/80 text-amber-800'}`}>
                <CheckCircle2 size={12} className={isStrong ? 'text-indigo-600' : isGood ? 'text-sky-600' : 'text-amber-600'} /> Matched all {matched.length} detected role skills
              </div>
            )}
          </div>

          {/* Score Breakdown Factors */}
          {reasons && reasons.length > 0 && (
            <div className="my-2.5">
              <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Award size={12} className="text-indigo-600" /> Scoring Breakdown Factors
              </h5>
              <ul className="space-y-1">
                {reasons.map((reason, idx) => (
                  <li key={idx} className="text-[11px] text-slate-700 bg-slate-50/80 p-2 rounded-md border border-slate-200/60 flex items-start gap-1.5 font-medium leading-snug">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
