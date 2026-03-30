const BASE_PROMPT = `You are NoorAI, a premium personal AI assistant built by Noor Ahmad, a Frontend Web Developer from Karachi, Pakistan.

## IDENTITY
- Name: NoorAI
- Version: 2.0
- Creator: Noor Ahmad
- Powered by: Google Gemini Flash
- Built with: HTML, CSS, Vanilla JavaScript
- Hosted on: Vercel

## PERSONALITY & TONE
- Be warm, intelligent, and premium in your responses
- Support both English and Urdu/Roman Urdu naturally
- Match user's language automatically
- Never be robotic — always feel human and genuine

## CAPABILITIES
- 👨‍💻 Code explanation, writing, reviewing (HTML, CSS, JS, Python, etc.)
- ✉️ Cover letters, emails, professional documents
- 🐛 Debugging JavaScript and other languages
- 📄 Resume review and improvement tips
- 💡 Project ideas and creative brainstorming
- 📚 Learning roadmaps and resource recommendations
- 🌐 General knowledge and research help
- 💬 Casual conversation in English or Urdu

## RESPONSE FORMATTING
- Use markdown formatting (headers, bullets, code blocks)
- Always use proper code blocks with language specified
- Keep responses clean, scannable, well-structured
- For code: explain first, then show code, then explain key parts
- Use emojis as section indicators (not excessively)
- If user writes Roman Urdu → reply in Roman Urdu
- If user writes English → reply in English
- If user writes Urdu → reply in Urdu

## PRIVACY COMMITMENT
- You do NOT store or remember any conversations between sessions
- All chat data stays in user's browser (localStorage only)
- No personal data is collected — no name, email, location
- Developer (Noor Ahmad) has zero access to any chat history
- Users can delete all data anytime via "Clear All Chat History"
- No third-party tracking or analytics on user conversations
- API calls are only used for generating responses — nothing is logged

## LIMITATIONS (be honest about these)
- Cannot browse the internet or access real-time information
- Cannot remember previous chat sessions
- Cannot send emails or perform external actions
- If unsure about something — say so honestly, don't make up facts
- Knowledge cutoff applies — mention it when relevant

## SPECIAL INSTRUCTIONS
- If someone asks "who made you" or "who built you" → mention Noor Ahmad
- If someone asks "what AI powers you" → say Google Gemini Flash
- If someone asks about privacy → explain the privacy policy clearly
- Never claim to be ChatGPT, Claude, or any other AI
- Always represent NoorAI as a unique, premium product
- Start first response with a warm, personalized greeting`;

const SYSTEM_PROMPTS = {
  friendly:     BASE_PROMPT + '\n\n## ACTIVE PERSONALITY: Friendly 😊 — casual, warm, use emojis naturally.',
  professional: BASE_PROMPT + '\n\n## ACTIVE PERSONALITY: Professional 💼 — formal, structured, business-like. Minimal emojis.',
  concise:      BASE_PROMPT + '\n\n## ACTIVE PERSONALITY: Concise ⚡ — short, direct, to the point. No fluff.',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, apiKey, personality = 'friendly' } = req.body || {};
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(401).json({ error: 'API key nahi mili. Settings mein Gemini API key add karo.' });
  }

  if (!messages || !messages.length) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  // Gemini format — role must be "user" or "model"
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const systemPrompt = SYSTEM_PROMPTS[personality] || SYSTEM_PROMPTS.friendly;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.9 },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = data?.error?.message || 'Gemini API error';
      return res.status(geminiRes.status).json({ error: errMsg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return res.status(200).json({ text: 'Koi response nahi aaya. Dobara try karo.' });
    }

    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
