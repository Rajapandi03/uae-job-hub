// api/chat.js — Vercel Serverless Function
// 🔒 GROQ_API_KEY is stored as a Vercel Environment Variable (server-side only)
// It is NEVER sent to the browser or included in the frontend bundle.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, model, temperature, max_tokens } = req.body

  // Validate input
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' })
  }

  // Try server-side key first, then fall back to user-provided key from request header
  const serverKey = process.env.GROQ_API_KEY
  const userKey = req.headers['x-groq-key'] || ''
  const apiKey = (serverKey && serverKey.trim().length > 0) ? serverKey.trim() : userKey.trim()

  if (!apiKey) {
    return res.status(401).json({
      error: 'No API key available. Please set GROQ_API_KEY in Vercel environment variables.'
    })
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 400
      })
    })

    const data = await groqResponse.json()

    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json({
        error: data?.error?.message || `Groq API error: HTTP ${groqResponse.status}`
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('[api/chat] Groq fetch error:', err)
    return res.status(500).json({ error: 'Network error connecting to Groq API' })
  }
}
