import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import { extractSkills } from '../../matching/skills.js'

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
}

export const LOCAL_STORAGE_KEY = 'hini_resume_v1'

/**
 * Parse uploaded resume file (PDF, DOCX, or TXT).
 * Rejects unparsed binary strings starting with %PDF or texts > 5000 words.
 */
export async function parseResumeFile(file) {
  if (!file) throw new Error('No file provided')

  const fileName = file.name
  const fileExt = fileName.split('.').pop().toLowerCase()
  let rawText = ''

  if (fileExt === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n'
      }
      rawText = fullText
    } catch (err) {
      console.error('PDF Parsing error:', err)
      throw new Error('Failed to parse PDF file. Please ensure it is a valid document.')
    }
  } else if (fileExt === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      rawText = result.value || ''
    } catch (err) {
      console.error('DOCX Parsing error:', err)
      throw new Error('Failed to parse DOCX file. Please ensure it is a valid Word document.')
    }
  } else if (fileExt === 'txt') {
    try {
      rawText = await file.text()
    } catch (err) {
      console.error('TXT Parsing error:', err)
      throw new Error('Failed to read text file.')
    }
  } else {
    throw new Error('Unsupported file format. Please upload a .pdf, .docx, or .txt file.')
  }

  // Clean non-printable characters
  const cleanedText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim()

  // VALIDATION 1: Reject unparsed binary text starting with %PDF
  if (cleanedText.startsWith('%PDF') || cleanedText.substring(0, 100).includes('%PDF-')) {
    throw new Error('File contains unparsed PDF binary stream. Please upload a text-readable PDF.')
  }

  // VALIDATION 2: Reject texts over 5000 words
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length
  if (wordCount > 5000) {
    throw new Error(`Resume text exceeds 5000 words max limit (${wordCount} words detected). Please upload a standard resume.`)
  }

  if (wordCount < 10) {
    throw new Error('Could not extract readable text from document. Please ensure your resume is text-selectable.')
  }

  // Extract skills
  const skills = extractSkills(cleanedText)

  const resumeData = {
    fileName,
    text: cleanedText,
    skills,
    wordCount,
    uploadedAt: new Date().toISOString()
  }

  // Save to localStorage under key: hini_resume_v1
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resumeData))
  } catch (err) {
    console.warn('LocalStorage save failed:', err)
  }

  return resumeData
}

/**
 * Load saved resume from localStorage
 */
export function getSavedResume() {
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!item) return null
    return JSON.parse(item)
  } catch (err) {
    return null
  }
}

/**
 * Save updated resume state to localStorage
 */
export function saveResumeState(resumeData) {
  try {
    if (!resumeData) {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resumeData))
    }
  } catch (err) {
    console.warn('LocalStorage save failed:', err)
  }
}

/**
 * Remove saved resume
 */
export function clearSavedResume() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch (err) {
    console.warn('LocalStorage clear failed:', err)
  }
}
