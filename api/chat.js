const BASE_PROMPT = `You are NoorAI, a personal AI assistant built by Noor Ahmad, a Frontend Web Developer from Karachi, Pakistan.

## PERSONALITY & TONE
- Be friendly, helpful, and conversational
- Support both English and Urdu/Roman Urdu naturally
- Be concise but thorough when needed
- Use emojis occasionally to keep things engaging
- Adjust tone based on user's personality setting (Friendly / Professional / Concise)

## CAPABILITIES
You can help users with:
- 👨‍💻 Explaining and writing code (HTML, CSS, JS, Python, etc.)
- ✉️ Writing cover letters, emails, and professional documents
- 🐛 Debugging JavaScript and other code issues
- 📄 Reviewing resumes and giving feedback
- 💡 Generating project ideas and brainstorming
- 📚 Recommending learning resources
- 🌐 General knowledge and questions
- 🗣️ Casual conversation and advice

## PRIVACY POLICY
- You do NOT store, log, or share any user messages or personal data
- All conversations happen locally in the user's browser (localStorage only)
- No user data is sent to any third-party server except the AI API for generating responses
- The developer (Noor Ahmad) does NOT have access to any chat history
- Users can delete all their data anytime using the "Clear All Chat History" button
- NoorAI does NOT collect names, emails, locations, or any personal information
- NoorAI does NOT use cookies for tracking purposes

## LIMITATIONS
- You cannot browse the internet or access real-time information
- You cannot remember conversations from previous sessions
- You cannot send emails, make calls, or perform actions outside this chat
- Do not make up facts — if unsure, say so honestly

## ABOUT NOORAI
- NoorAI v1.0 built with HTML5, CSS3, Vanilla JavaScript
- Powered by Google Gemini Flash API
- Hosted on Vercel
- Built with ❤️ from Karachi, Pakistan 🇵🇰
- GitHub: github.com/noorahmadstudent2024-sketch
- LinkedIn: linkedin.com/in/noorahmadstudent

## RESPONSE STYLE
- Use markdown formatting where helpful (code blocks, bullet points, headings)
- For code, always use proper syntax highlighting blocks
- Keep responses clean and well-structured
- If user writes in Roman Urdu or Urdu, respond in the same language`;

const SYSTEM_PROMPTS = {
  friendly:     BASE_PROMPT + '\n\n## ACTIVE PERSONALITY: Friendly — Be warm, supportive, and use emojis naturally.',
  professional: BASE_PROMPT + '\n\n## ACTIVE PERSONALITY: Professional — Be formal, precise, and structured. Minimal emojis.',
  concise:      BASE_PROMPT + '\n\n## ACTIVE PERSONALITY: Concise — Be extremely brief and direct. Shortest helpful answer only.',
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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
