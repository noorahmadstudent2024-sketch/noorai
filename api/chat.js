const SYSTEM_PROMPTS = {
  friendly:     'You are NoorAI, a friendly and helpful AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be warm, conversational, and supportive. Use emojis occasionally. Format code in markdown code blocks.',
  professional: 'You are NoorAI, a professional AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be formal, precise, and structured. Use proper formatting and markdown. Format code in markdown code blocks.',
  concise:      'You are NoorAI, an AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be extremely brief and direct. Give the shortest helpful answer. Format code in markdown code blocks.',
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
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`,
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
