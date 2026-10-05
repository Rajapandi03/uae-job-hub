import React, { useState } from 'react'
import { FileCheck, Sparkles, Plus, X, Upload, Trash2, Edit3, Check, Award } from 'lucide-react'

export function ResumeStrip({ resumeData, onUpdateSkills, onReplaceResume, onRemoveResume, tierCounts }) {
  const [isEditing, setIsEditing] = useState(false)
  const [newSkillInput, setNewSkillInput] = useState('')

  if (!resumeData) return null

  const handleAddSkill = (e) => {
    e.preventDefault()
    const trimmed = newSkillInput.trim()
    if (!trimmed) return

    if (!resumeData.skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...resumeData.skills, trimmed]
      onUpdateSkills(updated)
    }
    setNewSkillInput('')
  }

  const handleRemoveSkill = (skillToRemove) => {
    const updated = resumeData.skills.filter(s => s !== skillToRemove)
    onUpdateSkills(updated)
  }

  const strongCount = tierCounts?.Strong || 0
  const goodCount = tierCounts?.Good || 0
  const stretchCount = tierCounts?.Stretch || 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 my-4">
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-indigo-100 shadow-sm shadow-indigo-950/5 relative overflow-hidden transition-all">
        {/* Top accent border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400" />

        {/* Main Row: Meta + Compact Tier Stats + Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-slate-100">
          
          {/* File Meta */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 shrink-0">
              <FileCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                  {resumeData.fileName || 'Active Candidate Resume'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {resumeData.skills.length} Skills
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                {resumeData.wordCount ? <span>{resumeData.wordCount} words</span> : null}
                {resumeData.wordCount ? <span>•</span> : null}
                <span className="text-indigo-600 font-semibold flex items-center gap-1">
                  <Sparkles size={12} /> ATS Scoring Active
                </span>
              </p>
            </div>
          </div>

          {/* Compact Inline Tier Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-slate-700">Strong:</span>
              <span className="font-black text-emerald-700">{strongCount}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="font-semibold text-slate-700">Good:</span>
              <span className="font-black text-indigo-700">{goodCount}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-slate-700">Stretch:</span>
              <span className="font-black text-amber-700">{stretchCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                isEditing
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70'
              }`}
            >
              {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
              {isEditing ? 'Done' : 'Edit Skills'}
            </button>

            <button
              onClick={onReplaceResume}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Upload size={14} /> Replace
            </button>

            <button
              onClick={onRemoveResume}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>

        {/* Skills Tag Cloud */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Award size={13} className="text-indigo-600" /> Active Candidate Skills ({resumeData.skills.length}):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {resumeData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-50 text-slate-800 border border-slate-200 transition-all hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
              >
                {skill}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:bg-rose-100 text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                    title={`Remove ${skill}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}

            {isEditing && (
              <form onSubmit={handleAddSkill} className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add skill..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-900 border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
                />
                <button
                  type="submit"
                  className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                  title="Add skill"
                >
                  <Plus size={13} />
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
